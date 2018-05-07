import { TextOperation } from '../textOperation';

export class Insert implements TextOperation {
  public str: string;
  public position: number;

  constructor(str: string, position: number) {
    this.str = str;
    this.position = position;
  }

  public apply(document: string): string {
    return document.slice(0, this.position) + this.str + document.slice(this.position);
  }

  public equals(other: TextOperation): boolean {
    return other instanceof Insert && this.str === other.str && this.position === other.position;
  }

  public toString(): string {
    return `Insert(${JSON.stringify(this.str)}, ${this.position})`;
  }
}
