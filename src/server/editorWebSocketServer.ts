import * as WebSocket from 'ws';
import { ClientInfo } from '../client/editorClient';
import { ExtendedPatch } from '../operations/extendedOperation';
import { TextSelection } from '../operations/selection/textSelection';
import { Server } from './server';
import { PrimitiveTextOperation, TextPatch } from '../operations/text/textPatch';
import * as events from 'events';

export type MayWrite = (socket: WebSocket, cb: ((bool: boolean) => void)) => void;

export class EditorWebSocketServer extends Server {
  private clients: Map<string, ClientInfo>;
  private docId: string;
  private mayWrite: MayWrite;
  private wss: WebSocket.Server;

  private static sendMessage(socket: WebSocket, type: string, message: any): void {
    socket.send(JSON.stringify({
      message,
      type,
    }));
  }

  constructor(wss: WebSocket.Server, document: string, operations: ExtendedPatch[], docId: string, mayWrite: MayWrite) {
    super(document, operations);
    this.wss = wss;
    this.clients = new Map<string, ClientInfo>();
    this.docId = docId;
    this.mayWrite = mayWrite || ((_: any, cb: ((bool: boolean) => void)) => { cb(true); });
  }

  public addClient(socket: WebSocket): void {
    EditorWebSocketServer.sendMessage(socket, 'doc', {
      clients: Array.from(this.clients),
      revision: this.operations.length,
      str: this.document,
    });

    socket.on('message', (message: string) => {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'patch':
          this.mayWrite(socket, (mayWrite: boolean) => {
            if (!mayWrite) {
              console.log('User doesn\'t have the right to edit the document.');
              return;
            }
            this.onOperation(socket, data.message.revision, data.message.patch, data.message.selection);
          });
          break;

        case 'selection':
          this.mayWrite(socket, (mayWrite: boolean) => {
            if (!mayWrite) {
              console.log('User doesn\'t have the right to edit the document.');
              return;
            }
            this.updateSelection(socket, data.message.selection && TextSelection.fromJSON(data.message.selection));
          });
          break;

        case 'disconnect':
          console.log('Disconnected');
          socket.close();
          this.onDisconnect(socket);
          break;

        case 'login':
          console.log(`A user has logged into edit ${this.docId}.`);
          break;

        default:
          throw new Error(`Unexpected message type: '${data.type}'`);
      }
    });
  }

  private onOperation(socket: WebSocket, revision: number, operation: PrimitiveTextOperation[], selection: TextSelection): void {
    let wrapped: ExtendedPatch;
    try {
      wrapped = new ExtendedPatch(
        TextPatch.fromJSON(operation),
        selection && TextSelection.fromJSON(selection),
      );
    } catch (exc) {
      console.error(`Invalid operation received: ${exc}`);
      return;
    }

    try {
      const clientId = this.getClientId(socket);
      const wrappedPrime = this.receiveOperation(revision, wrapped);
      this.getClient(clientId).selection = selection;

      EditorWebSocketServer.sendMessage(socket, 'ack', {});
      this.wss.clients.forEach((client: events.EventEmitter) => {
        if (client !== socket) {
          EditorWebSocketServer.sendMessage(client as WebSocket, 'patch', {
            clientId,
            operation: wrappedPrime.wrapped.toJSON(),
            selection: wrappedPrime.meta,
          });
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  private updateSelection(socket: WebSocket, selection: TextSelection): void {
    const clientId = this.getClientId(socket);
    if (selection) {
      this.getClient(clientId).selection = selection;
    } else {
      delete this.getClient(clientId).selection;
    }
    this.wss.clients.forEach((client: events.EventEmitter) => {
      if (client !== socket) {
        EditorWebSocketServer.sendMessage(client as WebSocket, 'selection', {
          clientId,
          selection,
        });
      }
    });
  }

  /* private setName(socket: WebSocket, name: string): void {
    const clientId = this.getClientId(socket);
    if (!this.clients.has(clientId)) {
      const newClient: ClientInfo = {
        name,
      };
      this.clients.set(clientId, newClient);
    }
    this.clients.get(clientId)!.name = name;

    this.wss.clients.forEach((client: events.EventEmitter) => {
      if (client !== socket) {
        EditorWebSocketServer.sendMessage(client as WebSocket, 'set_name', {
          clientId,
          name,
        });
      }
    });
  } */

  private getClient(clientId: string): ClientInfo {
    if (this.clients.has(clientId)) {
      return this.clients.get(clientId)!;
    }
    throw new Error(`The client with ${clientId} does not exist.`);
  }

  private onDisconnect(socket: WebSocket): void {
    const clientId = this.getClientId(socket);
    this.clients.delete(clientId);
    this.wss.clients.forEach((client: events.EventEmitter) => {
      if (client !== socket) {
        EditorWebSocketServer.sendMessage(client as WebSocket, 'client_left', { clientId });
      }
    });
  }

  private getClientId(socket: WebSocket): string {
    return (socket as any).upgradeReq.headers['sec-websocket-key'];
  }
}
