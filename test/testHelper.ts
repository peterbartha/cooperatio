import { expect } from 'chai';
import 'mocha';
import { TextPatch } from '../src/operations/text/textPatch';
import { Insert } from '../src/operations/text/types/insert';
import { Remove } from '../src/operations/text/types/remove';
import { Noop } from '../src/operations/text/types/noop';
import { TextOperation } from '../src/operations/text/textOperation';
import { JsonPatch } from '../src/operations/json/jsonPatch';
import { JsonOperation } from '../src/operations/json/jsonOperation';
import { Utils } from '../src/utils/utils';

export namespace TestHelper {

  export function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }

  export function randomIntBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  export function randomText(length: number): string {
    let text = '';
    for (let i = 0; i < length; i++) {
      if (Math.random() < 0.15) {
        text += '\n';
      } else {
        const char = randomInt(26) + 97;
        text += String.fromCharCode(char);
      }
    }
    return text;
  }

  export function randomTextPatch(doc: string): TextPatch {
    const operation = new TextPatch();
    let left;

    while (true) {
      left = doc.length - operation.baseLength;
      if (left === 0) { break; }

      const r = Math.random();
      const l = randomInt(Math.min(left - 1, 20)) + 1;
      if (r < 0.2) {
        operation.insert(randomText(l));
      } else if (r < 0.4) {
        operation.remove(l);
      } else {
        operation.retain(l);
      }
    }

    if (Math.random() < 0.3) {
      operation.insert(randomText(10) + 1);
    }
    return operation;
  }

  export function randomInsertOperation(doc: string): Insert {
    return new Insert(
      randomText(randomInt(10) + 1),
      randomInt(doc.length + 1),
    );
  }

  export function randomInsert(operationLength: number, position: number): Insert {
    return new Insert(
      randomText(operationLength),
      position,
    );
  }

  export function randomRemoveOperation(doc: string): Remove {
    const position = randomInt(doc.length);
    const count = randomInt(Math.min(10, doc.length - position)) + 1;
    return new Remove(count, position);
  }

  export function randomOperation(doc: string): TextOperation {
    if (Math.random() < 0.5) {
      return randomInsertOperation(doc);
    }
    if (doc.length === 0 || Math.random() < 0.2) {
      return Noop.getInstance();
    }
    return randomRemoveOperation(doc);
  }

  export function logObj(name, value): void {
    console.log(`${name}: ${JSON.stringify(value)}`)
  }


  export function diamondCheck(snapshot: any, opA: JsonOperation[], opB: JsonOperation[], result: any, log = false): void {
    const [primeA, primeB] = JsonPatch.transform(new JsonPatch(opA), new JsonPatch(opB));
    if (log) {
      TestHelper.logObj('opA', opA);
      TestHelper.logObj('1st apply on A', new JsonPatch(opA).apply(Utils.deepClone(snapshot)));
      TestHelper.logObj('primeB', primeB);
    }
    const updatedA = primeB.apply(new JsonPatch(opA).apply(Utils.deepClone(snapshot)));
    if (log) {
      TestHelper.logObj('A', updatedA);
      console.log();
      TestHelper.logObj('opB', opB);
      TestHelper.logObj('1st apply on B', new JsonPatch(opB).apply(Utils.deepClone(snapshot)));
      TestHelper.logObj('primeA', primeA);
    }
    const updatedB = primeA.apply(new JsonPatch(opB).apply(Utils.deepClone(snapshot)));
    if (log) {
      TestHelper.logObj('B', updatedB);
      console.log();
      TestHelper.logObj('snapshot', snapshot);
      TestHelper.logObj('expected result', result);
      TestHelper.logObj('-----> A result', updatedA);
      TestHelper.logObj('-----> B result', updatedB);
    }

    expect(updatedA).to.deep.equal(updatedB);
    expect(result).to.deep.equal(updatedA);
  }

  export function transform(opsA: JsonOperation[], opsB: JsonOperation[], [pairA, pairB]): void {
    expect(JsonPatch.transform(new JsonPatch(opsA), new JsonPatch(opsB))).to.deep.equal([new JsonPatch(pairA), new JsonPatch(pairB)]);
  }
}
