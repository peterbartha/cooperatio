import { TextPatch } from '../operations/text/textPatch';
import { JsonPatch } from '../operations/json/jsonPatch';

export interface Transformable<T> {
  transform(other: TextPatch | JsonPatch): T;
  compose(other: T): T;
}

export interface Invertible<T> {
  invert(): T;
}

export interface Composable<T> {
  compose(other: T): T;
}

export type JsonPatchErrorType =
  'SEQUENCE_NOT_AN_ARRAY' |
  'OPERATION_NOT_AN_OBJECT' |
  'OPERATION_OP_INVALID' |
  'OPERATION_PATH_INVALID' |
  'OPERATION_FROM_REQUIRED' |
  'OPERATION_VALUE_REQUIRED' |
  'OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED' |
  'OPERATION_PATH_CANNOT_ADD' |
  'OPERATION_PATH_UNRESOLVABLE' |
  'OPERATION_FROM_UNRESOLVABLE' |
  'OPERATION_PATH_ILLEGAL_ARRAY_INDEX' |
  'OPERATION_VALUE_OUT_OF_BOUNDS' |
  'TEST_OPERATION_FAILED' |
  'CANNOT_TRANSFORM_UNKNOWN_OPERATION' |
  'CANNOT_DEFINE_SELECTION_ON_COMPLEX_OBJECTS';

export class JsonPatchError extends Error {

  constructor(public type: JsonPatchErrorType, public message: string) {
    super(message);
  }

}
