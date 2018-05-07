import { Patch } from '../patch';

export type PrimitiveTextOperation = number | string;

export class TextPatch implements Patch<PrimitiveTextOperation> {
  public operations: PrimitiveTextOperation[] = [];
  public baseLength: number = 0;
  public targetLength: number = 0;

  public static fromJSON(operations: PrimitiveTextOperation[]): TextPatch {
    const patch = new TextPatch();
    const l = operations.length;
    for (let i = 0; i < l; i++) {
      const op = operations[i];
      if (TextPatch.isRetain(op)) {
        patch.retain(op as number);
      } else if (TextPatch.isInsert(op)) {
        patch.insert(op as string);
      } else if (TextPatch.isDelete(op)) {
        patch.remove(op);
      } else {
        throw new Error(`Unknown operation: ${JSON.stringify(op)}`);
      }
    }
    return patch;
  }

  public static transform(patchA: TextPatch, patchB: TextPatch): [TextPatch, TextPatch] {
    if (patchA.baseLength !== patchB.baseLength) {
      throw new Error('Both operations have to have the same base length.');
    }

    const operation1prime = new TextPatch();
    const operation2prime = new TextPatch();
    const ops1 = patchA.operations;
    const ops2 = patchB.operations;
    let i1 = 0;
    let i2 = 0;
    let op1: any = ops1[i1++];
    let op2: any = ops2[i2++];

    while (true) {
      if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
        break;
      }

      if (TextPatch.isInsert(op1)) {
        operation1prime.insert(op1);
        operation2prime.retain(op1.length);
        op1 = ops1[i1++];
        continue;
      }
      if (TextPatch.isInsert(op2)) {
        operation1prime.retain(op2.length);
        operation2prime.insert(op2);
        op2 = ops2[i2++];
        continue;
      }

      if (typeof op1 === 'undefined') {
        throw new Error('Cannot compose operations: first patch is too short.');
      }
      if (typeof op2 === 'undefined') {
        throw new Error('Cannot compose operations: first patch is too long.');
      }

      let minl;
      if (TextPatch.isRetain(op1) && TextPatch.isRetain(op2)) {
        if (op1 > op2) {
          minl = op2;
          op1 = op1 - op2;
          op2 = ops2[i2++];
        } else if (op1 === op2) {
          minl = op2;
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          minl = op1;
          op2 = op2 - op1;
          op1 = ops1[i1++];
        }
        operation1prime.retain(minl);
        operation2prime.retain(minl);
      } else if (TextPatch.isDelete(op1) && TextPatch.isDelete(op2)) {
        if (-op1 > -op2) {
          op1 = op1 - op2;
          op2 = ops2[i2++];
        } else if (op1 === op2) {
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          op2 = op2 - op1;
          op1 = ops1[i1++];
        }
      } else if (TextPatch.isDelete(op1) && TextPatch.isRetain(op2)) {
        if (-op1 > op2) {
          minl = op2;
          op1 = op1 + op2;
          op2 = ops2[i2++];
        } else if (-op1 === op2) {
          minl = op2;
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          minl = -op1;
          op2 = op2 + op1;
          op1 = ops1[i1++];
        }
        operation1prime.remove(minl);
      } else if (TextPatch.isRetain(op1) && TextPatch.isDelete(op2)) {
        if (op1 > -op2) {
          minl = -op2;
          op1 = op1 + op2;
          op2 = ops2[i2++];
        } else if (op1 === -op2) {
          minl = op1;
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          minl = op1;
          op2 = op2 + op1;
          op1 = ops1[i1++];
        }
        operation2prime.remove(minl);
      } else {
        throw new Error('The two operations aren\'t compatible.');
      }
    }

    return [operation1prime, operation2prime];
  }

  public static isRetain(operation: any): boolean {
    return typeof operation === 'number' && operation > 0;
  }

  public static isInsert(operation: any): boolean {
    return typeof operation === 'string';
  }

  public static isDelete(operation: any): boolean {
    return typeof operation === 'number' && operation < 0;
  }

  private static getSimpleOperation(patch: TextPatch): string | number | null {
    const ops = patch.operations;
    switch (ops.length) {
      case 1:
        return ops[0];
      case 2:
        return TextPatch.isRetain(ops[0]) ? ops[1] : (TextPatch.isRetain(ops[1]) ? ops[0] : null);
      case 3:
        if (TextPatch.isRetain(ops[0]) && TextPatch.isRetain(ops[2])) {
          return ops[1];
        }
    }
    return null;
  }

  private static getStartIndex(patch: TextPatch): number {
    if (TextPatch.isRetain(patch.operations[0])) {
      return patch.operations[0] as number;
    }
    return 0;
  }

  constructor() { }

  public shouldBeComposedWithInverted(other: TextPatch): boolean {
    if (this.isNoop() || other.isNoop()) {
      return true;
    }

    const startA = TextPatch.getStartIndex(this);
    const startB = TextPatch.getStartIndex(other);
    const simpleA: any = TextPatch.getSimpleOperation(this);
    const simpleB: any = TextPatch.getSimpleOperation(other);

    if (!simpleA || !simpleB) {
      return false;
    }
    if (TextPatch.isInsert(simpleA) && TextPatch.isInsert(simpleB)) {
      return startA + simpleA.length === startB || startA === startB;
    }
    if (TextPatch.isDelete(simpleA) && TextPatch.isDelete(simpleB)) {
      return startB - simpleB === startA;
    }
    return false;
  }

  public retain(n: number): TextPatch {
    if (typeof n !== 'number') {
      throw new Error('`retain` expects an integer.');
    }
    if (n === 0) {
      return this;
    }
    this.baseLength += n;
    this.targetLength += n;
    const primitive = this.operations[this.operations.length - 1];
    if (TextPatch.isRetain(primitive)) {
      this.operations[this.operations.length - 1] = (primitive as number) + n;
    } else {
      this.operations.push(n);
    }
    return this;
  }

  public insert(str: string): TextPatch {
    if (typeof str !== 'string') {
      throw new Error('`insert` expects a string.');
    }
    if (!str) {
      return this;
    }

    this.targetLength += str.length;
    const ops = this.operations;
    if (TextPatch.isInsert(ops[ops.length - 1])) {
      ops[ops.length - 1] += str;
    } else if (TextPatch.isDelete(ops[ops.length - 1])) {
      if (TextPatch.isInsert(ops[ops.length - 2])) {
        ops[ops.length - 2] += str;
      } else {
        ops[ops.length] = ops[ops.length - 1];
        ops[ops.length - 2] = str;
      }
    } else {
      ops.push(str);
    }
    return this;
  }

  public remove(operation: string | number): TextPatch {
    let n = typeof operation === 'string' ? operation.length : operation;
    if (typeof n !== 'number') {
      throw new Error('`remove` expects an integer or a string.');
    }
    if (n === 0) { return this; }
    if (n > 0) {
      n = -n;
    }

    this.baseLength -= n;
    const primitive = this.operations[this.operations.length - 1];
    if (TextPatch.isDelete(primitive)) {
      this.operations[this.operations.length - 1] = (primitive as number) + n;
    } else {
      this.operations.push(n);
    }
    return this;
  }

  public isNoop(): boolean {
    return this.operations.length === 0 || (this.operations.length === 1 && TextPatch.isRetain(this.operations[0]));
  }

  public toJSON(): PrimitiveTextOperation[] {
    return this.operations;
  }

  public invert(str: string): TextPatch {
    let strIndex = 0;
    const inverse = new TextPatch();
    const ops = this.operations;
    const l = ops.length;
    for (let i = 0; i < l; i++) {
      const operation: any = ops[i];
      if (TextPatch.isRetain(operation)) {
        inverse.retain(operation);
        strIndex += operation;
      } else if (TextPatch.isInsert(operation)) {
        inverse.remove(operation.length);
      } else {
        inverse.insert(str.slice(strIndex, strIndex - operation));
        strIndex -= operation;
      }
    }
    return inverse;
  }

  public compose(operationB: TextPatch): TextPatch {
    if (this.targetLength !== operationB.baseLength) {
      throw new Error('The base length of the second patch has to be the target length of the first patch.');
    }

    const patch = new TextPatch();
    const ops1 = this.operations;
    const ops2 = operationB.operations;
    let i1 = 0;
    let i2 = 0;
    let op1: any = ops1[i1++];
    let op2: any = ops2[i2++];

    while (true) {
      if (typeof op1 === 'undefined' && typeof op2 === 'undefined') {
        break;
      }

      if (TextPatch.isDelete(op1)) {
        patch.remove(op1);
        op1 = ops1[i1++];
        continue;
      }
      if (TextPatch.isInsert(op2)) {
        patch.insert(op2);
        op2 = ops2[i2++];
        continue;
      }

      if (typeof op1 === 'undefined') {
        throw new Error('Cannot compose operations: first patch is too short.');
      }
      if (typeof op2 === 'undefined') {
        throw new Error('Cannot compose operations: first patch is too long.');
      }

      if (TextPatch.isRetain(op1) && TextPatch.isRetain(op2)) {
        if (op1 > op2) {
          patch.retain(op2);
          op1 = op1 - op2;
          op2 = ops2[i2++];
        } else if (op1 === op2) {
          patch.retain(op1);
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          patch.retain(op1);
          op2 = op2 - op1;
          op1 = ops1[i1++];
        }
      } else if (TextPatch.isInsert(op1) && TextPatch.isDelete(op2)) {
        if (op1.length > -op2) {
          op1 = op1.slice(-op2);
          op2 = ops2[i2++];
        } else if (op1.length === -op2) {
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          op2 = op2 + op1.length;
          op1 = ops1[i1++];
        }
      } else if (TextPatch.isInsert(op1) && TextPatch.isRetain(op2)) {
        if (op1.length > op2) {
          patch.insert(op1.slice(0, op2));
          op1 = op1.slice(op2);
          op2 = ops2[i2++];
        } else if (op1.length === op2) {
          patch.insert(op1);
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          patch.insert(op1);
          op2 = op2 - op1.length;
          op1 = ops1[i1++];
        }
      } else if (TextPatch.isRetain(op1) && TextPatch.isDelete(op2)) {
        if (op1 > -op2) {
          patch.remove(op2);
          op1 = op1 + op2;
          op2 = ops2[i2++];
        } else if (op1 === -op2) {
          patch.remove(op2);
          op1 = ops1[i1++];
          op2 = ops2[i2++];
        } else {
          patch.remove(op1);
          op2 = op2 + op1;
          op1 = ops1[i1++];
        }
      } else {
        throw new Error(`This shouldn't happen: op1: ${JSON.stringify(op1)}, op2: ${JSON.stringify(op2)}.`);
      }
    }
    return patch;
  }

  public apply(document: string): string | null {
    if (document.length !== this.baseLength) {
      throw new Error('The patch\'s base length must be equal to the string\'s length.');
    }
    let strIndex = 0;
    let j = 0;
    const newStr = [];
    const operations = this.operations;
    const l = operations.length;
    for (let i = 0; i < l; i++) {
      const op: any = operations[i];
      if (TextPatch.isRetain(op)) {
        if (strIndex + op > document.length) {
          throw new Error('Operation can\'t retain more characters than are left in the string.');
        }
        newStr[j++] = document.slice(strIndex, strIndex + op);
        strIndex += op;
      } else if (TextPatch.isInsert(op)) {
        newStr[j++] = op;
      } else {
        strIndex -= op;
      }
    }
    if (strIndex !== document.length) {
      throw new Error('The patch didn\'t operate on the whole string.');
    }
    return newStr.join('');
  }

  public equals(otherOperation: TextPatch): boolean {
    if (this.baseLength !== otherOperation.baseLength) {
      return false;
    }
    if (this.targetLength !== otherOperation.targetLength) {
      return false;
    }
    if (this.operations.length !== otherOperation.operations.length) {
      return false;
    }
    for (let i = 0; i < this.operations.length; i++) {
      if (this.operations[i] !== otherOperation.operations[i]) {
        return false;
      }
    }
    return true;
  }

  public toString(): string {
    const newOperations = this.operations.map((operation) => {
      if (TextPatch.isRetain(operation)) {
        return `retain ${operation}`;
      } else if (TextPatch.isInsert(operation)) {
        return `insert '${operation}'`;
      } else {
        return `remove ${-operation}`;
      }
    });
    return newOperations.join(', ');
  }

  public shouldBeComposedWith(other: TextPatch): boolean {
    if (this.isNoop() || other.isNoop()) {
      return true;
    }

    const startA = TextPatch.getStartIndex(this);
    const startB = TextPatch.getStartIndex(other);
    const simpleA = TextPatch.getSimpleOperation(this);
    const simpleB = TextPatch.getSimpleOperation(other);

    if (!simpleA || !simpleB) {
      return false;
    }
    if (TextPatch.isInsert(simpleA) && TextPatch.isInsert(simpleB)) {
      return startA + (simpleA as string).length === startB;
    }
    if (TextPatch.isDelete(simpleA) && TextPatch.isDelete(simpleB)) {
      return (startB - (simpleB as number) === startA) || startA === startB;
    }
    return false;
  }
}
