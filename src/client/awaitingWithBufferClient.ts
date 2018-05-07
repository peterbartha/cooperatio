import { TextSelection } from '../operations/selection/textSelection';
import { AwaitingConfirmationClient } from './awaitingConfirmationClient';
import { Client } from './client';
import { ClientState } from './clientState';
import { TextPatch } from '../operations/text/textPatch';
import { JsonPatch } from '../operations/json/jsonPatch';

export class AwaitingWithBufferClient implements ClientState {
  private client: Client;
  private outstanding: TextPatch | JsonPatch;
  private buffer: TextPatch | JsonPatch;

  constructor(client: Client, outstanding: TextPatch | JsonPatch, buffer: TextPatch | JsonPatch) {
    this.client = client;
    this.outstanding = outstanding;
    this.buffer = buffer;
  }

  public applyClient(patch: TextPatch | JsonPatch): ClientState {
    if (this.buffer instanceof TextPatch) {
      const newBuffer = this.buffer.compose(patch as TextPatch);
      return new AwaitingWithBufferClient(this.client, this.outstanding, newBuffer);
    } else {
      const newBuffer = this.buffer.compose(patch as JsonPatch);
      return new AwaitingWithBufferClient(this.client, this.outstanding, newBuffer);
    }
  }

  public applyServer(patch: TextPatch | JsonPatch): ClientState {
    let pair1: TextPatch[] | JsonPatch[] = [];
    let pair2: TextPatch[] | JsonPatch[] = [];
    if (this.outstanding instanceof TextPatch && patch instanceof TextPatch && this.buffer instanceof TextPatch) {
      pair1 = TextPatch.transform(this.outstanding, patch);
      pair2 = TextPatch.transform(this.buffer, pair1[1]);
    } else if (this.outstanding instanceof JsonPatch && patch instanceof JsonPatch && this.buffer instanceof JsonPatch) {
      pair1 = JsonPatch.transform(this.outstanding, patch);
      pair2 = JsonPatch.transform(this.buffer, pair1[1]);
    }
    this.client.applyOperation(pair2[1]);
    return new AwaitingWithBufferClient(this.client, pair1[0]!, pair2[0]!);
  }

  public serverAck(): ClientState {
    this.client.sendOperation(this.client.revision, this.buffer);
    return new AwaitingConfirmationClient(this.client, this.buffer);
  }

  public transformSelection(selection: TextSelection): TextSelection {
    return selection.transform(this.outstanding as TextPatch).transform(this.buffer as TextPatch);
  }

  public resend(): void {
    this.client.sendOperation(this.client.revision, this.outstanding);
  }
}
