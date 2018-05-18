import { ServerAdapterCallbackHandler } from '../client/editorClient';
import { TextSelection } from '../operations/selection/textSelection';
import { PrimitiveTextOperation } from '../operations/text/textPatch';
import { JsonOperation } from '../operations/json/jsonOperation';

export enum WebSocketMessageType {
  SetName = 'set_name',
  Ack = 'ack',
  Operation = 'patch',
  JsonOperation = 'json_operation',
  Selection = 'selection',
  Reconnect = 'reconnect',
  ClientLeft = 'client_left',
}

export interface WebSocketSelectionMessage {
  selection: TextSelection | undefined | null;
}

export interface WebSocketOperationMessage extends WebSocketSelectionMessage {
  operation: PrimitiveTextOperation[];
  revision: number;
}

export interface WebSocketJsonOperationMessage {
  operation: JsonOperation[];
  revision: number;
}

export class WebSocketAdapter {
  private webSocket: WebSocket;
  private callbacks: ServerAdapterCallbackHandler | undefined;

  constructor(webSocket: WebSocket) {
    this.webSocket = webSocket;
  }

  public registerCallbacks(cb: ServerAdapterCallbackHandler): void {
    this.callbacks = cb;
  }

  public registerOnMessage(): void {
    this.webSocket.onmessage = (event: MessageEvent) => {
      if (!event.data || !this.callbacks) {
        return;
      }
      const data = JSON.parse(event.data);
      const message = data.message;
      if (data) {
        switch (data.type) {
          case WebSocketMessageType.ClientLeft:
            this.callbacks.client_left(message.clientId);
            break;

          case WebSocketMessageType.SetName:
            this.callbacks.set_name(message.clientId, message.name);
            break;

          case WebSocketMessageType.Ack:
            this.callbacks.ack();
            break;

          case WebSocketMessageType.Operation:
            this.callbacks.operation(message.operation);
            this.callbacks.selection(message.clientId, message.selection);
            break;

          case WebSocketMessageType.JsonOperation:
            this.callbacks.json_operation(message.operation);
            break;

          case WebSocketMessageType.Selection:
            this.callbacks.selection(message.clientId, message.selection);
            break;

          case WebSocketMessageType.Reconnect:
            this.callbacks.reconnect();
            break;

          default: throw new Error(`Message type '${data.type}' does not supported.`);
        }
      }
    };
  }

  public sendOperation(revision: number, operation: PrimitiveTextOperation[], selection?: TextSelection): void {
    const message: WebSocketOperationMessage = {
      operation,
      revision,
      selection,
    };
    this.sendMessage(WebSocketMessageType.Operation, message);
  }

  public sendJsonOperation(revision: number, operation: JsonOperation[]): void {
    const message: WebSocketJsonOperationMessage = {
      operation,
      revision,
    };
    this.sendMessage(WebSocketMessageType.JsonOperation, message);
  }

  public sendSelection(selection?: TextSelection): void {
    const message: WebSocketSelectionMessage = {
      selection: selection ? selection : null,
    };
    this.sendMessage(WebSocketMessageType.Selection, message);
  }

  public sendMessage(type: WebSocketMessageType, message: WebSocketSelectionMessage | WebSocketOperationMessage | WebSocketJsonOperationMessage): void {
    this.webSocket.send(JSON.stringify({
      message,
      type,
    }));
  }
}
