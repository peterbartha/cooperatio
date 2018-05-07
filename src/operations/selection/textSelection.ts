import { SelectionRange } from './selectionRange';
import { TextPatch } from '../text/textPatch';
import { Composable, Transformable } from '../../utils/common';

export class TextSelection implements Transformable<TextSelection>, Composable<TextSelection> {
  public ranges: SelectionRange[];

  public static fromJSON(obj: TextSelection): TextSelection {
    const ranges: SelectionRange[] = [];
    for (const range of obj.ranges) {
      ranges.push(SelectionRange.fromJSON(range));
    }
    return new TextSelection(ranges);
  }

  public static createCursor(position: number): TextSelection {
    return new TextSelection([new SelectionRange(position, position)]);
  }

  constructor(ranges: SelectionRange[] = []) {
    this.ranges = ranges;
  }

  public transform(other: TextPatch): TextSelection {
    const newRanges: SelectionRange[] = [];
    for (const range of this.ranges) {
      newRanges.push(range.transform(other));
    }
    return new TextSelection(newRanges);
  }

  public equals(other: TextSelection): boolean {
    if (this.ranges.length !== other.ranges.length) {
      return false;
    }

    for (let i = 0; i < this.ranges.length; i++) {
      if (!this.ranges[i].equals(other.ranges[i])) {
        return false;
      }
    }
    return true;
  }

  public compose(other: TextSelection): TextSelection {
    return other;
  }

  public somethingSelected(): boolean {
    for (const range of this.ranges) {
      if (!range.isEmpty()) {
        return true;
      }
    }
    return false;
  }
}
