import { TextSelection } from '../operations/selection/textSelection';
import { AwaitingWithBufferClient } from './awaitingWithBufferClient';
import { Client } from './client';
import { ClientState } from './clientState';
import { SynchronizedClient } from './synchronizedClient';
import { TextPatch } from '../operations/text/textPatch';
import { JsonPatch } from '../operations/json/jsonPatch';
import { JsonPatchError } from '../utils/common';

export class AwaitingConfirmationClient implements ClientState {
  private client: Client;
  private outstanding: TextPatch | JsonPatch;

  constructor(client: Client, outstanding: TextPatch | JsonPatch) {
    this.client = client;
    this.outstanding = outstanding;
  }

  public applyClient(patch: TextPatch | JsonPatch): ClientState {
    return new AwaitingWithBufferClient(this.client, this.outstanding, patch);
  }

  public applyServer(patch: TextPatch | JsonPatch): ClientState {
    let pair: TextPatch[] | JsonPatch[] = [];
    if (patch instanceof TextPatch && this.outstanding instanceof TextPatch) {
      pair = TextPatch.transform(this.outstanding, patch);
    } else if (patch instanceof JsonPatch && this.outstanding instanceof JsonPatch) {
      pair = JsonPatch.transform(this.outstanding, patch);
    }
    this.client.applyOperation(pair[1]);
    return new AwaitingConfirmationClient(this.client, pair[0]);
  }

  public serverAck(): ClientState {
    return new SynchronizedClient(this.client);
  }

  public transformSelection(selection: TextSelection): TextSelection {
    if (this.outstanding instanceof TextPatch) {
      return selection.transform(this.outstanding);
    }
    throw new JsonPatchError('CANNOT_DEFINE_SELECTION_ON_COMPLEX_OBJECTS', 'Selection transformation does not implemented yet.');
  }

  public resend(): void {
    this.client.sendOperation(this.client.revision, this.outstanding);
  }
}
