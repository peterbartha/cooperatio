import * as CodeMirror from 'codemirror';
import { EditorAdapterCallbackHandler } from '../client/editorClient';
import { SelectionRange } from '../operations/selection/selectionRange';
import { TextSelection } from '../operations/selection/textSelection';
import { ColorUtils } from '../utils/color';
import { TextPatch } from '../operations/text/textPatch';
import { Utils } from '../utils/utils';
import { EditorAdapter } from '../client/editorAdapter';

interface CodeMirrorEventHandler {
  blur(instance: CodeMirror.Editor): void;
  change(instance: CodeMirror.Editor, changes: CodeMirror.EditorChangeLinkedList): void;
  changes(instance: CodeMirror.Editor, changes: CodeMirror.EditorChangeLinkedList[]): void;
  cursorActivity(instance: CodeMirror.Editor): void;
  focus(instance: CodeMirror.Editor): void;
}

interface CodeMirrorEditor extends CodeMirror.Editor {
  undo(): void;
  redo(): void;
}

interface CodeMirrorSelectionRange {
  anchor: CodeMirror.Position;
  head: CodeMirror.Position;
}

export class CodeMirrorAdapter implements EditorAdapter {
  private ignoreNextChange = false;
  private changeInProgress = false;
  private selectionChanged = false;
  private codeMirror: CodeMirror.Editor;
  private callbacks: EditorAdapterCallbackHandler | undefined;
  private eventHandler: CodeMirrorEventHandler | undefined;

  constructor(codeMirror: CodeMirror.Editor) {
    this.codeMirror = codeMirror;
    this.attach();
  }

  public registerCallbacks(cb: EditorAdapterCallbackHandler): void {
    this.callbacks = cb;
  }

  public registerUndo(undoFn: () => void): void {
    (this.codeMirror as CodeMirrorEditor).undo = undoFn;
  }

  public registerRedo(redoFn: () => void): void {
    (this.codeMirror as CodeMirrorEditor).redo = redoFn;
  }

  public applyOperation(patch: TextPatch): void {
    this.ignoreNextChange = true;
    this.applyOperationToCodeMirror(patch, this.codeMirror);
  }

  public getValue(): string {
    return this.codeMirror.getValue();
  }

  public getSelection(): TextSelection {
    const selectionList = this.codeMirror.getDoc().listSelections();
    const ranges = [];
    for (const selection of selectionList) {
      ranges.push(new SelectionRange(
        this.codeMirror.getDoc().indexFromPos(selection.anchor),
        this.codeMirror.getDoc().indexFromPos(selection.head),
      ));
    }
    return new TextSelection(ranges);
  }

  public setSelection(selection?: TextSelection): void {
    if (!selection) {
      return;
    }
    const ranges: CodeMirrorSelectionRange[] = [];
    for (const range of selection.ranges) {
      ranges.push({
        anchor: this.codeMirror.getDoc().posFromIndex(range.anchor),
        head: this.codeMirror.getDoc().posFromIndex(range.head),
      });
      this.codeMirror.getDoc().setSelections(ranges);
    }
  }

  public setOtherSelection(selection: TextSelection, color: string, clientId: string): { clear(): void } {
    const selectionObjects: CodeMirror.TextMarker[] = [];
    for (const range of selection.ranges) {
      if (range.isEmpty()) {
        selectionObjects.push(this.setOtherUserCursor(range.head, color, clientId));
      } else {
        selectionObjects.push(this.setOtherUserSelectionRange(range, color));
      }
    }
    return {
      clear: () => {
        for (const selectionObj of selectionObjects) {
          selectionObj.clear();
        }
      },
    };
  }

  public detach(): void {
    if (!this.eventHandler) {
      return;
    }
    this.codeMirror.off('blur', this.eventHandler.blur);
    this.codeMirror.off('change', this.eventHandler.change);
    this.codeMirror.off('changes', this.eventHandler.changes);
    this.codeMirror.off('cursorActivity', this.eventHandler.cursorActivity);
    this.codeMirror.off('focus', this.eventHandler.focus);
  }

  private attach(): void {
    this.eventHandler = {
      blur: (_instance: CodeMirror.Editor) => {
        this.onBlur();
      },
      change: (_instance: CodeMirror.Editor, _changes: CodeMirror.EditorChangeLinkedList) => {
        this.onChange();
      },
      changes: (instance: CodeMirror.Editor, changes: CodeMirror.EditorChangeLinkedList[]) => {
        this.onChanges(instance, changes);
      },
      cursorActivity: (_instance: CodeMirror.Editor) => {
        this.onCursorActivity();
      },
      focus: (_instance: CodeMirror.Editor) => {
        this.onFocus();
      },
    };

    this.codeMirror.on('blur', this.eventHandler.blur);
    this.codeMirror.on('change', this.eventHandler.change);
    this.codeMirror.on('changes', this.eventHandler.changes);
    this.codeMirror.on('cursorActivity', this.eventHandler.cursorActivity);
    this.codeMirror.on('focus', this.eventHandler.focus);
  }

  private comparePositions(a: CodeMirror.Position, b: CodeMirror.Position): number {
    if (a.line < b.line) { return -1; }
    if (a.line > b.line) { return 1; }
    if (a.ch < b.ch) { return -1; }
    if (a.ch > b.ch) { return 1; }
    return 0;
  }

  private posLe(a: CodeMirror.Position, b: CodeMirror.Position): boolean {
    return this.comparePositions(a, b) <= 0;
  }

  private minPos(a: CodeMirror.Position, b: CodeMirror.Position): CodeMirror.Position {
    return this.posLe(a, b) ? a : b;
  }

  private maxPos(a: CodeMirror.Position, b: CodeMirror.Position): CodeMirror.Position {
    return this.posLe(a, b) ? b : a;
  }

  private codemirrorDocLength(doc: CodeMirror.Doc): number {
    return doc.indexFromPos({ line: doc.lastLine(), ch: 0 }) +
      doc.getLine(doc.lastLine()).length;
  }

  private constructOperationFromChanges(doc: CodeMirror.Doc, changes: CodeMirror.EditorChange[]): { patch: TextPatch; inversePatch: TextPatch} {
    let docEndLength = this.codemirrorDocLength(doc);
    let patch = new TextPatch().retain(docEndLength);
    let inversePatch = new TextPatch().retain(docEndLength);

    let indexFromPos = (pos: CodeMirror.Position) => doc.indexFromPos(pos);

    function sumLengths(strArr: string[]): number {
      if (strArr.length === 0) {
        return 0;
      }
      let sum = 0;
      for (const str of strArr) {
        sum += str.length;
      }
      return sum + strArr.length - 1;
    }

    const updateIndexFromPos = (indexFromPosFn: (pos: CodeMirror.Position) => number, change: CodeMirror.EditorChange) =>
      (pos: CodeMirror.Position) => {
        if (this.posLe(pos, change.from)) {
          return indexFromPosFn(pos);
        }
        if (this.posLe(change.to, pos)) {
          return indexFromPosFn({
            ch: (change.to.line < pos.line) ?
              pos.ch :
              (change.text.length <= 1) ?
                pos.ch - (change.to.ch - change.from.ch) + sumLengths(change.text) :
                pos.ch - change.to.ch + Utils.last(change.text).length,
            line: pos.line + change.text.length - 1 - (change.to.line - change.from.line),
          }) + sumLengths(change.removed) - sumLengths(change.text);
        }
        if (change.from.line === pos.line) {
          return indexFromPosFn(change.from) + pos.ch - change.from.ch;
        }
        return indexFromPosFn(change.from) +
          sumLengths(change.removed.slice(0, pos.line - change.from.line)) +
          1 + pos.ch;
    };

    for (let i = changes.length - 1; i >= 0; i--) {
      const change = changes[i];
      indexFromPos = updateIndexFromPos(indexFromPos, change);

      const fromIndex = indexFromPos(change.from);
      const restLength = docEndLength - fromIndex - sumLengths(change.text);

      patch = new TextPatch()
        .retain(fromIndex)
        .remove(sumLengths(change.removed))
        .insert(change.text.join('\n'))
        .retain(restLength)
        .compose(patch);

      inversePatch = inversePatch.compose(new TextPatch()
        .retain(fromIndex)
        .remove(sumLengths(change.text))
        .insert(change.removed.join('\n'))
        .retain(restLength),
      );

      docEndLength += sumLengths(change.removed) - sumLengths(change.text);
    }

    return {
      patch,
      inversePatch,
    };
  }

  private applyOperationToCodeMirror(patch: TextPatch, cm: CodeMirror.Editor): void {
    cm.operation(() => {
      const operations = patch.operations;
      let index = 0;
      operations.forEach((op: any) => {
        if (TextPatch.isRetain(op)) {
          index += op;
        } else if (TextPatch.isInsert(op)) {
          cm.getDoc().replaceRange(op, cm.getDoc().posFromIndex(index));
          index += op.length;
        } else if (TextPatch.isDelete(op)) {
          const from = cm.getDoc().posFromIndex(index);
          const to = cm.getDoc().posFromIndex(index - op);
          cm.getDoc().replaceRange('', from, to);
        }
      });
    });
  }

  private onChange(): void {
    this.changeInProgress = true;
  }

  private onChanges(_: CodeMirror.Editor, changes: CodeMirror.EditorChangeLinkedList[]): void {
    if (!this.callbacks) {
      return;
    }
    if (!this.ignoreNextChange) {
      const { patch, inversePatch } = this.constructOperationFromChanges(this.codeMirror.getDoc(), changes);
      this.callbacks.change(patch, inversePatch);
    }
    if (this.selectionChanged) {
      this.callbacks.selectionChange();
    }
    this.changeInProgress = false;
    this.ignoreNextChange = false;
  }

  private onCursorActivity(): void {
    if (!this.callbacks) {
      return;
    }
    if (this.changeInProgress) {
      this.selectionChanged = true;
    } else {
      this.callbacks.selectionChange();
    }
  }

  private onFocus(): void {
    if (!this.callbacks) {
      return;
    }
    if (this.changeInProgress) {
      this.selectionChanged = true;
    } else {
      this.callbacks.selectionChange();
    }
  }

  private onBlur(): void {
    if (!this.callbacks) {
      return;
    }
    if (!this.codeMirror.getDoc().somethingSelected()) {
      this.callbacks.blur();
    }
  }

  private addStyleRule(): ((css: string) => void) {
    const added: { [propertyName: string]: boolean } = {};
    const styleElement = document.createElement('style');
    document.documentElement.getElementsByTagName('head')[0].appendChild(styleElement);
    const styleSheet = styleElement.sheet as CSSStyleSheet;

    return (css: string) => {
      if (added[css]) {
        return;
      }
      added[css] = true;
      styleSheet.insertRule(css, (styleSheet.cssRules || styleSheet.rules).length);
    };
  }

  private setOtherUserCursor(position: number, color: string, clientId: string): CodeMirror.TextMarker {
    const cursorPos = this.codeMirror.getDoc().posFromIndex(position);
    const cursorCoords = this.codeMirror.cursorCoords(cursorPos);
    const cursorEl = document.createElement('span');
    cursorEl.className = 'other-client';
    cursorEl.style.display = 'inline-block';
    cursorEl.style.padding = '0';
    cursorEl.style.marginLeft = cursorEl.style.marginRight = '-1px';
    cursorEl.style.borderLeftWidth = '2px';
    cursorEl.style.borderLeftStyle = 'solid';
    cursorEl.style.borderLeftColor = color;
    cursorEl.style.height = `${(cursorCoords.bottom - cursorCoords.top) * 0.9}px`;
    cursorEl.style.zIndex = '0';
    cursorEl.setAttribute('data-clientid', clientId);
    return this.codeMirror.getDoc().setBookmark(cursorPos, { widget: cursorEl, insertLeft: true });
  }

  private setOtherUserSelectionRange(range: SelectionRange, color: string): CodeMirror.TextMarker  {
    const match = ColorUtils.rgbValidation(color);
    const selectionClassName = `selection-${match[1]}`;
    const rule = `.${selectionClassName} { background: ${color}; }`;
    this.addStyleRule()(rule);

    const anchorPos = this.codeMirror.getDoc().posFromIndex(range.anchor);
    const headPos = this.codeMirror.getDoc().posFromIndex(range.head);

    return this.codeMirror.getDoc().markText(
      this.minPos(anchorPos, headPos),
      this.maxPos(anchorPos, headPos),
      { className: selectionClassName },
    );
  }
}
