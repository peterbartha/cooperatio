export interface TextOperation {
  apply(document: string): string;

  equals(other: TextOperation): boolean;

  toString(): string;
}
