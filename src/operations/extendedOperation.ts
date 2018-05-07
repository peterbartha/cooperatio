import { ClientSelectionMetaInfo } from './selection/clientSelectionMetaInfo';
import { TextSelection } from './selection/textSelection';
import { TextPatch } from './text/textPatch';
import { JsonPatch } from './json/jsonPatch';
import { Composable, Invertible, Transformable } from '../utils/common';

export type ExtendedPatchMeta = ClientSelectionMetaInfo | TextSelection | Transformable<any> | undefined;

export class ExtendedPatch {
  public wrapped: TextPatch | JsonPatch;
  public meta: ExtendedPatchMeta;

  public static transformMeta(meta: ExtendedPatchMeta, patch: TextPatch | JsonPatch): ExtendedPatchMeta {
    if (meta && typeof meta === 'object' && typeof meta.transform === 'function' && patch instanceof TextPatch &&
      (meta instanceof ClientSelectionMetaInfo || meta instanceof TextSelection)) {
      return meta.transform(patch);
    }
    return meta;
  }

  public static transform(a: ExtendedPatch, b: ExtendedPatch): [ExtendedPatch, ExtendedPatch] {
    let pair: TextPatch[] | JsonPatch[] = [];
    if (a.wrapped instanceof TextPatch && b.wrapped instanceof TextPatch) {
      pair = TextPatch.transform(a.wrapped, b.wrapped);
    } else if (a.wrapped instanceof JsonPatch && b.wrapped instanceof JsonPatch) {
      pair = JsonPatch.transform(a.wrapped, b.wrapped);
    }
    return [
      new ExtendedPatch(pair[0], ExtendedPatch.transformMeta(a.meta, b.wrapped)),
      new ExtendedPatch(pair[1], ExtendedPatch.transformMeta(b.meta, a.wrapped)),
    ];
  }

  constructor(patch: TextPatch | JsonPatch, meta?: ExtendedPatchMeta) {
    this.wrapped = patch;
    this.meta = meta;
  }

  public apply(document: any): any {
    return (this.wrapped as any).apply(document);
  }

  public invert(document: string): ExtendedPatch {
    if (this.wrapped instanceof TextPatch) {
      const inverted = this.wrapped.invert(document);
      let meta = this.meta;
      if (this.meta && typeof this.meta === 'object' && typeof (this.meta as Invertible<any>).invert === 'function') {
        meta = (this.meta as Invertible<any>).invert();
      }
      return new ExtendedPatch(inverted, meta);
    }
    // TODO
    throw new Error('Json patch invert does not supported yet.')
  }

  public compose(other: ExtendedPatch): ExtendedPatch {
    const patch = (this.wrapped as any).compose(other.wrapped);
    const meta = this.composeMeta(this.meta!, other.meta!);
    return new ExtendedPatch(patch, meta);
  }

  private static copy(source: any, target: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
  }

  private composeMeta(a: ExtendedPatchMeta, b: ExtendedPatchMeta): ExtendedPatchMeta {
    if (a && typeof a === 'object') {
      if (typeof (a as Composable<any>).compose === 'function') {
        return (a as Composable<any>).compose(b);
      }
      const meta = {};
      ExtendedPatch.copy(a, meta);
      ExtendedPatch.copy(b, meta);
      return meta as ExtendedPatchMeta;
    }
    return b;
  }
}
