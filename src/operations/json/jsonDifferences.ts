import { Utils } from '../../utils/utils';
import { AddOperation, JsonOperation, ReplaceOperation } from './jsonOperation';

export namespace JsonDifferences {

  export function compare(tree1: any, tree2: any): JsonOperation[] {
    let patches: JsonOperation[] = [];
    generate(tree1, tree2, patches, '');
    return patches;
  }

  function generate(objA: any, objB: any, patches: JsonOperation[], path: string): void {
    if (objB === objA) {
      return;
    }
    if (typeof objB.toJSON === 'function') {
      objB = objB.toJSON();
    }

    const newKeys = Object.keys(objB);
    const oldKeys = Object.keys(objA);
    let deleted = false;

    for (let t = oldKeys.length - 1; t >= 0; t--) {
      const key = oldKeys[t];
      const oldVal = objA[key];
      if (Object.prototype.hasOwnProperty.call(objB, key) && !(objB[key] === undefined && oldVal !== undefined && Array.isArray(objB) === false)) {
        const newVal = objB[key];
        if (typeof oldVal === 'object' && oldVal != null && typeof newVal === 'object' && newVal != null) {
          generate(oldVal, newVal, patches, `${path}/${Utils.escapePathComponent(key)}`);
        }
        else {
          if (oldVal !== newVal) {
            patches.push({
              op: 'replace',
              path: `${path}/${Utils.escapePathComponent(key)}`,
              value: Utils.deepClone(newVal),
            } as ReplaceOperation<any>);
          }
        }
      }
      else {
        patches.push({
          op: 'remove',
          path: `${path}/${Utils.escapePathComponent(key)}`,
        });
        deleted = true;
      }
    }

    if (!deleted && newKeys.length === oldKeys.length) {
      return;
    }

    for (let t = 0; t < newKeys.length; t++) {
      const key = newKeys[t];
      if (!Object.prototype.hasOwnProperty.call(objA, key) && objB[key] !== undefined) {
        patches.push({
          op: 'add',
          path: `${path}/${Utils.escapePathComponent(key)}`,
          value: Utils.deepClone(objB[key]),
        } as AddOperation<any>);
      }
    }
  }

}
