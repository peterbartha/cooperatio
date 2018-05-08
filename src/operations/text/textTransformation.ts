import { TextPatch } from './textPatch';
import { Insert } from './types/insert';
import { Noop } from './types/noop';
import { Remove } from './types/remove';
import { TextOperation } from './textOperation';

export namespace TextTransformation {

  export function transformOperations(a: TextOperation, b: TextOperation): [TextOperation, TextOperation] {
    if (a instanceof Noop || b instanceof Noop) {
      return [a, b];
    }

    if (a instanceof Insert && b instanceof Insert) {
      if (a.position < b.position || (a.position === b.position && a.str < b.str)) {
        return [a, new Insert(b.str, b.position + a.str.length)];
      }
      if (a.position > b.position || (a.position === b.position && a.str > b.str)) {
        return [new Insert(a.str, a.position + b.str.length), b];
      }
      return [Noop.getInstance(), Noop.getInstance()];
    }

    if (a instanceof Insert && b instanceof Remove) {
      if (a.position <= b.position) {
        return [a, new Remove(b.count, b.position + a.str.length)];
      }
      if (a.position >= b.position + b.count) {
        return [new Insert(a.str, a.position - b.count), b];
      }
      return [Noop.getInstance(), new Remove(b.count + a.str.length, b.position)];
    }

    if (a instanceof Remove && b instanceof Insert) {
      if (a.position >= b.position) {
        return [new Remove(a.count, a.position + b.str.length), b];
      }
      if (a.position + a.count <= b.position) {
        return [a, new Insert(b.str, b.position - a.count)];
      }
      return [new Remove(a.count + b.str.length, a.position), Noop.getInstance()];
    }

    if (a instanceof Remove && b instanceof Remove) {
      if (a.position === b.position) {
        if (a.count === b.count) {
          return [Noop.getInstance(), Noop.getInstance()];
        } else if (a.count < b.count) {
          return [Noop.getInstance(), new Remove(b.count - a.count, b.position)];
        }
        return [new Remove(a.count - b.count, a.position), Noop.getInstance()];
      } else if (a.position < b.position) {
        if (a.position + a.count <= b.position) {
          return [a, new Remove(b.count, b.position - a.count)];
        }
        if (a.position + a.count >= b.position + b.count) {
          return [new Remove(a.count - b.count, a.position), Noop.getInstance()];
        }
        return [
          new Remove(b.position - a.position, a.position),
          new Remove(b.position + b.count - (a.position + a.count), a.position),
        ];
      } else {
        if (a.position >= b.position + b.count) {
          return [new Remove(a.count, a.position - b.count), b];
        }
        if (a.position + a.count <= b.position + b.count) {
          return [Noop.getInstance(), new Remove(b.count - a.count, b.position)];
        }
        return [
          new Remove(a.position + a.count - (b.position + b.count), b.position),
          new Remove(a.position - b.position, b.position),
        ];
      }
    }
    throw new Error('Operation type does not supported.');
  }

  export function fromTextOperation(patch: TextPatch): TextOperation[] {
    const simpleOperations: TextOperation[] = [];
    let index = 0;
    for (const op of patch.operations) {
      if (TextPatch.isRetain(op)) {
        index += op as number;
      } else if (TextPatch.isInsert(op)) {
        const stringOp = op as string;
        simpleOperations.push(new Insert(stringOp, index));
        index += stringOp.length;
      } else {
        simpleOperations.push(new Remove(Math.abs(op as number), index));
      }
    }
    return simpleOperations;
  }

}
