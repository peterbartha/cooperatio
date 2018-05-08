import { expect } from 'chai';
import 'mocha';
import { TextPatch } from '../../../src/operations/text/textPatch';
import { TestHelper } from '../../testHelper';

describe('TextPatch', () => {

  it('should match text lengths after applying operations', () => {
    const operation = new TextPatch();
    expect(operation.baseLength).to.equal(0);
    expect(operation.targetLength).to.equal(0);

    operation.retain(5);
    expect(operation.baseLength).to.equal(5);
    expect(operation.targetLength).to.equal(5);

    operation.insert('abc');
    expect(operation.baseLength).to.equal(5);
    expect(operation.targetLength).to.equal(8);

    operation.retain(2);
    expect(operation.baseLength).to.equal(7);
    expect(operation.targetLength).to.equal(10);

    operation.remove(2);
    expect(operation.baseLength).to.equal(9);
    expect(operation.targetLength).to.equal(10);
  });

  it('should transform two random text operation', () => {
    const str = TestHelper.randomText(20);

    const a = TestHelper.randomTextPatch(str);
    const b = TestHelper.randomTextPatch(str);

    const primes = TextPatch.transform(a, b);
    const aPrime = primes[0];
    const bPrime = primes[1];

    const abPrime = a.compose(bPrime);
    const baPrime = b.compose(aPrime);
    const afterAbPrime = abPrime.apply(str);
    const afterBaPrime = baPrime.apply(str);
    expect(abPrime).to.deep.equal(baPrime);
    expect(afterAbPrime).to.deep.equal(afterBaPrime);
  });

});
