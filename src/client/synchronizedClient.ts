import { TextSelection } from '../operations/selection/textSelection';
import { AwaitingConfirmationClient } from './awaitingConfirmationClient';
import { Client } from './client';
import { ClientState } from './clientState';
import { JsonPatch } from '../operations/json/jsonPatch';
import { TextPatch } from '../operations/text/textPatch';

export class SynchronizedClient implements ClientState {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  public applyClient(patch: TextPatch | JsonPatch): ClientState {
    this.client.sendOperation(this.client.revision, patch);
    return new AwaitingConfirmationClient(this.client, patch);
  }

  public applyServer(patch: TextPatch | JsonPatch): ClientState {
    this.client.applyOperation(patch);
    return this;
  }

  public serverAck(): never {
    throw new Error('There is no pending patch.');
  }

  public transformSelection(selection: TextSelection): TextSelection {
    return selection;
  }

  public resend(): never {
    throw new Error('Cannot call resend in `Synchronized` state.');
  }
}
