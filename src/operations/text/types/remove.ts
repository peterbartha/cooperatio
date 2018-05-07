import { TextOperation } from '../textOperation';

export class Remove implements TextOperation {
  public count: number;
  public position: number;

  constructor(count: number, position: number) {
    this.count = count;
    this.position = position;
  }

  public apply(document: string): string {
    return document.slice(0, this.position) + document.slice(this.position + this.count);
  }

  public equals(other: TextOperation): boolean {
    return other instanceof Remove && this.count === other.count && this.position === other.position;
  }

  public toString(): string {
    return `Remove(${this.count}, ${this.position})`;
  }
}
