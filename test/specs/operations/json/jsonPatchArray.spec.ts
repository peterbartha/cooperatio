import 'mocha';
import {
  AddOperation, CopyOperation, MoveOperation, RemoveOperation,
  ReplaceOperation
} from '../../../../src/operations/json/jsonOperation';
import { TestHelper } from '../../../testHelper';

describe('JSON Array operation', () => {

  describe('Arrays', () => {
    describe('remove vs. remove', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];

        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        const opB: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], 4 ] ], opA, opB, [ [ 4 ] ]);
      });

      it('opA is child', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        TestHelper.transform(opA, opB, [[], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], 4 ] ], opA, opB, [ [ 4 ] ]);
      });

      it('keep both operation', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: RemoveOperation[] = [{op: 'remove', path: '/1/0'}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 2, 3 ] ], opA, opB, [ [ 4 ], [ 3 ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 2, 3 ] ], opB, opA, [ [ 4 ], [ 3 ] ]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'remove', path: '/2'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'remove', path: '/1'}]]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 2, 3 ], [ 5, 6 ] ], opA, opB, [[ 2, 3 ]]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'remove', path: '/2/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'remove', path: '/1/1'}]]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 2, 3 ], [ 5, 6 ] ], opA, opB, [[ 2, 3 ], [ 5 ]]);
      });
    });

    describe('remove vs. add', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/0', value: 4 }];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/0/1'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 4, 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'remove', path: '/0/0/1'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 4, 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/0', value: 4}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/0', value: [4]}], [{op: 'add', path: '/0/0', value: [4]}]]);
        TestHelper.diamondCheck([ [ [ 2 ], 9 ] ], opA, opB, [ [ [ 4 ], 9 ] ]);

        TestHelper.transform(opB, opA, [[{op: 'add', path: '/0/0', value: [4]}], [{op: 'replace', path: '/0/0', value: [4]}]]);
        TestHelper.diamondCheck([ [ [ 2 ], 9 ] ], opB, opA, [ [ [ 4 ], 9 ] ]);
      });

      it('opA is child', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0', value: 4}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/1/0'}], opB]);
        TestHelper.diamondCheck([ [ [ 2 ] ] ], opA, opB, [ [ 4, [] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'remove', path: '/0/1/0'}]]);
        TestHelper.diamondCheck([ [ [ 2 ] ] ], opB, opA, [ [ 4, [] ] ]);
      });

      it('keep both operation', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: AddOperation<number>[] = [{op: 'add', path: '/0/-', value: 3}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ 2 ] ], opA, opB, [ [ 3 ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ 2 ] ], opB, opA, [ [ 3 ] ]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'add', path: '/2', value: 3 }];
        TestHelper.transform(opA, opB, [opA, [{op: 'add', path: '/1', value: 3 }]]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 5 ] ], opA, opB, [ [ 5 ], 3 ]);

        opA = [{op: 'remove', path: '/0/1'}];
        opB = [{op: 'add', path: '/1/1', value: 3 }];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 5 ] ], opA, opB, [ [ 1 ], [ 5, 3 ] ]);
      });
    });

    describe('remove vs. replace', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 7}];
        TestHelper.transform(opA, opB, [[], [{op: 'add', path: '/0/0/0', value: 7}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 7, 3 ] ] ]);

        TestHelper.transform(opB, opA, [[{op: 'add', path: '/0/0/0', value: 7}], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 7, 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 7}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [] ]);
      });

      it('opA is child', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0', value: 7}];
        TestHelper.transform(opA, opB, [[], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 7 ] ]);

        TestHelper.transform(opB, opA, [opB, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 7 ] ]);
      });

      it('keep both operation', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: ReplaceOperation<Array<any>>[] = [{op: 'replace', path: '/0/1', value: [ 'a' ]}];
        TestHelper.transform(opA, opB, [opA, [{op: 'replace', path: '/0/0', value: [ 'a' ]}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'b' ] ] ], opA, opB, [ [ [ 'a' ] ] ]);

        TestHelper.transform(opB, opA, [[{op: 'replace', path: '/0/0', value: [ 'a' ]}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'b' ] ] ], opB, opA, [ [ [ 'a' ] ] ]);

        opA = [{op: 'remove', path: '/0'}];
        opB = [{op: 'replace', path: '/1', value: [ 8, 9 ] }];
        TestHelper.transform(opA, opB, [opA, [{op: 'replace', path: '/0', value: [ 8, 9 ] }]]);
        TestHelper.diamondCheck([ [ 1, 4 ], [ 5 ] ], opA, opB, [ [ 8, 9 ] ]);
      });
    });

    describe('remove vs. move', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{ op: 'remove', path: '/0/0/1' }], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ [ 'y' ], 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{ op: 'remove', path: '/0/0/1' }]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ [ 'y' ], 3 ] ] ]);
      });

      it('opA is parent', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'copy', from: '/0/0/0', path: '/0/1'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], [{op: 'copy', from: '/0/0/0', path: '/0/1'}, ...opA]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/0/0'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{ op: 'remove', path: '/0/1/0' }], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{ op: 'remove', path: '/0/1/0' }]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 3 ] ] ]);

        opA = [{op: 'remove', path: '/0/0/0'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/2/0'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'remove', path: '/0/2/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'y' ], [], [ 3 ] ] ]);
      });

      it('keep both operation', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/2', from: '/0/0/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [], [ 'y' ], 3, 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/2', from: '/0/0/0'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('remove vs. copy', () => {
      it('same path', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{ op: 'remove', path: '/0/0/1' }], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ [ 'y' ], 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{ op: 'remove', path: '/0/0/1' }]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ [ 'y' ], 3 ], [ 'y' ] ] ]);
      });

      it('opA is parent', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/0/0'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{ op: 'remove', path: '/0/1/0' }], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{ op: 'remove', path: '/0/1/0' }]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 3 ], [ 'y' ] ] ]);

        opA = [{op: 'remove', path: '/0/0/0'}];
        opB = [{op: 'copy', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[...opA, {op: 'remove', path: '/0/2/0'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 3 ], [ 'y' ], [ 3 ], [] ] ]);

        TestHelper.transform(opB, opA, [opB, [...opA, {op: 'remove', path: '/0/2/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 3 ], [ 'y' ], [ 3 ], [] ] ]);
      });

      it('keep both operation', () => {
        const opA: RemoveOperation[] = [{op: 'remove', path: '/0/0/0'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/2', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'copy', path: '/0/2', from: '/0/0/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3 ], [ 'y' ], 3, 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'copy', path: '/0/2', from: '/0/0/0'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3 ], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('replace vs. replace', () => {
      it('same path', () => {
        const opA: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 5}];
        const opB: ReplaceOperation<number>[] = [{op: 'replace', path: '/0/0/0', value: 6}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 5, 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 6, 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'y'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'x' ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'x' ] ]);
      });

      it('opA is child', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'y'}];
        TestHelper.transform(opA, opB, [[], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'y' ] ]);

        TestHelper.transform(opB, opA, [opB, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'y' ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/1', value: 'y'}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'g' ] ] ], opA, opB, [ [ 'x', 'y' ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'g' ] ] ], opB, opA, [ [ 'x', 'y' ] ]);
      });
    });

    describe('replace vs. add', () => {
      it('same path', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/0/0', value: 'y'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/0/1', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 'y', 'x', 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/0/1', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 'y', 'x', 3 ] ] ]);
      });

      it('opA is parent', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/0/0', value: 'y'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'x' ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'x' ] ]);
      });

      it('opA is child', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/0', value: 'y'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/1/0', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ 'y', [ 'x', 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/1/0', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ 'y', [ 'x', 3 ] ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/1', value: 'y'}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'f' ] ] ], opA, opB, [ [ 'x', 'y', [ 'f' ] ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'f' ] ] ], opA, opB, [ [ 'x', 'y', [ 'f' ] ] ]);
      });
    });

    describe('replace vs. move', () => {
      it('same path', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/0/1', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 3, 'x' ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/0/1', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 3, 'x' ] ] ]);
      });

      it('opA is parent', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/1', from: '/0/0/0'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], [{op: 'move', path: '/0/1', from: '/0/0/0'}, ...opA]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/0/0'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/1/0', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 'x', 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/1/0', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 'x', 3 ] ] ]);

        opA = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/2/0', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ 'x', 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/2/0', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'y' ], [], [ 'x', 3 ] ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'x' ], [ 'y' ], 3, 'g' ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'x' ], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('replace vs. copy', () => {
      it('same path', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/0/1', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opA, opB, [ [ [ 3, 'x', 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/0/1', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ] ] ], opB, opA, [ [ [ 3, 'x', 3 ] ] ]);
      });

      it('opA is parent', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0', value: 'x'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0', value: 'x'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/0/0'}];
        TestHelper.transform(opA, opB, [opA, []]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opA, opB, [ [ 'x', [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[], opA]);
        TestHelper.diamondCheck([ [ [ [ 'w' ], 3 ], [ 'y' ] ] ], opB, opA, [ [ 'x', [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/1/0', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opA, opB, [ [ [ 'y' ], [ 'x', 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'replace', path: '/0/1/0', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ] ] ], opB, opA, [ [ [ 'y' ], [ 'x', 3 ], [ 'y' ] ] ]);

        opA = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        opB = [{op: 'copy', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[...opA, {op: 'replace', path: '/0/2/0', value: 'x'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'x', 3 ], [ 'y' ], [ 'x', 3 ], [] ] ]);

        TestHelper.transform(opB, opA, [opB, [...opA, {op: 'replace', path: '/0/2/0', value: 'x'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'x', 3 ], [ 'y' ], [ 'x', 3 ], [] ] ]);
      });

      it('keep both operation', () => {
        const opA: ReplaceOperation<string>[] = [{op: 'replace', path: '/0/0/0', value: 'x'}];
        const opB: CopyOperation[] = [{op: 'copy', path: '/0/2', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'x', 3 ], [ 'y' ], 3, 'g' ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'x', 3 ], [ 'y' ], 3, 'g' ] ]);
      });
    });

    describe('copy vs. copy', () => {
      it('same path', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/2'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'remove', path: '/0/0/0'}, ...opB], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'copy', path: '/0/0/0', from: '/0/0/0/0'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/0/0'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ [ 'y' ], 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/1/0', from: '/0/2'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        opB = [{op: 'copy', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[...opA, {op: 'copy', path: '/0/2/0', from: '/0/1'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ [ 'y' ], 2, 3 ], [ 'y' ], [ [ 'y' ], 2, 3 ], [] ] ]);

        TestHelper.transform(opB, opA, [opB, [...opA, {op: 'copy', path: '/0/2/0', from: '/0/1'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ [ 'y' ], 2, 3 ], [ 'y' ], [ [ 'y' ], 2, 3 ], [] ] ]);
      });

      it('keep both operation', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        let opB: CopyOperation[] = [{op: 'copy', path: '/0/2', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/2'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'remove', path: '/0/0/0'}, ...opB], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], [ 'y' ], 3, 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'copy', path: '/0/3', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[{op: 'remove', path: '/0/3'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);
      });
    });

    describe('copy vs. add', () => {
      it('same path', () => {
        const opA: CopyOperation[] = [{op: 'copy', path: '/0/0/1', from: '/0/0/0'}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/1', value: 1}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/0/2', from: '/0/0/0'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 1, 2, 3 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'copy', path: '/0/0/2', from: '/0/0/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 1, 2, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/1', from: '/0/2'}];
        let opB: AddOperation<any>[] = [{op: 'add', path: '/0/1/0', value: {}}];
        TestHelper.transform(opA, opB, [opA, [{op: 'add', path: '/0/2/0', value: {}}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 'g', [ {}, 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'add', path: '/0/2/0', value: {}}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ {}, 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/2', from: '/0/1/0'}];
        opB = [{op: 'add', path: '/0/1', value: {}}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/3', from: '/0/2/0'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'y' ], 'y', 'g' ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'copy', path: '/0/3', from: '/0/2/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], {}, [ 'y' ], 'y', 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/1/0', from: '/0/2'}];
        let opB: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: 5}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/2/0', from: '/0/3'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 5, [ 'g', 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'copy', path: '/0/2/0', from: '/0/3'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 5, [ 'g', 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/2', from: '/0/1'}];
        opB = [{op: 'add', path: '/0/1/0', value: {}}];
        TestHelper.transform(opA, opB, [opA, [...opB, {op: 'add', path: '/0/2/0', value: {}}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], [ {}, 'y' ], [ {}, 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[...opB, {op: 'add', path: '/0/2/0', value: {}}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], [ {}, 'y' ], [ {}, 'y' ], 'g' ] ]);
      });

      it('keep both operation', () => {
        const opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/2'}];
        const opB: AddOperation<string>[] = [{op: 'add', path: '/0/3', value: 'i'}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ], 'g', 'i' ] ]);

        TestHelper.transform(opB, opA, [opB, opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'g', 2, 3 ], [ 'y' ], 'g', 'i' ] ]);
      });
    });

    describe('copy vs. move', () => {
      it('same path', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/2'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/0/1', from: '/0/0/2'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 3, 2 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/0/1', from: '/0/0/2'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'g', 3, 2 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/0/2', from: '/0/0/0'}], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[], [{op: 'copy', path: '/0/0/2', from: '/0/0/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/3'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'y' ], [ 'g', 2, 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/1/0', from: '/0/3'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'y' ], [ 'g', 2, 3 ], [ 'y' ] ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/1/1'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 3, 2 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/1/0', from: '/0/1/1'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ 'g', [ 3, 2 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'copy', path: '/0/0', from: '/0/1'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/0', from: '/0/0/0'}, {op: 'copy', path: '/0/1/0', from: '/0/0'}], [{op: 'move', path: '/0/1/0', from: '/0/2'}]]);
        TestHelper.diamondCheck([ [ [ [ 'z' ], 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'y' ], [ [ 'y' ], [ 'z' ], 3 ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/1/0', from: '/0/2'}], [{op: 'move', path: '/0/0', from: '/0/0/0'}, {op: 'copy', path: '/0/1/0', from: '/0/0'}]]);
        TestHelper.diamondCheck([ [ [ [ 'z' ], 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 'y' ], [ [ 'y' ], [ 'z' ], 3 ], 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/1/0', from: '/0/2'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'copy', path: '/0/1/0', from: '/0/2'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ 'g', [ [ 'y' ], 2, 3 ], [ 'y' ] ] ]);

        opA = [{op: 'copy', path: '/0/0/0', from: '/0/1'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/2/0', from: '/0/0'}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ [ 'y' ], 2, 3 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'copy', path: '/0/2/0', from: '/0/0'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opB, opA, [ [ [ 'y' ], [], [ [ 'y' ], 2, 3 ] ] ]);
      });

      it('keep both operation', () => {
        let opA: CopyOperation[] = [{op: 'copy', path: '/0/0/0', from: '/0/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'copy', path: '/0/0/0', from: '/0/2'}], [{op: 'move', path: '/0/2', from: '/0/0/2'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2 ], [ 'y' ], 3, 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/2', from: '/0/0/2'}], [{op: 'copy', path: '/0/0/0', from: '/0/2'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2 ], [ 'y' ], 3, 'g' ] ]);

        opA = [{op: 'copy', path: '/0/1/1', from: '/0/1/0'}];
        opB = [{op: 'move', path: '/0/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[], [{op: 'remove', path: '/0/1/1'}, ...opB]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 2, 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[{op: 'remove', path: '/0/1/1'}, ...opB], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ 'g', [ 2, 3 ], [ 'y' ] ] ]);
      });
    });

    describe('add vs. add', () => {
      it('same path', () => {
        const opA: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 1}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        TestHelper.transform(opA, opB, [[{op: 'replace', path: '/0/1/1', value: 1}], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], [ 'y', 1 ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'replace', path: '/0/1/1', value: 5}], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], [ 'y', 5 ], 'g' ] ]);
      });

      it('opA is parent', () => {
        const opA: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: {}}];
        const opB: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        TestHelper.transform(opA, opB, [opA, [{op: 'add', path: '/0/2/1', value: 5}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'y', 5 ], 'g' ] ]);
      });

      it('opA is child', () => {
        const opA: AddOperation<number>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        const opB: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: {}}];
        TestHelper.transform(opA, opB, [[{op: 'add', path: '/0/2/1', value: 5}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'y', 5 ], 'g' ] ]);
      });

      it('keep both operation', () => {
        let opA: AddOperation<string>[] = [{op: 'add', path: '/0/3', value: 'i'}];
        let opB: AddOperation<number>[] = [{op: 'add', path: '/0/0/2', value: 7}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3, 7 ], [ 'y' ], 'g', 'i' ] ]);

        opA = [{op: 'add', path: '/0/3', value: 'i'}];
        opB = [{op: 'add', path: '/0/1', value: 7}];
        TestHelper.transform(opA, opB, [[], [{op: 'remove', path: '/0/3'}, ...opB]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 7, [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[], [{op: 'remove', path: '/0/1'}, ...opA]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 7, [ 'y' ], 'g' ] ]);

        opA = [{op: 'add', path: '/0/0/0', value: 'i'}];
        opB = [{op: 'add', path: '/0/1/0', value: 7}];
        TestHelper.transform(opA, opB, [opA, opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'i', 2, 3 ], [ 7, 'y' ], 'g' ] ]);
      });
    });

    describe('add vs. move', () => {
      it('same path', () => {
        const opA: AddOperation<number>[] = [{op: 'add', path: '/0/0/1', value: 1}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/1', from: '/0/0/0'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/0/0', from: '/0/0/1'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 1, 3 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[], [{op: 'move', path: '/0/0/0', from: '/0/0/1'}, ...opA]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 1, 3 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: AddOperation<any>[] = [{op: 'add', path: '/0/1', value: {}}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/1/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/2/0', from: '/0/3'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'g', 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/2/0', from: '/0/3'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], {}, [ 'g', 'y' ] ] ]);

        opA = [{op: 'add', path: '/0/1', value: {}}];
        opB = [{op: 'move', path: '/0/1/0', from: '/0/1/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/2/0', from: '/0/2/1'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y', 'w' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], {}, [ 'w', 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/2/0', from: '/0/2/1'}], opA]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y', 'w' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], {}, [ 'w', 'y' ], 'g' ] ]);
      });

      it('opA is child', () => {
        let opA: AddOperation<any>[] = [{op: 'add', path: '/0/1/1', value: 5}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/1', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[{op: 'add', path: '/0/2/1', value: 5}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 'g', [ 'y', 5 ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'add', path: '/0/2/1', value: 5}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ 'y', 5 ] ] ]);

        opA = [{op: 'add', path: '/0/1/1', value: {}}];
        opB = [{op: 'move', path: '/0/2', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'add', path: '/0/2/1', value: {}}], opB]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 2, 3 ], 'g', [ 'y', {} ] ] ]);

        TestHelper.transform(opB, opA, [opB, [{op: 'add', path: '/0/2/1', value: {}}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ 'y', {} ] ] ]);
      });

      it('keep both operation', () => {
        const opA: AddOperation<string>[] = [{op: 'add', path: '/0/3', value: 'i'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[], [{op: 'remove', path: '/0/3'}, ...opB]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g', 'j' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ], 'j' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'remove', path: '/0/3'}, ...opB], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g', 'j' ] ], opB, opA, [ [ [ 'g', 2, 3 ], [ 'y' ], 'j' ] ]);
      });
    });

    describe('move vs. move', () => {
      it('same path', () => {
        let opA: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/2'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/0/1', from: '/0/0/0'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 'g', 2, 3 ], [ 'y' ] ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/2', from: '/0/0/0'}, ...opB], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 3, 2 ], [ 'y' ], 'g' ] ]);

        opA = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [[], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2 ], [ 'y' ], 'g' ] ]);
      });

      it('opA is parent', () => {
        let opA: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/2'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/0', from: '/0/1'}], [{op: 'move', path: '/0/1/0', from: '/0/2'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ] ] ]);

        opA = [{op: 'move', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/1/1'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 3, 2 ], [ 'y' ] ] ]);

        opA = [{op: 'move', path: '/0/0', from: '/0/2'}];
        opB = [{op: 'move', path: '/0/0/0', from: '/0/0/0/0'}];
        TestHelper.transform(opA, opB, [opA, [{op: 'move', path: '/0/1/0', from: '/0/1/0/0'}]]);
        TestHelper.diamondCheck([ [ [ [ 'y' ], 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ 'y', [], 3 ], [ 'y' ] ] ]);
      });

      it('opA is child', () => {
        let opA: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        let opB: MoveOperation[] = [{op: 'move', path: '/0/0', from: '/0/2'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/1/0', from: '/0/2'}], [{op: 'move', path: '/0/0', from: '/0/1'}]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ 'g', [ [ 'y' ], 2, 3 ] ] ]);

        opA = [{op: 'move', path: '/0/0/0', from: '/0/1'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/0'}];
        TestHelper.transform(opA, opB, [[], [{op: 'move', path: '/0/1', from: '/0/0/0'}, ...opB]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [] ] ], opA, opB, [ [ [ 'y' ], [], [ 2, 3 ] ] ]);

        opA = [{op: 'move', path: '/0/1/0', from: '/0/3'}];
        opB = [{op: 'move', path: '/0/2', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[], [{op: 'move', path: '/0/3', from: '/0/1/0'}, ...opB]]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], [ 'v' ], [ 'w' ], [] ] ], opA, opB, [ [ [ 2, 3 ], [ 'v' ], [ 'y' ], [ 'w' ], [] ] ]);
      });

      it('keep both operation', () => {
        const opA: MoveOperation[] = [{op: 'move', path: '/0/0/0', from: '/0/0/1'}];
        const opB: MoveOperation[] = [{op: 'move', path: '/0/2', from: '/0/1'}];
        TestHelper.transform(opA, opB, [[{op: 'move', path: '/0/1', from: '/0/2'}, ...opA], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opA, opB, [ [ [ 3, 2 ], [ 'y' ], 'g' ] ]);

        TestHelper.transform(opB, opA, [[{op: 'move', path: '/0/0/1', from: '/0/0/0'}, ...opB], []]);
        TestHelper.diamondCheck([ [ [ 2, 3 ], [ 'y' ], 'g' ] ], opB, opA, [ [ [ 2, 3 ], 'g', [ 'y' ] ] ]);
      });
    });
  });

});
