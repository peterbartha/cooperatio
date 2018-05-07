import { TextSelection } from '../operations/selection/textSelection';
import { EditorClient } from './editorClient';
import { EditorAdapter } from './editorAdapter';
import { ColorUtils } from '../utils/color';

export class RemoteClient {
  private id: string;
  private listEl: HTMLElement;
  private li: HTMLElement;
  private editorAdapter: EditorAdapter;
  private name: string;
  private color: string | undefined;
  private lightColor: string | undefined;
  private mark: { clear(): void } | undefined;
  public selection: TextSelection | undefined;

  constructor(id: string, listEl: HTMLElement, editorAdapter: EditorAdapter, name: string = '', selection?: TextSelection) {
    this.id = id;
    this.listEl = listEl;
    this.editorAdapter = editorAdapter;
    this.name = name;

    this.li = document.createElement('li');
    if (name) {
      this.li.textContent = name;
      this.listEl.appendChild(this.li);
    }

    this.setColor(name ? ColorUtils.hueFromStr(name) : Math.random());
    if (selection) {
      this.updateSelection(selection);
    }
  }

  public updateSelection(selection?: TextSelection): void {
    this.removeSelection();
    this.selection = selection;
    if (selection) {
      const firstRange = selection.ranges && selection.ranges.length ? selection.ranges[0] : undefined;
      this.mark = this.editorAdapter.setOtherSelection(
        selection,
        firstRange && firstRange.anchor === firstRange.head ? this.color! : this.lightColor!,
        this.id,
      );
    }
  }

  public removeSelection(): void {
    if (this.mark) {
      this.mark.clear();
      this.mark = undefined;
    }
  }

  public setName(name: string): void {
    if (this.name === name) {
      return;
    }
    this.name = name;

    this.li.textContent = name;
    if (!this.li.parentNode) {
      this.listEl.appendChild(this.li);
    }

    this.setColor(ColorUtils.hueFromStr(name));
  }

  public remove(): void {
    if (this.li) {
      EditorClient.removeElement(this.li);
    }
    this.removeSelection();
  }

  private setColor(hue: number): void {
    this.color = ColorUtils.hsl2hex(hue, 0.75, 0.5);
    this.lightColor = ColorUtils.hsl2hex(hue, 0.5, 0.9);
    if (this.li) {
      this.li.style.color = this.color;
    }
  }
}
