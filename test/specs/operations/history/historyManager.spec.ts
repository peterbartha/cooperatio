import { expect } from 'chai';
import 'mocha';
import { HistoryManager } from '../../../../src/operations/history/historyManager';
import { ExtendedPatch } from '../../../../src/operations/extendedPatch';
import { TextPatch } from '../../../../src/operations/text/textPatch';
import { Utils } from '../../../../src/utils/utils';
import { TestHelper } from '../../../testHelper';

class Editor {
  public doc: any;
  public history: HistoryManager;
  public undo: () => void = () => {};
  public redo: () => void = () => {};

  constructor(doc: string) {
    this.doc = doc;
    this.history = new HistoryManager();
  }

  public doEdit(patch: TextPatch, doNotCompose: boolean = false): void {
    const compose = !doNotCompose && this.history.undoStack.length > 0 &&
      (Utils.last<ExtendedPatch>(this.history.undoStack).wrapped as TextPatch)
        .invert(this.doc)
        .shouldBeComposedWith(patch);
    const extendedOperation = new ExtendedPatch(patch);
    this.history.add(extendedOperation.invert(this.doc), compose);
    this.doc = patch.apply(this.doc);
  }

  public serverEdit(patch: TextPatch): void {
    this.doc = patch.apply(this.doc);
    const extendedOperation = new ExtendedPatch(patch);
    this.history.transform(extendedOperation);
  }
}

describe('HistoryManager', () => {

  const editor = new Editor('Looremipsum');

  before(() => {
    editor.undo = () => {
      expect(editor.history.isUndoing()).to.be.false;
      editor.history.performUndo((extendedPatch: ExtendedPatch) => {
        expect(editor.history.isUndoing()).to.be.true;
        editor.doEdit(extendedPatch.wrapped as TextPatch);
      });
      expect(editor.history.isUndoing()).to.be.false;
    };

    editor.redo = () => {
      expect(editor.history.isRedoing()).to.be.false;
      editor.history.performRedo((extendedPatch: ExtendedPatch) => {
        expect(editor.history.isRedoing()).to.be.true;
        editor.doEdit(extendedPatch.wrapped as TextPatch);
      });
      expect(editor.history.isRedoing()).to.be.false;
    };
  });

  it('should apply operations and undo/redo changes', () => {
    expect(editor.history.canUndo()).to.be.false;
    expect(editor.history.canRedo()).to.be.false;

    editor.doEdit(
      new TextPatch()
        .retain(2)
        .remove(1)
        .retain(8));
    expect(editor.doc).to.be.equal('Loremipsum');

    expect(editor.history.canUndo()).to.be.true;
    expect(editor.history.canRedo()).to.be.false;

    editor.doEdit(
      new TextPatch()
        .retain(5)
        .insert(' ')
        .retain(5));
    expect(editor.doc).to.be.equal('Lorem ipsum');

    editor.serverEdit(
      new TextPatch()
        .retain(6)
        .remove(1)
        .insert('I')
        .retain(4));
    expect(editor.doc).to.be.equal('Lorem Ipsum');

    editor.undo();
    expect(editor.doc).to.be.equal('LoremIpsum');

    expect(editor.history.canUndo()).to.be.true;
    expect(editor.history.canRedo()).to.be.true;

    expect(editor.history.undoStack).to.have.lengthOf(1);
    expect(editor.history.redoStack).to.have.lengthOf(1);

    editor.undo();
    expect(editor.history.canUndo()).to.be.false;
    expect(editor.history.canRedo()).to.be.true;
    expect(editor.doc).to.be.equal('LooremIpsum');

    editor.redo();
    expect(editor.doc).to.be.equal('LoremIpsum');

    editor.doEdit(
      new TextPatch()
        .retain(10)
        .insert('D'));
    expect(editor.doc).to.be.equal('LoremIpsumD');
    expect(editor.history.canRedo()).to.be.false;

    editor.doEdit(
      new TextPatch()
        .retain(11)
        .insert('o'));
    editor.doEdit(new TextPatch()
      .retain(12)
      .insert('l'));
    editor.undo();
    expect(editor.doc).to.be.equal('LoremIpsum');

    editor.redo();
    expect(editor.doc).to.be.equal('LoremIpsumDol');
    editor.doEdit(
      new TextPatch()
        .retain(13)
        .insert('o'));
    editor.undo();
    expect(editor.doc).to.be.equal('LoremIpsumDol');

    editor.doEdit(
      new TextPatch()
        .retain(13)
        .insert('o'));
    editor.doEdit(
      new TextPatch()
        .retain(14)
        .insert('r'),
      true);
    editor.undo();
    expect(editor.doc).to.be.equal('LoremIpsumDolo');

    expect(editor.history.canRedo()).to.be.true;
    editor.serverEdit(
      new TextPatch()
        .retain(10)
        .remove(4));
    editor.redo();
    expect(editor.doc).to.be.equal('LoremIpsumr');

    editor.undo();
    editor.undo();
    expect(editor.doc).to.be.equal('LooremIpsum');
  });

  it('should limit history depth', () => {
    const history = new HistoryManager(42);
    let doc = TestHelper.randomText(50);
    let operation: ExtendedPatch;

    for (let i = 0; i < 100; i++) {
      operation = new ExtendedPatch(TestHelper.randomTextPatch(doc));
      doc = operation.apply(doc);
      history.add(operation);
    }
    expect(history.undoStack).to.have.lengthOf(42);
  });

  it('should throw an error if undo does not possible', () => {
    editor.history = new HistoryManager(0);
    expect(editor.history.undoStack).to.have.lengthOf(0);
    expect(editor.history.redoStack).to.have.lengthOf(0);
    expect(editor.undo).to.throw(Error, /Undo not possible/);
  });

  it('should throw an error if redo does not possible', () => {
    editor.history = new HistoryManager(0);
    expect(editor.history.undoStack).to.have.lengthOf(0);
    expect(editor.history.redoStack).to.have.lengthOf(0);
    expect(editor.redo).to.throw(Error, /Redo not possible/);
  });

});
