import { expect } from 'chai';
import 'mocha';
import { Remove } from '../../../../src/operations/text/types/remove';
import { TextOperation } from '../../../../src/operations/text/textOperation';

describe('Remove operation', () => {

  it('should compare two `Remove` operation', () => {
    const sameCase = new Remove(2, 15);
    const testVector: Array<{a: TextOperation; b: TextOperation; result: boolean}> = [
      { a: new Remove(1, 3), b: new Remove(2, 7), result: false },
      { a: new Remove(2, 7), b: new Remove(1, 3), result: false },
      { a: new Remove(1, 6), b: new Remove(1, 8), result: false },
      { a: new Remove(9, 6), b: new Remove(9, 4), result: false },
      { a: new Remove(4, 8), b: new Remove(4, 8), result: true },
      { a: sameCase, b: sameCase, result: true },
    ];
    testVector.forEach(({a, b, result}) => {
      const isEqual = a.equals(b);
      expect(isEqual).to.be.equal(result);
    });
  });

  it('should compare two `Remove` operation', () => {
    const operation = new Remove(2, 7);
    expect(operation.toString()).to.be.equal('Remove(2, 7)');
  });

});
