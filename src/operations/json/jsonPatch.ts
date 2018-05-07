import { Patch } from '../patch';
import {
  AddOperation, CopyOperation, JsonOperation, JsonPatchResult, MoveOperation, RemoveOperation,
  ReplaceOperation
} from './jsonOperation';
import { Utils } from '../../utils/utils';
import { OperationValidator, JsonPatchValidator } from './jsonPatchValidator';
import { JsonPatchError } from '../../utils/common';

enum OperationPair {
  A,
  B,
}

export class JsonPatch implements Patch<JsonOperation> {

  public operations: JsonOperation[] = [];

  constructor(operations: JsonOperation[]) {
    this.operations = operations;
  }

  public static fromJSON(operations: JsonOperation[]): JsonPatch {
    return new JsonPatch(operations);
  }

  public toJSON(): JsonOperation[] {
    return this.operations;
  }

  public isNoop(): boolean {
    let isModify = false;
    for (const operation of this.operations) {
      const op = operation.op as any;
      if (op !== '_get' || op !== 'test') {
        isModify = true;
        break;
      }
    }
    return this.operations.length === 0 || !isModify;
  }

  public equals(other: JsonPatch): boolean {
    return Utils.equals(this, other);
  }

  public compose(operationB: JsonPatch): JsonPatch {
    const transformed = JsonPatch.transform(this, operationB);
    return transformed[0];
  }

  public apply<T>(document: T): T | null {
    return JsonPatch.applyPatch(document, this.operations).newDocument;
  }

  public static transform(a: JsonPatch, b: JsonPatch): [JsonPatch, JsonPatch] {
    let patchA = Utils.deepClone(a)!;
    let patchB = Utils.deepClone(b)!;

    const pairA = new JsonPatch(JsonPatch.compareOperations(patchA.operations, patchB.operations, OperationPair.A));
    const pairB = new JsonPatch(JsonPatch.compareOperations(patchA.operations, patchB.operations, OperationPair.B));

    return [pairA, pairB];
  }

  private static compareOperations(patchA: JsonOperation[], patchB: JsonOperation[], side: OperationPair): JsonOperation[] {
    // TODO: basic validation of patches
    let result: JsonOperation[] = [];
    patchA.forEach((opA: JsonOperation) => {
      patchB.forEach((opB: JsonOperation) => {
        let processed: JsonOperation[] = [];

        if (opA.op === 'test' || opB.op === 'test') {
          processed = JsonPatch.transformAgainstTest(opA, opB, side);
        } else if (opA.op === 'remove' || opB.op === 'remove') {
          processed = JsonPatch.transformAgainstRemove(opA, opB, side);
        } else if (opA.op === 'replace' || opB.op === 'replace') {
          processed = JsonPatch.transformAgainstReplace(opA, opB, side);
        } else if (opA.op === 'copy' || opB.op === 'copy') {
          processed = JsonPatch.transformAgainstCopy(opA, opB, side);
        } else if (opA.op === 'add' || opB.op === 'add') {
          processed = JsonPatch.transformAgainstAdd(opA, opB, side);
        } else if (opA.op === 'move' || opB.op === 'move') {
          processed = JsonPatch.transformAgainstMove(opA, opB, side);
        }
        result = result.concat(processed);
      });
    });
    return result;
  }

  private static transformAgainstTest(opA: JsonOperation, opB: JsonOperation, side: OperationPair): JsonOperation[] {
    if (opA.op === 'test' && opB.op === 'test') {
      return [];
    } else if (opA.op === 'test') {
      if (side === OperationPair.A) {
        return [];
      } else {
        return [opA];
      }
    } else {
      if (side === OperationPair.A) {
        return [opB];
      } else {
        return [];
      }
    }
  }

  private static transformAgainstRemove(opA: JsonOperation, opB: JsonOperation, side: OperationPair): JsonOperation[] {
    const { samePath, opAIsParent, opAIsChild, keepBoth } = Utils.compareJsonOperationPaths(opA, opB);
    const opsOnArray = Utils.operationsOnArray(opA, opB);

    if (opA.op === 'remove' && opB.op === 'remove') {
      if ((opAIsParent || keepBoth) && !samePath && side === OperationPair.A) {
        if (keepBoth && opsOnArray) {
          const op = Utils.deepClone(opA)!;
          op.path = Utils.replacePathIfHigher(opA.path, opB.path);
          return [op];
        }
        return [opA];
      } else if ((opAIsChild || keepBoth) && !samePath && side === OperationPair.B) {
        if (keepBoth && opsOnArray) {
          const op = Utils.deepClone(opB)!;
          op.path = Utils.replacePathIfHigher(opB.path, opA.path);
          return [op];
        }
        return [opB];
      }
      return [];
    } else if (opA.op === 'add' || opB.op === 'add') {
      if (opA.op === 'remove' && opB.op === 'add') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [newOp];
            }
            return [opA];
          } else {
            return opsOnArray ? [opB] : [];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp: ReplaceOperation<any> = {
                op: 'replace',
                path: opA.path,
                value: [opB.value],
              };
              return [newOp];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp: AddOperation<any> = {
                op: 'add',
                path: opA.path,
                value: [opB.value],
              };
              return [newOp];
            }
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [newOp];
            }
            return [];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path);
              return [newOp];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path);
              return [newOp];
            }
            return [opB];
          }
        }
      } else if (opA.op === 'add' && opB.op === 'remove') {
        if (samePath) {
          if (side === OperationPair.A) {
            return opsOnArray ? [opA] : [];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [newOp];
            }
            return [opB];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp: AddOperation<any> = {
                op: 'add',
                path: opB.path,
                value: [opA.value],
              };
              return [newOp];
            }
            return [];
          } else {
            if (opsOnArray) {
              const newOp: ReplaceOperation<any> = {
                op: 'replace',
                path: opB.path,
                value: [opA.value],
              };
              return [newOp];
            }
            return [opB];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [newOp];
            }
            return [];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path);
              return [newOp];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path);
              return [newOp];
            }
            return [opB];
          }
        }
      }
    } else if (opA.op === 'replace' || opB.op === 'replace') {
      if (opA.op === 'remove' && opB.op === 'replace') {
        if (samePath) {
          if (side === OperationPair.A) {
            return [];
          } else {
            const newOp: AddOperation<any> = {
              op: 'add',
              path: opB.path,
              value: opB.value,
            };
            return [newOp];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            return [];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path);
              return [newOp];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path);
              return [newOp];
            }
            return [opB];
          }
        }
      } else if (opA.op === 'replace' && opB.op === 'remove') {
        if (samePath) {
          if (side === OperationPair.A) {
            const newOp: AddOperation<any> = {
              op: 'add',
              path: opA.path,
              value: opA.value,
            };
            return [newOp];
          } else {
            return [];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            return [];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path);
              return [newOp];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path);
              return [newOp];
            }
            return [opB];
          }
        }
      }
    } else if ((opA.op === 'move' || opA.op === 'copy') || (opB.op === 'move' || opB.op === 'copy')) {
      if (opA.op === 'remove' && (opB.op === 'copy' || opB.op === 'move')) {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [newOp];
            }
            return [];
          } else {
            if (opsOnArray) {
              return [opB];
            }
            const newOp: AddOperation<any> = {
              op: 'add',
              path: opB.path,
              value: null,
            };
            return [newOp, opB];
          }
        } else if (opB.from.indexOf(`${opA.path}/`) === 0 || opAIsParent) {
          if (side === OperationPair.A) {
            if ((opB.from.indexOf(`${opA.path}/`) === 0 && opAIsParent) || opB.op === 'copy') {
              return [opA];
            }
            const newOp: CopyOperation = {
              op: 'copy',
              from: opB.path,
              path: opB.from,
            };
            return [newOp, opA];
          } else {
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newPath = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              const newOp: RemoveOperation = {
                op: 'remove',
                path: newPath,
              };
              return [newOp];
            }
            return [];
          } else {
            return [opB];
          }
        } else if (opA.path.indexOf(`${opB.from}/`) === 0) {
          if (side === OperationPair.A) {
            const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
            let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;
            const newOp: RemoveOperation = {
              op: 'remove',
              path: newPath,
            };
            return opB.op === 'copy' ? [opA, newOp] : [newOp];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.from = Utils.replacePathIfHigher(opB.from, opA.path);
              return [newOp];
            }
            return [opB];
          }
        }
      } else if ((opA.op === 'move' || opA.op === 'copy') && opB.op === 'remove') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              return [opA];
            }
            const newOp: AddOperation<any> = {
              op: 'add',
              path: opA.path,
              value: null,
            };
            return [newOp, opA];
          } else {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opB)!;
              newOp.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [newOp];
            }
            return [];
          }
        } else if (opA.from.indexOf(`${opB.path}/`) === 0 || opAIsChild) {
          if (side === OperationPair.A) {
            return [];
          } else {
            if (((opA.from.indexOf(`${opB.path}/`) === 0 && opAIsChild) || opA.op === 'copy')) {
              return [opB];
            }
            const newOp: CopyOperation = {
              op: 'copy',
              from: opA.path,
              path: opA.from,
            };
            return [newOp, opB];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const newPath = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              const newOp: RemoveOperation = {
                op: 'remove',
                path: newPath,
              };
              return [newOp];
            }
            return [];
          }
        } else if (opB.path.indexOf(`${opA.from}/`) === 0) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            const commonPath = Utils.commonPartOfOpPaths(opB.path, opA.path);
            let newPath = `${opA.path}/${opB.path.substring(commonPath!.length + 1)}`;
            const newOp: RemoveOperation = {
              op: 'remove',
              path: newPath,
            };
            return opA.op === 'copy' ? [opB, newOp] : [newOp];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const newOp = Utils.deepClone(opA)!;
              newOp.from = Utils.replacePathIfHigher(opA.from, opB.path);
              return [newOp];
            }
            return [opA];
          } else {
            return [opB];
          }
        }
      }
    }
    throw new JsonPatchError('CANNOT_TRANSFORM_UNKNOWN_OPERATION', 'Cannot transform an unknown patch.');
  }

  private static transformAgainstReplace(opA: JsonOperation, opB: JsonOperation, side: OperationPair): JsonOperation[] {
    const { samePath, opAIsParent, opAIsChild, keepBoth } = Utils.compareJsonOperationPaths(opA, opB);
    const opsOnArray = Utils.operationsOnArray(opA, opB);

    if (opA.op === 'replace' && opB.op === 'replace') {
      if ((samePath || opAIsParent || keepBoth) && side === OperationPair.A) {
        return [opA];
      } else if ((opAIsChild || keepBoth) && side === OperationPair.B) {
        return [opB];
      }
      return [];
    } else if (opA.op === 'add' || opB.op === 'add') {
      if (opA.op === 'replace' && opB.op === 'add') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [opA];
          } else {
            return opsOnArray ? [opB] : [];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [opB];
          }
        }
      } else if (opA.op === 'add' && opB.op === 'replace') {
        if (samePath) {
          if (side === OperationPair.A) {
            return opsOnArray ? [opA] : [];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [opB];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            return [];
          } else {
            return [opB];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [opB];
          }
        }
      }
    } else if ((opA.op === 'move' || opA.op === 'copy') || (opB.op === 'move' || opB.op === 'copy')) {
      if (opA.op === 'replace' && (opB.op === 'move' || opB.op === 'copy')) {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [];
          } else {
            return [opB];
          }
        } else if (opB.from.indexOf(`${opA.path}/`) === 0 || opAIsParent) {
          if (side === OperationPair.A) {
            if ((opB.from.indexOf(`${opA.path}/`) === 0 && opAIsParent) || opB.op === 'copy') {
              return [opA];
            }
            const addOp: AddOperation<any> = {
              op: 'add',
              path: opB.from,
              value: null,
            };
            const newOp: MoveOperation = {
              op: 'move',
              path: opB.from,
              from: opB.path,
            };
            return opsOnArray ? [newOp, opA] : [addOp, newOp, opA];
          } else {
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [];
          } else {
            return [opB];
          }
        } else if (opA.path.indexOf(`${opB.from}/`) === 0) {
          if (side === OperationPair.A) {
            const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
            let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;
            const newOp: ReplaceOperation<any> = {
              op: 'replace',
              path: newPath,
              value: opA.value,
            };
            return opB.op === 'copy' ? [opA, newOp] : [newOp];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [opB];
          }
        }
      } else if ((opA.op === 'move' || opA.op === 'copy') && opB.op === 'replace') {
        if (samePath) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [];
          }
        } else if (opA.from.indexOf(`${opB.path}/`) === 0 || opAIsChild) {
          if (side === OperationPair.A) {
            return [];
          } else {
            if ((opA.from.indexOf(`${opB.path}/`) === 0 && opAIsChild) || opA.op === 'copy') {
              return [opB];
            }
            const addOp: AddOperation<any> = {
              op: 'add',
              path: opA.from,
              value: null,
            };
            const newOp: MoveOperation = {
              op: 'move',
              path: opA.from,
              from: opA.path,
            };
            return opsOnArray ? [newOp, opB] : [addOp, newOp, opB];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [];
          }
        } else if (opB.path.indexOf(`${opA.from}/`) === 0) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            const commonPath = Utils.commonPartOfOpPaths(opB.path, opA.path);
            let newPath = `${opA.path}/${opB.path.substring(commonPath!.length + 1)}`;
            const newOp: ReplaceOperation<any> = {
              op: 'replace',
              path: newPath,
              value: opB.value,
            };
            return opA.op === 'copy' ? [opB, newOp] : [newOp];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [opB];
          }
        }
      }
    }
    throw new JsonPatchError('CANNOT_TRANSFORM_UNKNOWN_OPERATION', 'Cannot transform an unknown patch.');
  }

  private static transformAgainstCopy(opA: JsonOperation, opB: JsonOperation, side: OperationPair): JsonOperation[] {
    const { samePath, opAIsParent, opAIsChild } = Utils.compareJsonOperationPaths(opA, opB);
    const opsOnArray = Utils.operationsOnArray(opA, opB);

    if (opA.op === 'copy' && opB.op === 'copy') {
      if (samePath || opB.from.indexOf(`${opA.path}/`) === 0 || opAIsParent) {
        if (samePath && opA.from === opB.from) {
          return [];
        }
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const newOp: RemoveOperation = {
              op: 'remove',
              path: opB.path,
            };
            return [newOp, opA];
          }
          return [opA];
        } else {
          return [];
        }
      } else if (opAIsChild) {
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const op = Utils.deepClone(opA)!;
            op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
            op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
            return [op];
          }
          return [];
        } else {
          return [opB];
        }
      } else if (opA.path.indexOf(`${opB.from}/`) === 0) {
        if (side === OperationPair.A) {
          const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
          let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;
          const newOp: CopyOperation = {
            op: 'copy',
            path: newPath,
            from: opA.from,
          };
          return [opA, newOp];
        } else {
          return [opB];
        }
      } else if (opB.path.indexOf(`${opA.from}/`) === 0) {
        if (side === OperationPair.A) {
          return [opA];
        } else {
          const commonPath = Utils.commonPartOfOpPaths(opB.path, opA.path);
          let newPath = `${opA.path}/${opB.path.substring(commonPath!.length + 1)}`;
          const newOp: CopyOperation = {
            op: 'copy',
            path: newPath,
            from: opB.from,
          };
          return [opB, newOp];
        }
      } else {
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const removeOp: RemoveOperation = {
              op: 'remove',
              path: opB.path,
            };
            return [removeOp, opA];
          }
          return [opA];
        } else {
          return opsOnArray ? [] : [opB];
        }
      }
    } else if (opA.op === 'add' || opB.op === 'add') {
      if (opA.op === 'copy' && opB.op === 'add') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [opA];
          } else {
            return opsOnArray ? [opB] : [];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
              return [op];
            }
            return [];
          } else {
            return [opB];
          }
        } else if (opA.from.indexOf(`${opB.path}/`) === 0) {
          const removeOp: RemoveOperation = {
            op: 'remove',
            path: opA.path,
          };
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
              return [op];
            }
            return [removeOp];
          } else {
            return opsOnArray ? [opB] : [opB, removeOp];
          }
        } else if (opB.path.indexOf(`${opA.from}/`) === 0) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            const commonPath = Utils.commonPartOfOpPaths(opB.path, opA.path);
            let newPath = `${opA.path}/${opB.path.substring(commonPath!.length + 1)}`;
            const newOp: AddOperation<any> = {
              op: 'add',
              path: newPath,
              value: opB.value,
            };
            return [opB, newOp];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [opB];
          }
        }
      } else if (opA.op === 'add' && opB.op === 'copy') {
        if (samePath) {
          if (side === OperationPair.A) {
            return opsOnArray ? [opA] : [];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [opB];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [];
          } else {
            return [opB];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
              return [op];
            }
            return [];
          }
        } else if (opB.from.indexOf(`${opA.path}/`) === 0) {
          const removeOp: RemoveOperation = {
            op: 'remove',
            path: opB.path,
          };
          if (side === OperationPair.A) {
            return opsOnArray ? [opA] : [opA, removeOp];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
              return [op];
            }
            return [removeOp];
          }
        } else if (opA.path.indexOf(`${opB.from}/`) === 0) {
          if (side === OperationPair.A) {
            const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
            let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;
            const newOp: AddOperation<any> = {
              op: 'add',
              path: newPath,
              value: opA.value,
            };
            return [opA, newOp];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            return [opB];
          }
        }
      }
    } else if (opA.op === 'move' || opB.op === 'move') {
      if (opA.op === 'copy' && opB.op === 'move') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray && opA.from === opB.from) {
              const newOp: CopyOperation = {
                op: 'copy',
                path: Utils.replacePathIfHigher(opB.from, opA.path, 1),
                from: opA.path,
              };
              return [newOp];
            }
            return opsOnArray ? [opA] : [];
          } else {
            if (opsOnArray && opA.from === opB.from) {
              return [];
            }
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
              return [op];
            }
            return [opB];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              if (opA.from === opB.from) {
                const newOp: CopyOperation = {
                  op: 'copy',
                  path: Utils.replacePathIfHigher(opB.from, opA.path, 1),
                  from: opA.path,
                };
                return [newOp];
              } else {
                const newOp: CopyOperation = {
                  op: 'copy',
                  path: Utils.replacePathIfHigher(opA.path, opB.path, 1),
                  from: Utils.replacePathIfHigher(opA.from, opB.path, 1),
                };
                return [newOp];
              }
            }
            return [];
          } else {
            if (opsOnArray && opA.from === opB.from) {
              return [];
            }
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
              return [op];
            }
            return [opB];
          }
        } else if (opA.from.indexOf(`${opB.path}/`) === 0 || opAIsParent) {
          if (side === OperationPair.A) {
            if (opAIsParent && opA.from === opB.from) {
              const copyOp: CopyOperation = {
                op: 'copy',
                path: Utils.replacePathIfHigher(opB.path, opA.path, 1),
                from: opA.path,
              };
              const newOp: MoveOperation = {
                op: 'move',
                path: opA.path,
                from: opB.path,
              };
              return opsOnArray ? [newOp, copyOp] : [newOp];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              op.from = Utils.replacePathIfHigher(opB.from, opA.from, 1);
              return [op];
            }
            if (opAIsParent && opA.from === opB.from) {
              const newOp: RemoveOperation = {
                op: 'remove',
                path: opB.from,
              };
              return [newOp];
            } else if (opB.from.indexOf(`${opA.path}/`) === 0 && opAIsParent) {
              if (opsOnArray) {
                const op = Utils.deepClone(opB)!;
                op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
                op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
                return [op];
              }
              return [];
            }
            const newOp: RemoveOperation = {
              op: 'remove',
              path: opB.from,
            };
            return [newOp];
          }
        } else if (opA.path.indexOf(`${opB.from}/`) === 0 && opA.from !== opB.from) {
          if (side === OperationPair.A) {
            const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
            let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;

            if (opsOnArray) {
              const newOp: CopyOperation = {
                op: 'copy',
                path: newPath,
                from: opB.from,
              };
              return [newOp];
            }
            const newOp: CopyOperation = {
              op: 'copy',
              path: newPath,
              from: opA.from,
            };
            return [newOp];
          } else {
            return [opB];
          }
        } else if (opA.from === opB.from) {
          if (side === OperationPair.A) {
            const newOp: CopyOperation = {
              op: 'copy',
              path: opA.path,
              from: opB.path,
            };
            return [newOp];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
              return [op];
            }
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            return opsOnArray ? [] : [opA];
          } else {
            if (opsOnArray) {
              const removeOp: RemoveOperation = {
                op: 'remove',
                path: opA.path,
              };
              return [removeOp, opB];
            }
            return [opB];
          }
        }
      } else if (opA.op === 'move' && opB.op === 'copy') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray && opA.from === opB.from) {
              return [];
            }
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
              return [op];
            }
            return [opA];
          } else {
            if (opsOnArray && opA.from === opB.from) {
              const newOp: CopyOperation = {
                op: 'copy',
                path: Utils.replacePathIfHigher(opA.from, opB.path, 1),
                from: opB.path,
              };
              return [newOp];
            }
            return opsOnArray ? [opB] : [];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            if (opsOnArray && opA.from === opB.from) {
              return [];
            }
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
              return [op];
            }
            return [opA];
          } else {
            if (opsOnArray) {
              if (opA.from === opB.from) {
                const newOp: CopyOperation = {
                  op: 'copy',
                  path: Utils.replacePathIfHigher(opA.from, opB.path, 1),
                  from: opA.path,
                };
                return [newOp];
              } else {
                const newOp: CopyOperation = {
                  op: 'copy',
                  path: Utils.replacePathIfHigher(opB.path, opA.path, 1),
                  from: Utils.replacePathIfHigher(opB.from, opA.path, 1),
                };
                return [newOp];
              }
            }
            return [];
          }
        } else if (opB.from.indexOf(`${opA.path}/`) === 0 || opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              op.from = Utils.replacePathIfHigher(opA.from, opB.from, 1);
              return [op];
            }
            if (opAIsParent && opA.from === opB.from) {
              const newOp: RemoveOperation = {
                op: 'remove',
                path: opA.from,
              };
              return [newOp];
            } else if (opA.from.indexOf(`${opB.path}/`) === 0 && opAIsChild) {
              if (opsOnArray) {
                const op = Utils.deepClone(opA)!;
                op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
                op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
                return [op];
              }
              return [];
            }
            const newOp: RemoveOperation = {
              op: 'remove',
              path: opA.from,
            };
            return [newOp];
          } else {
            if (opAIsChild && opA.from === opB.from) {
              const copyOp: CopyOperation = {
                op: 'copy',
                path: Utils.replacePathIfHigher(opA.path, opB.path, 1),
                from: opB.path,
              };
              const newOp: MoveOperation = {
                op: 'move',
                path: opB.path,
                from: opA.path,
              };
              return opsOnArray ? [newOp, copyOp] : [newOp];
            }
            return [opB];
          }
        } else if (opB.path.indexOf(`${opA.from}/`) === 0 && opA.from !== opB.from) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            const commonPath = Utils.commonPartOfOpPaths(opB.path, opA.path);
            let newPath = `${opA.path}/${opB.path.substring(commonPath!.length + 1)}`;

            if (opsOnArray) {
              const newOp: CopyOperation = {
                op: 'copy',
                path: newPath,
                from: opA.from,
              };
              return [newOp];
            }
            const newOp: CopyOperation = {
              op: 'copy',
              path: newPath,
              from: opB.from,
            };
            return [newOp];
          }
        } else if (opA.from === opB.from) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
              return [op];
            }
            return [opA];
          } else {
            const newOp: CopyOperation = {
              op: 'copy',
              path: opB.path,
              from: opA.path,
            };
            return [newOp];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const removeOp: RemoveOperation = {
                op: 'remove',
                path: opB.path,
              };
              return [removeOp, opA];
            }
            return [opA];
          } else {
            return opsOnArray ? [] : [opB];
          }
        }
      }
    }
    throw new JsonPatchError('CANNOT_TRANSFORM_UNKNOWN_OPERATION', 'Cannot transform an unknown patch.');
  }

  private static transformAgainstAdd(opA: JsonOperation, opB: JsonOperation, side: OperationPair): JsonOperation[] {
    const { samePath, opAIsParent, opAIsChild } = Utils.compareJsonOperationPaths(opA, opB);
    const opsOnArray = Utils.operationsOnArray(opA, opB);

    if (opA.op === 'add' && opB.op === 'add') {
      if (samePath) {
        if (side === OperationPair.A) {
          const newOp: ReplaceOperation<any> = {
            op: 'replace',
            path: opB.path,
            value: opA.value,
          };
          return [newOp];
        } else {
          return [];
        }
      } else if (opAIsParent) {
        if (side === OperationPair.A) {
          return [opA];
        } else {
          if (opsOnArray) {
            const op = Utils.deepClone(opB)!;
            op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
            return [op];
          }
          return [];
        }
      } else if (opAIsChild) {
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const op = Utils.deepClone(opA)!;
            op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
            return [op];
          }
          return [];
        } else {
          return [opB];
        }
      } else {
        const doRemove = opB.path !== Utils.replacePathIfHigher(opB.path, opA.path) ||
          opA.path !== Utils.replacePathIfHigher(opA.path, opB.path);
        if (side === OperationPair.A) {
          return (opsOnArray && doRemove) ? [] : [opA];
        } else {
          if (opsOnArray && doRemove) {
            const removeOp: RemoveOperation = {
              op: 'remove',
              path: opA.path,
            };
            return [removeOp, opB];
          }
          return [opB];
        }
      }
    } else if (opA.op === 'move' || opB.op === 'move') {
      if (opA.op === 'add' && opB.op === 'move') {
        if (samePath) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const redoOp: MoveOperation = {
                op: 'move',
                path: opB.from,
                from: opB.path,
              };
              return [redoOp, opA];
            }
            return [];
          } else {
            return opsOnArray ? [] : [opB];
          }
        } else if (opB.from.indexOf(`${opA.path}/`) === 0 || opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opB.from.indexOf(`${opA.path}/`) === 0 && opAIsParent && !opsOnArray) {
              return [];
            }
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
              return [op];
            }
            const newOp: RemoveOperation = {
              op: 'remove',
              path: opB.from,
            };
            return [newOp];
          }
        } else if (opAIsChild) {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              return [op];
            }
            return [];
          } else {
            return [opB];
          }
        } else if (opA.path.indexOf(`${opB.from}/`) === 0) {
          if (side === OperationPair.A) {
            const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
            let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;
            const newOp: AddOperation<any> = {
              op: 'add',
              path: newPath,
              value: opA.value,
            };
            return [newOp];
          } else {
            return [opB];
          }
        } else {
          if (side === OperationPair.A) {
            return opsOnArray ? [] : [opA];
          } else {
            if (opsOnArray) {
              const removeOp: RemoveOperation = {
                op: 'remove',
                path: opA.path,
              };
              return [removeOp, opB];
            }
            return [opB];
          }
        }
      } else if (opA.op === 'move' && opB.op === 'add') {
        if (samePath) {
          if (side === OperationPair.A) {
            return opsOnArray ? [] : [opA];
          } else {
            if (opsOnArray) {
              const redoOp: MoveOperation = {
                op: 'move',
                path: opA.from,
                from: opA.path,
              };
              return [redoOp, opB];
            }
            return [];
          }
        } else if (opA.from.indexOf(`${opB.path}/`) === 0 || opAIsChild) {
          if (side === OperationPair.A) {
            if (opA.from.indexOf(`${opB.path}/`) === 0 && opAIsChild && !opsOnArray) {
              return [];
            }
            if (opsOnArray) {
              const op = Utils.deepClone(opA)!;
              op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
              op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
              return [op];
            }
            const newOp: RemoveOperation = {
              op: 'remove',
              path: opA.from,
            };
            return [newOp];
          } else {
            return [opB];
          }
        } else if (opAIsParent) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            if (opsOnArray) {
              const op = Utils.deepClone(opB)!;
              op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
              return [op];
            }
            return [];
          }
        } else if (opB.path.indexOf(`${opA.from}/`) === 0) {
          if (side === OperationPair.A) {
            return [opA];
          } else {
            const commonPath = Utils.commonPartOfOpPaths(opB.path, opA.path);
            let newPath = `${opA.path}/${opB.path.substring(commonPath!.length + 1)}`;
            const newOp: AddOperation<any> = {
              op: 'add',
              path: newPath,
              value: opB.value,
            };
            return [newOp];
          }
        } else {
          if (side === OperationPair.A) {
            if (opsOnArray) {
              const removeOp: RemoveOperation = {
                op: 'remove',
                path: opB.path,
              };
              return [removeOp, opA];
            }
            return [opA];
          } else {
            return opsOnArray ? [] : [opB];
          }
        }
      }
    }
    throw new JsonPatchError('CANNOT_TRANSFORM_UNKNOWN_OPERATION', 'Cannot transform an unknown patch.');
  }

  private static transformAgainstMove(opA: JsonOperation, opB: JsonOperation, side: OperationPair): JsonOperation[] {
    const { samePath, opAIsParent, opAIsChild } = Utils.compareJsonOperationPaths(opA, opB);
    const opsOnArray = Utils.operationsOnArray(opA, opB);

    if (opA.op === 'move' && opB.op === 'move') {
      if (samePath) {
        if (opA.from === opB.from) {
          return [];
        }
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const redoOp: MoveOperation = {
              op: 'move',
              path: opB.from,
              from: opB.path,
            };
            return [redoOp, opA];
          }
          const newOp: CopyOperation = {
            op: 'copy',
            path: opB.from,
            from: opB.path,
          };
          return [newOp, opA];
        } else {
          return [];
        }
      } else if (opB.from.indexOf(`${opA.path}/`) === 0 || opAIsParent) {
        if (side === OperationPair.A) {
          if (opB.from.indexOf(`${opA.path}/`) === 0 && opAIsParent) {
            return [opA];
          }
          if (opsOnArray) {
            const op = Utils.deepClone(opA)!;
            op.from = Utils.replacePathIfHigher(opA.from, opB.from);
            return [op];
          }
          const newOp: CopyOperation = {
            op: 'copy',
            path: opB.from,
            from: opB.path,
          };
          return [newOp, opA];
        } else {
          if (opsOnArray) {
            const op = Utils.deepClone(opB)!;
            op.path = Utils.replacePathIfHigher(opB.path, opA.path, 1);
            op.from = Utils.replacePathIfHigher(opB.from, opA.path, 1);
            return [op];
          }
          return [];
        }
      } else if (opAIsChild) {
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const op = Utils.deepClone(opA)!;
            op.path = Utils.replacePathIfHigher(opA.path, opB.path, 1);
            op.from = Utils.replacePathIfHigher(opA.from, opB.path, 1);
            return [op];
          }
          return [];
        } else {
          if (opA.from.indexOf(`${opB.path}/`) === 0 && opAIsChild) {
            return [opA];
          }
          if (opsOnArray) {
            const op = Utils.deepClone(opB)!;
            op.from = Utils.replacePathIfHigher(opB.from, opA.from);
            return [op];
          }
          const newOp: CopyOperation = {
            op: 'copy',
            path: opA.from,
            from: opA.path,
          };
          return [newOp, opB];
        }
      } else if (opA.path.indexOf(`${opB.from}/`) === 0) {
        if (side === OperationPair.A) {
          if (opsOnArray) {
            return [];
          }
          const commonPath = Utils.commonPartOfOpPaths(opA.path, opB.path);
          let newPath = `${opB.path}/${opA.path.substring(commonPath!.length + 1)}`;
          const newOp: MoveOperation = {
            op: 'move',
            path: newPath,
            from: opA.from,
          };
          return [newOp];
        } else {
          if (opsOnArray) {
            const redoOp: MoveOperation = {
              op: 'move',
              path: opA.from,
              from: opA.path,
            };
            return [redoOp, opB];
          }
          return [opB];
        }
      } else {
        if (side === OperationPair.A) {
          if (opsOnArray) {
            const redoOp: MoveOperation = {
              op: 'move',
              path: opB.from,
              from: opB.path,
            };
            return [redoOp, opA];
          }
          return [opA];
        } else {
          return opsOnArray ? [] : [opB];
        }
      }
    }
    throw new JsonPatchError('CANNOT_TRANSFORM_UNKNOWN_OPERATION', 'Cannot transform an unknown patch.');
  }

  public static applyPatch<T>(document: T, patch: JsonOperation[], validateOperation?: boolean): JsonPatchResult<T> {
    if (validateOperation) {
      if (!Array.isArray(patch)) {
        throw new Error('Patch sequence must be an array');
      }
    }
    const results = new Array(patch.length) as any;

    for (let i = 0, length = patch.length; i < length; i++) {
      results[i] = JsonPatch.applyOperation(document, patch[i] as JsonOperation, validateOperation);
      document = results[i].newDocument;
    }
    results.newDocument = document;
    return results;
  }

  public static applyOperation<T>(document: T, operation: JsonOperation, validateOperation: boolean | OperationValidator<T> = true): JsonPatchResult<T> {
    if (validateOperation) {
      if (typeof validateOperation === 'function') {
        validateOperation(operation, document, operation.path);
      } else {
        JsonPatchValidator.validator(operation);
      }
    }

    if (operation.path === '') {
      let returnValue: JsonPatchResult<T> = { newDocument: document };
      if (operation.op === 'add') {
        returnValue.newDocument = operation.value;
        return returnValue;
      } else if (operation.op === 'replace') {
        returnValue.newDocument = operation.value;
        returnValue.removed = document;
        return returnValue;
      }
      else if (operation.op === 'move' || operation.op === 'copy') {
        returnValue.newDocument = Utils.getValueByPath(document, operation.from);
        if (operation.op === 'move') {
          returnValue.removed = document;
        }
        return returnValue;
      } else if (operation.op === 'test') {
        returnValue.test = Utils.equals(document, operation.value);
        if (returnValue.test === false) {
          throw new JsonPatchError('TEST_OPERATION_FAILED', 'Test patch failed');
        }
        returnValue.newDocument = document;
        return returnValue;
      } else if (operation.op === 'remove') {
        returnValue.removed = document;
        returnValue.newDocument = null;
        return returnValue;
      } else if (operation.op === '_get') {
        operation.value = document;
        return returnValue;
      } else {
        if (validateOperation) {
          throw new JsonPatchError('OPERATION_OP_INVALID', 'Operation `op` property is not one of operations defined in RFC-6902');
        } else {
          return returnValue;
        }
      }
    } else {
      const path = operation.path || '';
      const keys = path.split('/');
      let obj = document;
      let t = 1;
      let len = keys.length;
      let existingPathFragment = undefined;
      let key: string | number;
      let validateFunction;
      if (typeof validateOperation === 'function') {
        validateFunction = validateOperation;
      } else {
        validateFunction = JsonPatchValidator.validator;
      }
      while (true) {
        key = keys[t];

        if (validateOperation) {
          if (existingPathFragment === undefined) {
            if ((obj as any)[key] === undefined) {
              existingPathFragment = keys.slice(0, t).join('/');
            }
            else if (t === len - 1) {
              existingPathFragment = operation.path;
            }
            if (existingPathFragment !== undefined) {
              validateFunction(operation, document, existingPathFragment);
            }
          }
        }

        t++;
        if (Array.isArray(obj)) {
          if (key === '-') {
            key = obj.length;
          } else {
            if (validateOperation && !Utils.isInteger(key)) {
              throw new JsonPatchError('OPERATION_PATH_ILLEGAL_ARRAY_INDEX', 'Expected an unsigned base-10 integer value, making the new referenced value the array element with the zero-based index');
            }
            else if (Utils.isInteger(key)) {
              key = ~~key;
            }
          }

          if (t >= len) {
            if (validateOperation && operation.op === 'add' && key > obj.length) {
              throw new JsonPatchError('OPERATION_VALUE_OUT_OF_BOUNDS', 'The specified index MUST NOT be greater than the number of elements in the array');
            }
            const returnValue = JsonPatch.applyOperationOnArray(operation, obj, key as number, document);
            if (returnValue.test === false) {
              throw new JsonPatchError('TEST_OPERATION_FAILED', 'Test patch failed');
            }
            return returnValue;
          }
        } else {
          if (key && key.indexOf('~') != -1) {
            key = Utils.unescapePathComponent(key);
          }

          if (t >= len) {
            const returnValue = JsonPatch.applyOperationOnObject(operation, obj, key, document);
            if (returnValue.test === false) {
              throw new JsonPatchError('TEST_OPERATION_FAILED', 'Test patch failed');
            }
            return returnValue;
          }
        }
        obj = (obj as any)[key];
      }
    }
  }

  private static applyOperationOnObject<T>(operation: JsonOperation, obj: T, key: string | number, document: T) {
    let removed;
    switch (operation.op) {
      case 'remove':
        removed = (obj as any)[key];
        delete (obj as any)[key];
        return { newDocument: document, removed };

      case 'add':
        (obj as any)[key] = operation.value;
        return { newDocument: document };

      case 'replace':
        removed = (obj as any)[key];
        (obj as any)[key] = operation.value;
        return { newDocument: document, removed };

      case 'move':
        const originalValue = JsonPatch.applyOperation(document,
          { op: 'remove', path: operation.from }
        ).removed;
        JsonPatch.applyOperation(
          document,
          { op: 'add', path: operation.path, value: originalValue } as AddOperation<any>,
        );
        return { newDocument: document, removed };

      case 'copy':
        const valueToCopy = Utils.getValueByPath(document, operation.from);
        JsonPatch.applyOperation(
          document,
          { op: 'add', path: operation.path, value: Utils.deepClone(valueToCopy) } as AddOperation<any>,
        );
        return { newDocument: document };

      case 'test':
        return { newDocument: document, test: Utils.equals((obj as any)[key], operation.value) };

      case '_get':
        operation.value = (obj as any)[key];
        return { newDocument: document };
    }
  }

  private static applyOperationOnArray<T>(operation: JsonOperation, arr: T, i: number, document: T): JsonPatchResult<any> {
    switch (operation.op) {
      case 'remove':
        const removedList = (arr as any).splice(i, 1);
        return { newDocument: document, removed: removedList[0] };

      case 'add':
        if (Utils.isInteger(i as any)) {
          (arr as any).splice(i, 0, operation.value);
        } else {
          (arr as any)[i] = operation.value;
        }
        return {
          newDocument: document,
          index: i
        };

      case 'replace':
        const removed = (arr as any)[i];
        (arr as any)[i] = operation.value;
        return {
          newDocument: document,
          removed
        };

      default:
        return this.applyOperationOnObject(operation, arr, i, document);
    }
  }
}
