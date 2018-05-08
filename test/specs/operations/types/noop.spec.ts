import { expect } from 'chai';
import 'mocha';
import { Noop } from '../../../../src/operations/text/types/noop';
import { Insert } from '../../../../src/operations/text/types/insert';
import { Remove } from '../../../../src/operations/text/types/remove';
import { TextOperation } from '../../../../src/operations/text/textOperation';

describe('Noop operation', () => {

  it('should compare two `Noop` operation', () => {
    const testVector: Array<{operation: TextOperation; result: boolean}> = [
      { operation: Noop.getInstance(), result: true },
      { operation: new Insert('Hello', 3), result: false },
      { operation: new Remove(4, 1), result: false },
    ];
    testVector.forEach(({operation, result}) => {
      const isEqual = Noop.getInstance().equals(operation);
      expect(isEqual).to.be.equal(result);
    });
  });

  it('should compare two `Noop` operation', () => {
    const operation = Noop.getInstance();
    expect(operation.toString()).to.be.equal('Noop()');
  });

});
