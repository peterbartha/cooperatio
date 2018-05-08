import { expect } from 'chai';
import 'mocha';
import { TextSelection } from '../../../../src/operations/selection/textSelection';
import { SelectionRange } from '../../../../src/operations/selection/selectionRange';
import { TextPatch } from '../../../../src/operations/text/textPatch';

describe('TextSelection', () => {

  it('should create a selection cursor', () => {
    const cursor = TextSelection.createCursor(7);
    expect(cursor).to.deep.equal(new TextSelection([new SelectionRange(7, 7)]));
  });

  it('should deserialize JSON selection object', () => {
    const selectionObj = {
      ranges: [
        { anchor: 3, head: 7 },
        { anchor: 12, head: 23 },
      ],
    };
    const selection = TextSelection.fromJSON(selectionObj as TextSelection);
    expect(selection).to.be.an.instanceof(TextSelection);
    expect(selection.ranges).to.have.lengthOf(2);
    expect(selection.ranges[0]).to.deep.equal(new SelectionRange(3, 7));
    expect(selection.ranges[1]).to.deep.equal(new SelectionRange(12, 23));
  });

  it('should check selection status', () => {
    let selection = new TextSelection([new SelectionRange(3, 3), new SelectionRange(7, 7)]);
    expect(selection.somethingSelected()).to.be.false;
    selection = new TextSelection([new SelectionRange(3, 7)]);
    expect(selection.somethingSelected()).to.be.true;
  });

  it('should transform selection', () => {
    const selection = new TextSelection([new SelectionRange(3, 7), new SelectionRange(19, 21)]);
    expect(selection
      .transform(new TextPatch()
        .retain(3)
        .insert('lorem')
        .remove(2)
        .retain(42)))
      .to.deep.equal(new TextSelection([new SelectionRange(8, 10), new SelectionRange(22, 24)]));

    expect(selection
      .transform(new TextPatch()
        .remove(45)))
      .to.deep.equal(new TextSelection([new SelectionRange(0, 0), new SelectionRange(0, 0)]));
  });

  it('should transform selection to a cursor', () => {
    const selection = new TextSelection([new SelectionRange(5, 5)]);
    expect(selection
      .transform(new TextPatch()
        .retain(5)
        .insert('lorem')))
      .to.deep.equal(new TextSelection([new SelectionRange(10, 10)]));
  });

  it('should compose a selection range with a cursor', () => {
    const a = new TextSelection([new SelectionRange(3, 7)]);
    const b = TextSelection.createCursor(5);
    expect(a.compose(b)).to.deep.equal(b);
  });

  it('should check equality of compose a selection range with a cursor', () => {
    const a = new TextSelection([new SelectionRange(3, 7)]);
    const b = TextSelection.createCursor(5);
    const composed = a.compose(b);
    expect(composed.equals(b)).to.be.true;
  });

  it('should not equal with different selection', () => {
    const a = new TextSelection([new SelectionRange(3, 7)]);
    const b = new TextSelection([new SelectionRange(3, 7), new SelectionRange(23, 32)]);
    expect(a.equals(b)).to.be.false;
  });

  it('should not equal with different selections', () => {
    const a = new TextSelection([new SelectionRange(2, 5), new SelectionRange(11, 19)]);
    const b = new TextSelection([new SelectionRange(3, 7), new SelectionRange(23, 32)]);
    expect(a.equals(b)).to.be.false;
  });
});
