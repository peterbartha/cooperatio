import { TextSelection } from '../operations/selection/textSelection';
import { TextPatch } from '../operations/text/textPatch';
import { JsonPatch } from '../operations/json/jsonPatch';

export interface ClientState {
  applyClient(patch: TextPatch | JsonPatch): ClientState;

  applyServer(patch: TextPatch | JsonPatch): ClientState;

  serverAck(): ClientState;

  transformSelection(selection: TextSelection): TextSelection;

  resend(): void;
}
