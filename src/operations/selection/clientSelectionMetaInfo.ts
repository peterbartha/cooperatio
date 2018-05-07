import { TextSelection } from './textSelection';
import { TextPatch } from '../text/textPatch';
import { Composable, Invertible, Transformable } from '../../utils/common';

export class ClientSelectionMetaInfo implements
  Transformable<ClientSelectionMetaInfo>, Composable<ClientSelectionMetaInfo>, Invertible<ClientSelectionMetaInfo> {
  public selectionBefore: TextSelection | undefined;
  public selectionAfter: TextSelection | undefined;

  constructor(selectionBefore: TextSelection | undefined, selectionAfter: TextSelection | undefined) {
    this.selectionBefore = selectionBefore;
    this.selectionAfter  = selectionAfter;
  }

  public invert(): ClientSelectionMetaInfo {
    return new ClientSelectionMetaInfo(this.selectionAfter, this.selectionBefore);
  }

  public compose(other: ClientSelectionMetaInfo): ClientSelectionMetaInfo {
    return new ClientSelectionMetaInfo(this.selectionBefore, other.selectionAfter);
  }

  public transform(patch: TextPatch): ClientSelectionMetaInfo {
    return new ClientSelectionMetaInfo(
      this.selectionBefore!.transform(patch),
      this.selectionAfter!.transform(patch),
    );
  }
}
