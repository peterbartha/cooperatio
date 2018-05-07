import { TextPatch } from '../text/textPatch';

export class SelectionRange {
  public anchor: number;
  public head: number;

  public static fromJSON(obj: any): SelectionRange {
    return new SelectionRange(obj.anchor, obj.head);
  }

  constructor(anchor: number, head: number) {
    this.anchor = anchor;
    this.head = head;
  }

  public transform(other: TextPatch): SelectionRange {
    function transformIndex(index: number): number {
      let newIndex = index;
      const ops: any = other.operations;
      const l = other.operations.length;
      for (let i = 0; i < l; i++) {
        if (TextPatch.isRetain(ops[i])) {
          index -= ops[i];
        } else if (TextPatch.isInsert(ops[i])) {
          newIndex += ops[i].length;
        } else {
          newIndex -= Math.min(index, -ops[i]);
          index += ops[i];
        }
        if (index < 0) {
          break;
        }
      }
      return newIndex;
    }

    const newAnchor = transformIndex(this.anchor);
    if (this.anchor === this.head) {
      return new SelectionRange(newAnchor, newAnchor);
    }
    return new SelectionRange(newAnchor, transformIndex(this.head));
  }

  public equals(other: SelectionRange): boolean {
    return this.anchor === other.anchor && this.head === other.head;
  }

  public isEmpty(): boolean {
    return this.anchor === this.head;
  }
}
