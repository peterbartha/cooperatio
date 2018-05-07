const deepEqual = require('deep-equal');
import { GetOperation, JsonOperation, PatchPathInfo } from '../operations/json/jsonOperation';
import { JsonPatch } from '../operations/json/jsonPatch';

export namespace Utils {

  export function last<T>(array: T[]): T {
    return array[array.length - 1] as T;
  }

  export function equals(a: any, b: any): boolean {
    return deepEqual(a, b, {
      strict: true,
    });
  }

  export function deepClone<T>(value: T): T | null {
    switch (typeof value) {
      case 'object':
        return JSON.parse(JSON.stringify(value)) as T;
      case 'undefined':
        return null;
      default:
        return value;
    }
  }

  export function getValueByPath(document: any, pointer: string): any {
    if (pointer === '') {
      return document;
    }
    const getOriginalDestination = <GetOperation<any>>{ op: '_get', path: pointer };
    JsonPatch.applyOperation(document, getOriginalDestination);
    return getOriginalDestination.value;
  }

  export function commonLengthOfOpPaths(pathA: string, pathB: string): number | undefined {
    const pathArrA = pathA.split('/');
    const pathArrB = pathB.split('/');
    const lenA = pathArrA.length;
    const lenB = pathArrB.length;

    if (lenA === 0 || lenB === 0) {
      return 0;
    }

    for (let i = 0; i < lenA; i++) {
      if (i >= lenB || pathA[i] !== pathB[i]) {
        return i;
      }
    }
    return lenA;
  }

  export function commonPartOfOpPaths(pathA: string, pathB: string): string | undefined {
    const pathArrA = pathA.split('/');
    const commonLen = commonLengthOfOpPaths(pathA, pathB);
    if (commonLen === undefined) {
      return undefined;
    }
    if (commonLen === 0) {
      return '';
    }
    return pathArrA.splice(0, commonLen).join('/');
  }

  export function isInteger(str: string): boolean {
    let i = 0;
    while (i < str.length) {
      const charCode = str.charCodeAt(i);
      if (charCode >= 48 && charCode <= 57) {
        i++;
        continue;
      }
      return false;
    }
    return true;
  }

  export function containsUndefined<T>(obj: T): boolean {
    if (obj === undefined) {
      return true;
    }
    if (obj && typeof obj === 'object') {
      const iterable = Array.isArray(obj) ? (obj as T[]) : Object.keys(obj);
      for (const elem of iterable) {
        const value = Array.isArray(obj) ? elem : (obj as any)[elem as string];
        if (containsUndefined(value)) {
          return true;
        }
      }
    }
    return false;
  }

  export function replacePathIfHigher(pathA: string, pathB: string, shift: number = -1): string {
    const lastSlash = pathB.lastIndexOf('/');
    const index = pathB.substr(lastSlash+1);
    const arrayPath = pathB.substr(0,lastSlash+1);

    const result = pathA.substr(arrayPath.length);
    let eoindex = result.indexOf('/');
    if (eoindex === -1) {
      eoindex = result.length
    }
    const oldIndex = result.substr(0, eoindex);
    const rest = result.substr(eoindex);
    if (isValidArrayIndex(oldIndex) && ((oldIndex > index && shift < 0) || shift > 0) &&
      oldIndex !== '-' && index !== '-') {
      return arrayPath + (parseInt(oldIndex) + shift) + rest;
    } else {
      return pathA;
    }
  }

  export function isValidArrayIndex(index: string): boolean {
    const n = ~~Number(index);
    return String(n) === index && n >= 0;
  }

  export function operationsOnArray(opA: JsonOperation, opB: JsonOperation): boolean {
    const commonPath = commonPartOfOpPaths(opB.path, opA.path);
    let tailRoot = opA.path.substring(commonPath!.length + 1).split('/')[0];
    if (tailRoot === '') {
      tailRoot = commonPath!.slice(commonPath!.lastIndexOf('/') + 1);
    }
    return isValidArrayIndex(tailRoot);
  }

  export function escapePathComponent(path: string): string {
    if (path.indexOf('/') === -1 && path.indexOf('~') === -1) {
      return path;
    }
    return path.replace(/~/g, '~0').replace(/\//g, '~1');
  }

  export function unescapePathComponent(path: string): string {
    return path.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  export function compareJsonOperationPaths(opA: JsonOperation, opB: JsonOperation): PatchPathInfo {
    const samePath: boolean = opA.path === opB.path;
    const opAIsParent: boolean = opB.path.indexOf(`${opA.path}/`) === 0 && opB.path.length > opA.path.length;
    const opAIsChild: boolean = opA.path.indexOf(`${opB.path}/`) === 0 && opA.path.length > opB.path.length;
    const keepBoth: boolean = !samePath && !opAIsParent && !opAIsChild;
    return {
      samePath,
      opAIsParent,
      opAIsChild,
      keepBoth,
    }
  }
}
