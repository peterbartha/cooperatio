import { Utils } from '../../utils/utils';
import { JsonOperation, JsonOperationTypes } from './jsonOperation';
import { JsonPatchError } from '../../utils/common';
import { JsonPatch } from './jsonPatch';

export interface OperationValidator<T> {
  (operation: JsonOperation, document: T, existingPathFragment: string): void;
}

export namespace JsonPatchValidator {

  export function validate<T>(sequence: JsonOperation[], document?: T): Error | void {
    try {
      if (!Array.isArray(sequence)) {
        throw new JsonPatchError('SEQUENCE_NOT_AN_ARRAY', 'Patch sequence must be an array');
      }
      if (document) {
        JsonPatch.applyPatch(Utils.deepClone(document), Utils.deepClone(sequence)!, true);
      } else {
        for (let i = 0; i < sequence.length; i++) {
          validator(sequence[i], document, undefined);
        }
      }
    } catch (e) {
      if (e instanceof JsonPatchError) {
        return e;
      } else {
        throw e;
      }
    }
  }

  export function validator(operation: JsonOperation, document?: any, existingPathFragment?: string): void {

    if (typeof operation !== 'object' || operation === null || Array.isArray(operation)) {
      throw new JsonPatchError('OPERATION_NOT_AN_OBJECT', 'Operation is not an object');
    }

    else if (!JsonOperationTypes[operation.op]) {
      throw new JsonPatchError('OPERATION_OP_INVALID', 'Operation `op` property is not one of operations defined in RFC-6902');
    }

    else if (typeof operation.path !== 'string') {
      throw new JsonPatchError('OPERATION_PATH_INVALID','Operation `path` property is not a string');
    }

    else if (operation.path.indexOf('/') !== 0 && operation.path.length > 0) {
      throw new JsonPatchError('OPERATION_PATH_INVALID', 'Operation `path` property must start with \'/\'');
    }

    else if ((operation.op === 'move' || operation.op === 'copy') && typeof operation.from !== 'string') {
      throw new JsonPatchError('OPERATION_FROM_REQUIRED', 'Operation `from` property is not present');
    }

    else if ((operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') && operation.value === undefined) {
      throw new JsonPatchError('OPERATION_VALUE_REQUIRED', 'Operation `value` property is not present');
    }

    else if ((operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') && Utils.containsUndefined(operation.value)) {
      throw new JsonPatchError('OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED', 'Operation `value` property is not present');
    }

    else if (document) {
      if (operation.op === 'add') {
        const pathLen = operation.path.split('/').length;
        const existingPathLen = existingPathFragment!.split('/').length;
        if (pathLen !== existingPathLen + 1 && pathLen !== existingPathLen) {
          throw new JsonPatchError('OPERATION_PATH_CANNOT_ADD', 'Cannot perform an `add` patch at the desired path');
        }
      }
      else if (operation.op === 'replace' || operation.op === 'remove' || (<any>operation.op) === '_get') {
        if (operation.path !== existingPathFragment) {
          throw new JsonPatchError('OPERATION_PATH_UNRESOLVABLE', 'Cannot perform the patch at a path that does not exist');
        }
      }
      else if (operation.op === 'move' || operation.op === 'copy') {
        const existingValue: any = { op: '_get', path: operation.from, value: undefined };
        const error = validate([existingValue], document);
        if (error && (error as JsonPatchError).type === 'OPERATION_PATH_UNRESOLVABLE') {
          throw new JsonPatchError('OPERATION_FROM_UNRESOLVABLE', 'Cannot perform the patch from a path that does not exist');
        }
      }
    }
  }
}
