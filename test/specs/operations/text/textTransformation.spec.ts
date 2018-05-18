import { expect } from 'chai';
import 'mocha';
import { TextOperation } from '../../../../src/operations/text/textOperation';
import { TestHelper } from '../../../testHelper';
import { Noop } from '../../../../src/operations/text/types/noop';
import { TextTransformation } from '../../../../src/operations/text/textTransformation';
import { Remove } from '../../../../src/operations/text/types/remove';
import { Insert } from '../../../../src/operations/text/types/insert';

class UnknownOperation implements TextOperation {
  public doc: string;

  constructor(doc: string) {
    this.doc = doc;
  }

  public apply(_document: string): never {
    throw new Error('apply method is unimplemented');
  }

  public equals(_other: TextOperation): never {
    throw new Error('equals method is unimplemented');
  }

  public toString(): never {
    throw new Error('toString method is unimplemented');
  }
}

describe('Text transformation', () => {

  it('should return given arguments in array in case of `Noop` instances', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const testVector: Array<{a: TextOperation; b: TextOperation}> = [
      { a: Noop.getInstance(), b: Noop.getInstance() },
      { a: TestHelper.randomOperation(doc), b: Noop.getInstance() },
      { a: Noop.getInstance(), b: TestHelper.randomOperation(doc) },
    ];
    testVector.forEach(({a, b}) => {
      const transformed = TextTransformation.transformOperations(a, b);
      expect(transformed[0].apply(b.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
    });
  });

  it('should transform two `Insert` operations', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const sameCase = TestHelper.randomInsert(6, 10);
    const testVector: Array<{a: TextOperation; b: TextOperation}> = [
      { a: TestHelper.randomInsert(10, 0), b: TestHelper.randomInsert(2, 4) },
      { a: TestHelper.randomInsert(8, 5), b: TestHelper.randomInsert(9, 5) },
      { a: TestHelper.randomInsert(6, 3), b: TestHelper.randomInsert(9, 1) },
      { a: TestHelper.randomInsert(11, 2), b: TestHelper.randomInsert(9, 2) },
      { a: sameCase, b: sameCase },
    ];
    testVector.forEach(({a, b}) => {
      const transformed = TextTransformation.transformOperations(a, b);
      expect(transformed[0].apply(b.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
    });
  });

  it('should transform an `Insert` and `Remove` operation', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const testVector: Array<{a: TextOperation; b: TextOperation}> = [
      { a: TestHelper.randomInsert(10, 1), b: new Remove(8, 3) },
      { a: TestHelper.randomInsert(7, 12), b: new Remove(5, 6) },
      { a: TestHelper.randomInsert(3, 8), b: new Remove(8, 4) },
    ];
    testVector.forEach(({a, b}) => {
      const transformed = TextTransformation.transformOperations(a, b);
      expect(transformed[0].apply(b.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
    });
  });

  it('should transform a `Remove` and `Insert` operation', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const testVector: Array<{a: TextOperation; b: TextOperation}> = [
      { a: new Remove(2, 15), b: TestHelper.randomInsert(10, 12) },
      { a: new Remove(5, 4), b: TestHelper.randomInsert(4, 9) },
      { a: new Remove(9, 0), b: TestHelper.randomInsert(2, 3) },
    ];
    testVector.forEach(({a, b}) => {
      const transformed = TextTransformation.transformOperations(a, b);
      expect(transformed[0].apply(b.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
    });
  });

  it('should transform two `Remove` operations', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const testVector: Array<{a: TextOperation; b: TextOperation}> = [
      { a: new Remove(1, 7), b: new Remove(1, 7) },
      { a: new Remove(3, 1), b: new Remove(5, 1) },
      { a: new Remove(5, 5), b: new Remove(4, 5) },
      { a: new Remove(8, 1), b: new Remove(1, 17) },
      { a: new Remove(9, 2), b: new Remove(3, 3) },
      { a: new Remove(6, 0), b: new Remove(5, 4) },
      { a: new Remove(1, 14), b: new Remove(2, 10) },
      { a: new Remove(6, 3), b: new Remove(8, 1) },
      { a: new Remove(3, 8), b: new Remove(2, 7) },
    ];
    testVector.forEach(({a, b}) => {
      const transformed = TextTransformation.transformOperations(a, b);
      expect(transformed[0].apply(b.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
    });
  });

  it('should apply simple operations to the doc', () => {
    expect(new Insert('World', 6).apply('Hello !')).to.equal('Hello World!');
    expect(new Remove(5, 6).apply('Hello World!')).to.equal('Hello !');
    expect(Noop.getInstance().apply('Hello World!')).to.equal('Hello World!');
  });

  it('should transform two random operation', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const a = TestHelper.randomOperation(doc);
    const b = TestHelper.randomOperation(doc);
    const transformed = TextTransformation.transformOperations(a, b);
    expect(transformed[0].apply(b.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
  });

  it('should transform exactly same `Insert` operation into `Noop\'s`', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const a = TestHelper.randomInsertOperation(doc);
    const transformed = TextTransformation.transformOperations(a, a);
    expect(transformed[0].apply(a.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
  });

  it('should transform exactly same `Remove` operation into `Noop\'s`', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const a = TestHelper.randomRemoveOperation(doc);
    const transformed = TextTransformation.transformOperations(a, a);
    expect(transformed[0].apply(a.apply(doc))).to.deep.equal(transformed[1].apply(a.apply(doc)));
  });

  it('should throw an error when an unknown operation passed', () => {
    const doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
    const a = new UnknownOperation(doc);
    const b = new UnknownOperation(doc);
    expect(() => TextTransformation.transformOperations(a, b)).to.be.throw(Error, /Operation type does not supported/);
  });

  it('should generate simple operations from `TextOperation\'s`', () => {
    for (let i = 0; i < 20; i++) {
      let doc = TestHelper.randomText(TestHelper.randomIntBetween(10, 20));
      const patch = TestHelper.randomTextPatch(doc);
      const modifiedDoc = patch.apply(doc);
      const simpleOperations = TextTransformation.fromTextOperation(patch);
      for (const simpleOperation of simpleOperations) {
        doc = simpleOperation.apply(doc);
      }
      expect(doc).to.equal(modifiedDoc);
    }
  });

});
