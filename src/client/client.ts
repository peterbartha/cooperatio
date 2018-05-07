import { TextSelection } from '../operations/selection/textSelection';
import { ClientState } from './clientState';
import { SynchronizedClient } from './synchronizedClient';
import { TextPatch } from '../operations/text/textPatch';
import { JsonPatch } from '../operations/json/jsonPatch';

export class Client {
  public revision: number;
  protected stateMethod: ClientState;

  constructor(revision: number) {
    this.revision = revision;
    this.stateMethod = new SynchronizedClient(this);
  }

  public applyOperation(_operation: TextPatch | JsonPatch): void | never {
    throw new Error('`applyOperation` must be defined in child class');
  }

  public sendOperation(_revision: number, _operation: TextPatch | JsonPatch): void | never {
    throw new Error('`sendOperation must` be defined in child class');
  }

  public reconnectToTheServer(): void {
    if (typeof this.stateMethod.resend === 'function') {
      this.stateMethod.resend();
    }
  }

  public setClientState(state: ClientState): void {
    this.stateMethod = state;
  }

  public applyClient(patch: TextPatch | JsonPatch): void {
    this.setClientState(this.stateMethod.applyClient(patch));
  }

  public applyServer(patch: TextPatch | JsonPatch): void {
    this.revision++;
    this.setClientState(this.stateMethod.applyServer(patch));
  }

  public serverAck(): void {
    this.revision++;
    this.setClientState(this.stateMethod.serverAck());
  }

  public transformSelection(selection: TextSelection): TextSelection {
    return this.stateMethod.transformSelection(selection as TextSelection);
  }

  public resend(): never {
    throw new Error('Cannot call resend on `Client` factory.');
  }
}
