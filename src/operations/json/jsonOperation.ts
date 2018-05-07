export type OperationTypes = 'test' | 'remove' | 'add' | 'replace' | 'move' | 'copy' | '_get';

export const JsonOperationTypes: { [key: string]: OperationTypes } = {
  'test': 'test',
  'remove': 'remove',
  'add': 'add',
  'replace': 'replace',
  'move': 'move',
  'copy': 'copy',
  '_get': '_get',
};

export interface BaseJsonOperation {
  op: OperationTypes;
  path: string;
}

export interface TestOperation<T> extends BaseJsonOperation {
  op: 'test';
  value: T;
}

export interface RemoveOperation extends BaseJsonOperation {
  op: 'remove';
}

export interface AddOperation<T> extends BaseJsonOperation {
  op: 'add';
  value: T;
}

export interface ReplaceOperation<T> extends BaseJsonOperation {
  op: 'replace';
  value: T;
}

export interface MoveOperation extends BaseJsonOperation {
  op: 'move';
  from: string;
}

export interface CopyOperation extends BaseJsonOperation {
  op: 'copy';
  from: string;
}

export interface GetOperation<T> extends BaseJsonOperation {
  op: '_get';
  value: T;
}

export type JsonOperation =
  AddOperation<any> |
  RemoveOperation |
  ReplaceOperation<any> |
  MoveOperation |
  CopyOperation |
  TestOperation<any> |
  GetOperation<any>;

export interface JsonPatchResult<T> {
  newDocument: T | null;
  index?: any,
  removed?: any,
  test?: boolean,
}

export interface PatchPathInfo {
  samePath: boolean;
  opAIsParent: boolean;
  opAIsChild: boolean;
  keepBoth: boolean;
}
