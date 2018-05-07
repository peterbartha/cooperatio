import { WebSocketAdapter } from '../adapters/webSocketAdapter';
import { ExtendedPatch } from '../operations/extendedOperation';
import { HistoryManager } from '../operations/history/historyManager';
import { ClientSelectionMetaInfo } from '../operations/selection/clientSelectionMetaInfo';
import { TextSelection } from '../operations/selection/textSelection';
import { AwaitingWithBufferClient } from './awaitingWithBufferClient';
import { Client } from './client';
import { RemoteClient } from './remoteClient';
import { PrimitiveTextOperation, TextPatch } from '../operations/text/textPatch';
import { JsonOperation } from '../operations/json/jsonOperation';
import { Utils } from '../utils/utils';
import { EditorAdapter } from './editorAdapter';
import { JsonPatch } from '../operations/json/jsonPatch';

export interface ClientInfo {
  name: string;
  selection?: TextSelection;
}
export type ClientArray = Array<[string, ClientInfo]>;

export interface EditorAdapterCallbackHandler {
  blur(): void;
  change(patch: TextPatch | JsonPatch, inversePatch: TextPatch | JsonPatch): void;
  selectionChange(): void;
}

export interface ServerAdapterCallbackHandler {
  ack(): void;
  client_left(clientId: string): void;
  clients(clients: ClientArray): void;
  operation(operation: PrimitiveTextOperation[]): void;
  json_operation(operation: JsonOperation[]): void;
  reconnect(): void;
  selection(clientId: string, selection: TextSelection): void;
  set_name(clientId: string, name: string): void;
}

export class EditorClient extends Client {
  private serverAdapter: WebSocketAdapter;
  private editorAdapter: EditorAdapter;
  private historyManager: HistoryManager;
  private clients: Map<string, RemoteClient> = new Map<string, RemoteClient>();
  private clientListEl: HTMLElement | undefined;
  private selection: TextSelection | undefined;

  public static removeElement(element: HTMLElement): void {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  constructor(revision: number, clients: ClientArray, serverAdapter: WebSocketAdapter, editorAdapter: EditorAdapter) {
    super(revision);
    this.serverAdapter = serverAdapter;
    this.editorAdapter = editorAdapter;
    this.historyManager = new HistoryManager();

    this.initializeClientList();
    this.initializeClients(clients);

    this.registerEditorCallbacks();
    this.registerServerCallbacks();
  }

  public sendOperation(revision: number, patch: TextPatch | JsonPatch): void {
    if (patch instanceof JsonPatch) {
      this.serverAdapter.sendJsonOperation(revision, patch.toJSON());
    } else {
      this.serverAdapter.sendOperation(revision, patch.toJSON(), this.selection);
    }
  }

  public applyOperation(patch: TextPatch | JsonPatch): void {
    this.editorAdapter.applyOperation(patch);
    if (patch instanceof TextPatch) {
      this.updateSelection();
      this.historyManager.transform(new ExtendedPatch(patch, undefined));
    }
  }

  private initializeClientList(): void {
    this.clientListEl = document.createElement('ul');
  }

  private initializeClients(clients: ClientArray): void {
    this.clients = new Map<string, RemoteClient>();
    for (const [clientId, client] of clients) {
      this.addClient(clientId, client);
    }
  }

  private registerEditorCallbacks(): void {
    this.editorAdapter.registerCallbacks({
      blur: () => {
        this.onBlur();
      },
      change: (patch: TextPatch | JsonPatch, inversePatch: TextPatch | JsonPatch) => {
        this.onChange(patch, inversePatch);
      },
      selectionChange: () => {
        this.onSelectionChange();
      },
    });

    this.editorAdapter.registerUndo(() => {
      this.undo();
    });

    this.editorAdapter.registerRedo(() => {
      this.redo();
    });
  }

  private registerServerCallbacks(): void {
    this.serverAdapter.registerCallbacks({
      ack: () => {
        this.serverAck();
      },
      client_left: (clientId: string) => {
        this.onClientLeft(clientId);
      },
      clients: (clientList: ClientArray) => {
        for (const clientId in this.clients.keys()) {
          if (this.clients.hasOwnProperty(clientId) && !clientList.hasOwnProperty(clientId)) {
            this.onClientLeft(clientId);
          }
        }

        for (const [clientId, client] of clientList) {
          if (clientList.hasOwnProperty(clientId)) {
            const clientObject = this.getClientObject(clientId);

            if (client.name) {
              clientObject.setName(client.name);
            }

            const selection = client.selection;
            if (selection) {
              this.clients.get(clientId)!.updateSelection(
                this.transformSelection(TextSelection.fromJSON(selection)),
              );
            } else {
              this.clients.get(clientId)!.removeSelection();
            }
          }
        }
      },
      operation: (operation: PrimitiveTextOperation[]) => {
        this.applyServer(TextPatch.fromJSON(operation));
      },
      json_operation: (operation: JsonOperation[]) => {
        this.applyServer(JsonPatch.fromJSON(operation));
      },
      reconnect: () => {
        this.reconnectToTheServer();
      },
      selection: (clientId: string, selection: TextSelection) => {
        if (selection) {
          this.getClientObject(clientId).updateSelection(
            this.transformSelection(TextSelection.fromJSON(selection)),
          );
        } else {
          this.getClientObject(clientId).removeSelection();
        }
      },
      set_name: (clientId: string, name: string) => {
        this.getClientObject(clientId).setName(name);
      },
    });
  }

  private addClient(clientId: string, clientObj: ClientInfo): void {
    this.clients.set(clientId, new RemoteClient(
      clientId,
      this.clientListEl!,
      this.editorAdapter,
      clientObj.name || clientId,
      clientObj.selection ? TextSelection.fromJSON(clientObj.selection) : undefined,
    ));
  }

  private getClientObject(clientId: string): RemoteClient {
    if (this.clients.has(clientId)) {
      return this.clients.get(clientId) as RemoteClient;
    }

    const newClient = new RemoteClient(clientId, this.clientListEl!, this.editorAdapter);
    this.clients.set(clientId, newClient);
    return newClient;
  }

  private onClientLeft(clientId: string): void {
    if (!this.clients.has(clientId)) {
      return;
    }
    const client = this.clients.get(clientId);
    client!.remove();
    this.clients.delete(clientId);
  }

  private applyUnredo(extendedPatch: ExtendedPatch): void {
    this.historyManager.add(extendedPatch.invert(this.editorAdapter.getValue()));
    this.editorAdapter.applyOperation(extendedPatch.wrapped);
    this.selection = (extendedPatch.meta instanceof ClientSelectionMetaInfo &&
      (extendedPatch.meta as ClientSelectionMetaInfo).selectionAfter) ?
      (extendedPatch.meta as ClientSelectionMetaInfo).selectionAfter : undefined;
    this.editorAdapter.setSelection(this.selection);
    this.applyClient(extendedPatch.wrapped);
  }

  private undo(): void {
    if (!this.historyManager.canUndo()) {
      return;
    }
    this.historyManager.performUndo((extendedPatch) => this.applyUnredo(extendedPatch));
  }

  private redo(): void {
    if (!this.historyManager.canRedo()) {
      return;
    }
    this.historyManager.performRedo((extendedPatch) => this.applyUnredo(extendedPatch));
  }

  private onChange(patch: TextPatch | JsonPatch, inverseOperation: TextPatch | JsonPatch): void {
    if (patch instanceof TextPatch && inverseOperation instanceof TextPatch) {
      const selectionBefore = this.selection;
      this.updateSelection();

      const compose = this.historyManager.undoStack.length > 0 &&
        inverseOperation.shouldBeComposedWithInverted(Utils.last(this.historyManager.undoStack).wrapped as TextPatch);
      const inverseMeta = new ClientSelectionMetaInfo(this.selection, selectionBefore);
      this.historyManager.add(new ExtendedPatch(inverseOperation, inverseMeta), compose);
    }
    this.applyClient(patch);
  }

  private updateSelection(): void {
    this.selection = this.editorAdapter.getSelection();
  }

  private onSelectionChange(): void {
    const oldSelection = this.selection;
    this.updateSelection();
    if ((oldSelection === undefined && this.selection === undefined) ||
      (oldSelection && this.selection!.equals(oldSelection))) {
      return;
    }
    this.sendSelection(this.selection);
  }

  private onBlur(): void {
    this.selection = undefined;
    this.sendSelection(this.selection);
  }

  private sendSelection(selection: TextSelection | undefined): void {
    if (this.stateMethod instanceof AwaitingWithBufferClient) {
      return;
    }
    this.serverAdapter.sendSelection(selection);
  }
}
