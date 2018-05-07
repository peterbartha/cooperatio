import { ExtendedPatch } from '../extendedOperation';
import { HistoryState } from './historyState';

export class HistoryManager {
  public undoStack: ExtendedPatch[];
  public redoStack: ExtendedPatch[];
  private maxItems: number;
  private state: HistoryState;
  private isComposable: boolean;

  private static transformStack(stack: ExtendedPatch[], extendedPatch: ExtendedPatch): ExtendedPatch[] {
    const newStack = [];
    for (let i = stack.length - 1; i >= 0; i--) {
      const pair = ExtendedPatch.transform(stack[i], extendedPatch);
      if (!pair[0].wrapped.isNoop()) {
        newStack.push(pair[0]);
      }
      extendedPatch = pair[1];
    }
    return newStack.reverse();
  }

  constructor(maxItems: number = 25) {
    this.maxItems = maxItems;
    this.state = HistoryState.Normal;
    this.isComposable = true;
    this.undoStack = [];
    this.redoStack = [];
  }

  public transform(extendedPatch: ExtendedPatch): void {
    this.undoStack = HistoryManager.transformStack(this.undoStack, extendedPatch);
    this.redoStack = HistoryManager.transformStack(this.redoStack, extendedPatch);
  }

  public add(extendedPatch: ExtendedPatch, compose: boolean = false): void {
    if (this.isUndoing()) {
      this.redoStack.push(extendedPatch);
      this.isComposable = false;
    } else if (this.isRedoing()) {
      this.undoStack.push(extendedPatch);
      this.isComposable = false;
    } else {
      const undoStack = this.undoStack;
      if (this.isComposable && compose && undoStack.length > 0) {
        undoStack.push(extendedPatch.compose(undoStack.pop()!));
      } else {
        undoStack.push(extendedPatch);
        if (undoStack.length > this.maxItems) {
          undoStack.shift();
        }
      }
      this.isComposable = true;
      this.redoStack = [];
    }
  }

  public performUndo(fn: (elem: any) => void): void {
    this.state = HistoryState.Undoing;
    if (this.undoStack.length === 0) {
      throw new Error('Undo not possible.');
    }
    fn(this.undoStack.pop());
    this.state = HistoryState.Normal;
  }

  public performRedo(fn: (elem: any) => void): void {
    this.state = HistoryState.Redoing;
    if (this.redoStack.length === 0) {
      throw new Error('Redo not possible.');
    }
    fn(this.redoStack.pop());
    this.state = HistoryState.Normal;
  }

  public canUndo(): boolean {
    return this.undoStack.length !== 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length !== 0;
  }

  public isUndoing(): boolean {
    return this.state === HistoryState.Undoing;
  }

  public isRedoing(): boolean {
    return this.state === HistoryState.Redoing;
  }
}
