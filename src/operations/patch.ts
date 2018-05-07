import { TextPatch } from './text/textPatch';
import { JsonPatch } from './json/jsonPatch';

export interface Patch<T> {
  operations: T[];

  apply(document: any): any;

  toJSON(): any;

  isNoop(): boolean;

  equals(other: TextPatch | JsonPatch): boolean;

  toString(): string;

  compose(operationB: TextPatch | JsonPatch): TextPatch | JsonPatch;
}

