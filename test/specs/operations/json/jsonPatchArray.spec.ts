import { expect } from 'chai';
import 'mocha';
import { Utils } from '../../../../src/utils/utils';
import deepClone = Utils.deepClone;
import { JsonPatch } from '../../../../src/operations/json/jsonPatch';
import {
  AddOperation, CopyOperation, MoveOperation, RemoveOperation,
  ReplaceOperation
} from '../../../../src/operations/json/jsonOperation';
import { TestHelper } from '../../../testHelper';


function diamondCheck(snapshot, opA, opB, result, log = false) {
  const [primeA, primeB] = JsonPatch.transform(new JsonPatch(opA), new JsonPatch(opB));
  if (log) {
    TestHelper.logObj('opA', opA);
    TestHelper.logObj('1st apply on A', new JsonPatch(opA).apply(deepClone(snapshot)));
    TestHelper.logObj('primeB', primeB);
  }
  const updatedA = primeB.apply(new JsonPatch(opA).apply(deepClone(snapshot)));
  if (log) {
    TestHelper.logObj('A', updatedA);
    console.log();
    TestHelper.logObj('opB', opB);
    TestHelper.logObj('1st apply on B', new JsonPatch(opB).apply(deepClone(snapshot)));
    TestHelper.logObj('primeA', primeA);
  }
  const updatedB = primeA.apply(new JsonPatch(opB).apply(deepClone(snapshot)));
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

function transform(opsA, opsB, [pairA, pairB]) {
  expect(JsonPatch.transform(new JsonPatch(opsA), new JsonPatch(opsB))).to.deep.equal([new JsonPatch(pairA), new JsonPatch(pairB)]);
}

describe('JSON Array operation', () => {

  describe('Arrays', () => {
    describe('remove vs. remove', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];

        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        const opB: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], 4 ] ], opA, opB, [ [ 4 ] ]);
      });

      it('opA is child', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        transform(opA, opB, [[], opB]);
        diamondCheck([ [ [ 2, 3 ], 4 ] ], opA, opB, [ [ 4 ] ]);
      });

      it('keep both operation', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: RemoveOperation[] = [{op: 'remove', path: '/1/0'}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ 1, 4 ], [ 2, 3 ] ], opA, opB, [ [ 4 ], [ 3 ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ 1, 4 ], [ 2, 3 ] ], opB, opA, [ [ 4 ], [ 3 ] ]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'remove', path: '/2'}];
        transform(opA, opB, [opA, [{op: 'remove', path: '/1'}]]);
        diamondCheck([ [ 1, 4 ], [ 2, 3 ], [ 5, 6 ] ], opA, opB, [[ 2, 3 ]]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'remove', path: '/2/1'}];
        transform(opA, opB, [opA, [{op: 'remove', path: '/1/1'}]]);
        diamondCheck([ [ 1, 4 ], [ 2, 3 ], [ 5, 6 ] ], opA, opB, [[ 2, 3 ], [ 5 ]]);
      });
    });

    describe('remove vs. add', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/0', value: 4 }];
        transform(opA, opB, [[{op: 'remove', path: '/0/0/1'}], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 4, 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'remove', path: '/0/0/1'}]]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 4, 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/0', value: 4}];
        transform(opA, opB, [[{op: 'replace', path: '/0/0', value: [4]}], [{op: 'add', path: '/0/0', value: [4]}]]);
        diamondCheck([ [ [ 2 ], 9 ] ], opA, opB, [ [ [ 4 ], 9 ] ]);

        transform(opB, opA, [[{op: 'add', path: '/0/0', value: [4]}], [{op: 'replace', path: '/0/0', value: [4]}]]);
        diamondCheck([ [ [ 2 ], 9 ] ], opB, opA, [ [ [ 4 ], 9 ] ]);
      });

      it('opA is child', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0', value: 4}];
        transform(opA, opB, [[{op: 'remove', path: '/0/1/0'}], opB]);
        diamondCheck([ [ [ 2 ] ] ], opA, opB, [ [ 4, [] ] ]);

        transform(opB, opA, [opB, [{op: 'remove', path: '/0/1/0'}]]);
        diamondCheck([ [ [ 2 ] ] ], opB, opA, [ [ 4, [] ] ]);
      });

      it('keep both operation', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: AddOperation<number>[] = [{op: 'add', path: '/0/-', value: 3}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ 2 ] ], opA, opB, [ [ 3 ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ 2 ] ], opB, opA, [ [ 3 ] ]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'add', path: '/2', value: 3 }];
        transform(opA, opB, [opA, [{op: 'add', path: '/1', value: 3 }]]);
        diamondCheck([ [ 1, 4 ], [ 5 ] ], opA, opB, [ [ 5 ], 3 ]);

        opA = [{op: 'remove', path: '/0/1'}];
        opB = [{op: 'add', path: '/1/1', value: 3 }];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ 1, 4 ], [ 5 ] ], opA, opB, [ [ 1 ], [ 5, 3 ] ]);
      });
    });

    describe('remove vs. replace', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 7}];
        transform(opA, opB, [[], [{op: 'add', path: '/0/0/0', value: 7}]]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 7, 3 ] ] ]);

        transform(opB, opA, [[{op: 'add', path: '/0/0/0', value: 7}], []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 7, 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 7}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [] ]);
      });

      it('opA is child', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0', value: 7}];
        transform(opA, opB, [[], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 7 ] ]);

        transform(opB, opA, [opB, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 7 ] ]);
      });

      it('keep both operation', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: ReplaceOperation<Array<any>>[] = [{op: 'replace', path: '/0/1', value: [ 'a' ]}];
        transform(opA, opB, [opA, [{op: 'replace', path: '/0/0', value: [ 'a' ]}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'b' ] ] ], opA, opB, [ [ [ 'a' ] ] ]);

        transform(opB, opA, [[{op: 'replace', path: '/0/0', value: [ 'a' ]}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'b' ] ] ], opB, opA, [ [ [ 'a' ] ] ]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'replace', path: '/1', value: [ 8, 9 ] }];
        transform(opA, opB, [opA, [{op: 'replace', path: '/0', value: [ 8, 9 ] }]]);
        diamondCheck([ [ 1, 4 ], [ 5 ] ], opA, opB, [ [ 8, 9 ] ]);
      });
    });

    describe('remove vs. move', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{ op: 'remove', path: '/0/0/1' }], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ [ 'y' ], 3 ] ] ]);

        transform(opB, opA, [opB, [{ op: 'remove', path: '/0/0/1' }]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ [ 'y' ], 3 ] ] ]);
      });

      it('opA is parent', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'copy', from: '/0/0/0', path: '/0/1'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        transform(opB, opA, [[], [{op: 'copy', from: '/0/0/0', path: '/0/1'}, ...opA]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/0/0'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/1'}];
        transform(opA, opB, [[{ op: 'remove', path: '/0/1/0' }], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 3 ] ] ]);

        transform(opB, opA, [opB, [{ op: 'remove', path: '/0/1/0' }]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 3 ] ] ]);

        opA = [{op: 'remove', path: '/0/0/0'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/2/0'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'remove', path: '/0/2/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'y' ], [], [ 3 ] ] ]);
      });

      it('keep both operation', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/0/1'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/2', from: '/0/0/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [], [ 'y' ], 3, 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/2', from: '/0/0/0'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('remove vs. copy', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{ op: 'remove', path: '/0/0/1' }], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ [ 'y' ], 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [opB, [{ op: 'remove', path: '/0/0/1' }]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ [ 'y' ], 3 ], [ 'y' ] ] ]);
      });

      it('opA is parent', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/0/0'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        transform(opA, opB, [[{ op: 'remove', path: '/0/1/0' }], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [opB, [{ op: 'remove', path: '/0/1/0' }]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 3 ], [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0/0'}];
        opB = [{op: 'copy', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[...opA, {op: 'remove', path: '/0/2/0'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 3 ], [ 'y' ], [ 3 ], [] ] ]);

        transform(opB, opA, [opB, [...opA, {op: 'remove', path: '/0/2/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 3 ], [ 'y' ], [ 3 ], [] ] ]);
      });

      it('keep both operation', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/2', from: '/0/0/1'}];
        transform(opA, opB, [opA, [{op: 'copy', path: '/0/2', from: '/0/0/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3 ], [ 'y' ], 3, 'g' ] ]);

        transform(opB, opA, [[{op: 'copy', path: '/0/2', from: '/0/0/0'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3 ], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('replace vs. replace', () => {
      it('same path', () => {
        const opA: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 5}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 6}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 5, 3 ] ] ]);

        transform(opB, opA, [opB, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 6, 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'y'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'x' ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'x' ] ]);
      });

      it('opA is child', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'y'}];
        transform(opA, opB, [[], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'y' ] ]);

        transform(opB, opA, [opB, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'y' ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/1', value: 'y'}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'g' ] ] ], opA, opB, [ [ 'x', 'y' ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'g' ] ] ], opB, opA, [ [ 'x', 'y' ] ]);
      });
    });

    describe('replace vs. add', () => {
      it('same path', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/0/0', value: 'y'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/0/1', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 'y', 'x', 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/0/1', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 'y', 'x', 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/0/0', value: 'y'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'x' ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'x' ] ]);
      });

      it('opA is child', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/0', value: 'y'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/1/0', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'y', [ 'x', 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/1/0', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'y', [ 'x', 3 ] ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/1', value: 'y'}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'f' ] ] ], opA, opB, [ [ 'x', 'y', [ 'f' ] ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'f' ] ] ], opA, opB, [ [ 'x', 'y', [ 'f' ] ] ]);
      });
    });

    describe('replace vs. move', () => {
      it('same path', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/0/1', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 3, 'x' ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/0/1', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 3, 'x' ] ] ]);
      });

      it('opA is parent', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'move', path: '/0/1', from: '/0/0/0'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        transform(opB, opA, [[], [{op: 'move', path: '/0/1', from: '/0/0/0'}, ...opA]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/0/0'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/1/0', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 'x', 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/1/0', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 'x', 3 ] ] ]);

        opA = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/2/0', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ 'x', 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/2/0', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'y' ], [], [ 'x', 3 ] ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/0/1'}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'x' ], [ 'y' ], 3, 'g' ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'x' ], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('replace vs. copy', () => {
      it('same path', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/0/1', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 3, 'x', 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/0/1', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 3, 'x', 3 ] ] ]);
      });

      it('opA is parent', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/0/0'}];
        transform(opA, opB, [opA, []]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        transform(opB, opA, [[], opA]);
        diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'replace', path: '/0/1/0', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 'x', 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [opB, [{op: 'replace', path: '/0/1/0', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 'x', 3 ], [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        opB = [{op: 'copy', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[...opA, {op: 'replace', path: '/0/2/0', value: 'x'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'x', 3 ], [ 'y' ], [ 'x', 3 ], [] ] ]);

        transform(opB, opA, [opB, [...opA, {op: 'replace', path: '/0/2/0', value: 'x'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'x', 3 ], [ 'y' ], [ 'x', 3 ], [] ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/2', from: '/0/0/1'}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'x', 3 ], [ 'y' ], 3, 'g' ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'x', 3 ], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('copy vs. copy', () => {
      it('same path', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/2'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'remove', path: '/0/0/0'}, ...opB], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/0/0'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        diamondCheck([ [ [ [ 'y' ], 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        transform(opA, opB, [[{op: 'copy', path: '/0/1/0', from: '/0/2'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        opB = [{op: 'copy', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[...opA, {op: 'copy', path: '/0/2/0', from: '/0/1'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ [ 'y' ], 2, 3 ], [ 'y' ], [ [ 'y' ], 2, 3 ], [] ] ]);

        transform(opB, opA, [opB, [...opA, {op: 'copy', path: '/0/2/0', from: '/0/1'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ [ 'y' ], 2, 3 ], [ 'y' ], [ [ 'y' ], 2, 3 ], [] ] ]);
      });

      it('keep both operation', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/2', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/2'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'remove', path: '/0/0/0'}, ...opB], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], [ 'y' ], 3, 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'copy', path: '/0/3', from: '/0/2'}];
        transform(opA, opB, [[{op: 'remove', path: '/0/3'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);
      });
    });

    describe('copy vs. add', () => {
      it('same path', () => {
        const opA: CopyOperation[] = [{op: 'copy', path: '/0/0/1', from: '/0/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/1', value: 1}];
        transform(opA, opB, [[{op: 'copy', path: '/0/0/2', from: '/0/0/0'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 1, 2, 3 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [opB, [{op: 'copy', path: '/0/0/2', from: '/0/0/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 1, 2, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/1', from: '/0/2'}];
        let opB: AddOperation<any>[] = [{op: 'add', path: '/0/1/0', value: {}}];
        transform(opA, opB, [opA, [{op: 'add', path: '/0/2/0', value: {}}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 'g', [ {}, 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'add', path: '/0/2/0', value: {}}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ {}, 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/2', from: '/0/1/0'}];
        opB = [{op: 'add', path: '/0/1', value: {}}];
        transform(opA, opB, [[{op: 'copy', path: '/0/3', from: '/0/2/0'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'y' ], 'y', 'g' ] ]);

        transform(opB, opA, [opB, [{op: 'copy', path: '/0/3', from: '/0/2/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], {}, [ 'y' ], 'y', 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/1/0', from: '/0/2'}];
        let opB: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: 5}];
        transform(opA, opB, [[{op: 'copy', path: '/0/2/0', from: '/0/3'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 5, [ 'g', 'y' ], 'g' ] ]);

        transform(opB, opA, [opB, [{op: 'copy', path: '/0/2/0', from: '/0/3'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 5, [ 'g', 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/2', from: '/0/1'}];
        opB = [{op: 'add', path: '/0/1/0', value: {}}];
        transform(opA, opB, [opA, [...opB, {op: 'add', path: '/0/2/0', value: {}}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], [ {}, 'y' ], [ {}, 'y' ], 'g' ] ]);

        transform(opB, opA, [[...opB, {op: 'add', path: '/0/2/0', value: {}}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], [ {}, 'y' ], [ {}, 'y' ], 'g' ] ]);
      });

      it('keep both operation', () => {
        const opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/2'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/3', value: 'i'}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ], 'g', 'i' ] ]);

        transform(opB, opA, [opB, opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'g', 2, 3 ], [ 'y' ], 'g', 'i' ] ]);
      });
    });

    describe('copy vs. move', () => {
      it('same path', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/2'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/0/1', from: '/0/0/2'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 3, 2 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/0/1', from: '/0/0/2'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'g', 3, 2 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'copy', path: '/0/0/2', from: '/0/0/0'}], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[], [{op: 'copy', path: '/0/0/2', from: '/0/0/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/2'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/3'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'y' ], [ 'g', 2, 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/1/0', from: '/0/3'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'y' ], [ 'g', 2, 3 ], [ 'y' ] ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/1/1'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 3, 2 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/1/0', from: '/0/1/1'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ 'g', [ 3, 2 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'move', path: '/0/0', from: '/0/0/0'}, {op: 'copy', path: '/0/1/0', from: '/0/0'}], [{op: 'move', path: '/0/1/0', from: '/0/2'}]]);
        diamondCheck([ [ [ [ 'z' ], 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'y' ], [ [ 'y' ], [ 'z' ], 3 ], 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/1/0', from: '/0/2'}], [{op: 'move', path: '/0/0', from: '/0/0/0'}, {op: 'copy', path: '/0/1/0', from: '/0/0'}]]);
        diamondCheck([ [ [ [ 'z' ], 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'y' ], [ [ 'y' ], [ 'z' ], 3 ], 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/2'}];
        transform(opA, opB, [[{op: 'copy', path: '/0/1/0', from: '/0/2'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [opB, [{op: 'copy', path: '/0/1/0', from: '/0/2'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ 'g', [ [ 'y' ], 2, 3 ], [ 'y' ] ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[{op: 'copy', path: '/0/2/0', from: '/0/0'}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ [ 'y' ], 2, 3 ] ] ]);

        transform(opB, opA, [opB, [{op: 'copy', path: '/0/2/0', from: '/0/0'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'y' ], [], [ [ 'y' ], 2, 3 ] ] ]);
      });

      it('keep both operation', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'copy', path: '/0/0/0', from: '/0/2'}], [{op: 'move', path: '/0/2', from: '/0/0/2'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2 ], [ 'y' ], 3, 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/2', from: '/0/0/2'}], [{op: 'copy', path: '/0/0/0', from: '/0/2'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2 ], [ 'y' ], 3, 'g' ] ]);

        opA = [{op: 'copy', path: '/0/1/1', from: '/0/1/0'}];
        opB = [{op: 'move', path: '/0/0', from: '/0/2'}];
        transform(opA, opB, [[], [{op: 'remove', path: '/0/1/1'}, ...opB]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 2, 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [[{op: 'remove', path: '/0/1/1'}, ...opB], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ 'g', [ 2, 3 ], [ 'y' ] ] ]);
      });
    });

    describe('add vs. add', () => {
      it('same path', () => {
        const opA: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 1}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        transform(opA, opB, [[{op: 'replace', path: '/0/1/1', value: 1}], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], [ 'y', 1 ], 'g' ] ]);

        transform(opB, opA, [[{op: 'replace', path: '/0/1/1', value: 5}], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], [ 'y', 5 ], 'g' ] ]);
      });

      it('opA is parent', () => {
        const opA: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: {}}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        transform(opA, opB, [opA, [{op: 'add', path: '/0/2/1', value: 5}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'y', 5 ], 'g' ] ]);
      });

      it('opA is child', () => {
        const opA: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        const opB: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: {}}];
        transform(opA, opB, [[{op: 'add', path: '/0/2/1', value: 5}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'y', 5 ], 'g' ] ]);
      });

      it('keep both operation', () => {
        let opA: AddOperation<string>[] = [{op: 'add', path: '/0/3', value: 'i'}];
        let opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/2', value: 7}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3, 7 ], [ 'y' ], 'g', 'i' ] ]);

        opA = [{op: 'add', path: '/0/3', value: 'i'}];
        opB = [{op: 'add', path: '/0/1', value: 7}];
        transform(opA, opB, [[], [{op: 'remove', path: '/0/3'}, ...opB]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 7, [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[], [{op: 'remove', path: '/0/1'}, ...opA]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 7, [ 'y' ], 'g' ] ]);

        opA = [{op: 'add', path: '/0/0/0', value: 'i'}];
        opB = [{op: 'add', path: '/0/1/0', value: 7}];
        transform(opA, opB, [opA, opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'i', 2, 3 ], [ 7, 'y' ], 'g' ] ]);
      });
    });

    describe('add vs. move', () => {
      it('same path', () => {
        const opA: AddOperation<number>[] = [{op: 'add', path: '/0/0/1', value: 1}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/1', from: '/0/0/0'}];
        transform(opA, opB, [[{op: 'move', path: '/0/0/0', from: '/0/0/1'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 1, 3 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[], [{op: 'move', path: '/0/0/0', from: '/0/0/1'}, ...opA]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 1, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: {}}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/1/0', from: '/0/2'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/2/0', from: '/0/3'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'g', 'y' ] ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/2/0', from: '/0/3'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], {}, [ 'g', 'y' ] ] ]);

        opA = [{op: 'add', path: '/0/1', value: {}}];
        opB = [{op: 'move', path: '/0/1/0', from: '/0/1/1'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/2/0', from: '/0/2/1'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y', 'w' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'w', 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/2/0', from: '/0/2/1'}], opA]);
        diamondCheck([ [ [ 2, 3 ], [ 'y', 'w' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], {}, [ 'w', 'y' ], 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: AddOperation<any>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/1', from: '/0/2'}];
        transform(opA, opB, [[{op: 'add', path: '/0/2/1', value: 5}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 'g', [ 'y', 5 ] ] ]);

        transform(opB, opA, [opB, [{op: 'add', path: '/0/2/1', value: 5}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ 'y', 5 ] ] ]);

        opA = [{op: 'add', path: '/0/1/1', value: {}}];
        opB = [{op: 'move', path: '/0/2', from: '/0/1'}];
        transform(opA, opB, [[{op: 'add', path: '/0/2/1', value: {}}], opB]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 'g', [ 'y', {} ] ] ]);

        transform(opB, opA, [opB, [{op: 'add', path: '/0/2/1', value: {}}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ 'y', {} ] ] ]);
      });

      it('keep both operation', () => {
        const opA: AddOperation<string>[] = [{op: 'add', path: '/0/3', value: 'i'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/2'}];
        transform(opA, opB, [[], [{op: 'remove', path: '/0/3'}, ...opB]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g', 'j' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ], 'j' ] ]);

        transform(opB, opA, [[{op: 'remove', path: '/0/3'}, ...opB], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g', 'j' ] ], opB, opA, [ [ [ 'g', 2, 3 ], [ 'y' ], 'j' ] ]);
      });
    });

    describe('move vs. move', () => {
      it('same path', () => {
        let opA: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/2'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[{op: 'move', path: '/0/0/1', from: '/0/0/0'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ] ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/2', from: '/0/0/0'}, ...opB], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [[], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/2'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        transform(opA, opB, [[{op: 'move', path: '/0/0', from: '/0/1'}], [{op: 'move', path: '/0/1/0', from: '/0/2'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ] ] ]);

        opA = [{op: 'move', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/1/1'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 3, 2 ], [ 'y' ] ] ]);

        opA = [{op: 'move', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/0/0'}];
        transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/1/0/0'}]]);
        diamondCheck([ [ [ [ 'y' ], 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 'y', [], 3 ], [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/2'}];
        transform(opA, opB, [[{op: 'move', path: '/0/1/0', from: '/0/2'}], [{op: 'move', path: '/0/0', from: '/0/1'}]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ] ] ]);

        opA = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        transform(opA, opB, [[], [{op: 'move', path: '/0/1', from: '/0/0/0'}, ...opB]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ 2, 3 ] ] ]);

        opA = [{op: 'move', path: '/0/1/0', from: '/0/3'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/1'}];
        transform(opA, opB, [[], [{op: 'move', path: '/0/3', from: '/0/1/0'}, ...opB]]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], [ 'v' ], [ 'w' ], [] ] ], opA, opB, [ [ [ 2, 3 ], [ 'v' ], [ 'y' ], [ 'w' ], [] ] ]);
      });

      it('keep both operation', () => {
        const opA: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/1'}];
        transform(opA, opB, [[{op: 'move', path: '/0/1', from: '/0/2'}, ...opA], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2 ], [ 'y' ], 'g' ] ]);

        transform(opB, opA, [[{op: 'move', path: '/0/0/1', from: '/0/0/0'}, ...opB], []]);
        diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ 'y' ] ] ]);
      });
    });
  });

});
