import { TextOperation } from '../textOperation';

export class Noop implements TextOperation {

  private static instance: Noop;

  public static getInstance(): Noop {
    if (!Noop.instance) {
      Noop.instance = new Noop();
    }
    return Noop.instance;
  }

  public apply(document: string): string {
    return document;
  }

  public equals(other: TextOperation): boolean {
    return other instanceof Noop;
  }

  public toString(): string {
    return 'Noop()';
  }

  private constructor() { }
}
