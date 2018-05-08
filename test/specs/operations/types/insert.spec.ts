import { expect } from 'chai';
import 'mocha';
import { TestHelper } from '../../../testHelper';
import { Insert } from '../../../../src/operations/text/types/insert';
import { TextOperation } from '../../../../src/operations/text/textOperation';


describe('Insert operation', () => {

  it('should compare two `Insert` operation', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const docB = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const sameCase = new Insert(doc, 15);
    const testVector: Array<{a: TextOperation; b: TextOperation; result: boolean}> = [
      { a: new Insert(doc, 3), b: new Insert(doc, 7), result: false },
      { a: new Insert(doc, 7), b: new Insert(doc, 3), result: false },
      { a: new Insert(doc, 1), b: new Insert(docB, 1), result: false },
      { a: new Insert(doc, 9), b: new Insert(docB, 4), result: false },
      { a: new Insert(doc, 5), b: new Insert(doc, 5), result: true },
      { a: sameCase, b: sameCase, result: true },
    ];
    testVector.forEach(({a, b, result}) => {
      const isEqual = a.equals(b);
      expect(isEqual).to.be.equal(result);
    });
  });

  it('should compare two `Insert` operation', () => {
    const operation = new Insert('Hello World!', 7);
    expect(operation.toString()).to.be.equal('Insert("Hello World!", 7)');
  });

});
