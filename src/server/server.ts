import { ExtendedPatch } from '../operations/extendedOperation';

export class Server {
  protected document: string;
  protected operations: ExtendedPatch[];

  constructor(document: string, operations: ExtendedPatch[] = []) {
    this.document = document;
    this.operations = operations;
  }

  protected receiveOperation(revision: number, extendedPatch: ExtendedPatch): ExtendedPatch {
    if (revision < 0 || this.operations.length < revision) {
      throw new Error('Operation revision not in history.');
    }

    const concurrentOperations = this.operations.slice(revision);
    for (const concurrentOp of concurrentOperations) {
      extendedPatch = ExtendedPatch.transform(extendedPatch, concurrentOp)[0];
    }

    this.document = extendedPatch.apply(this.document) as string;
    this.operations.push(extendedPatch);
    return extendedPatch;
  }
}
