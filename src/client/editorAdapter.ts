import { EditorAdapterCallbackHandler } from './editorClient';
import { TextSelection } from '../operations/selection/textSelection';
import { JsonPatch } from '../operations/json/jsonPatch';
import { TextPatch } from '../operations/text/textPatch';

export interface EditorAdapter {
  registerCallbacks(cb: EditorAdapterCallbackHandler): void;
  registerUndo(undoFn: () => void): void;
  registerRedo(redoFn: () => void): void;
  applyOperation(patch: TextPatch | JsonPatch): void;
  getSelection(): TextSelection;
  setSelection(selection?: TextSelection): void;
  setOtherSelection(selection: TextSelection, color: string, clientId: string): { clear(): void };
  getValue(): any;
}
