export namespace ColorUtils {

  export function rgbValidation(color: string): RegExpExecArray | never {
    const match = /^#([0-9a-fA-F]{6})$/.exec(color);
    if (!match) {
      throw new Error('Only six-digit hex colors are allowed (e.g. `#1F66AD`).');
    }
    return match;
  }

  export function rgb2hex(r: number, g: number, b: number): string {
    function digits(n: number): string {
      const m = Math.round(n * 255).toString(16);
      return m.length === 1 ? `0${m}` : m;
    }
    return `#${digits(r)}${digits(g)}${digits(b)}`;
  }

  export function hsl2hex(h: number, s: number, l: number): string {
    if (s === 0) {
      return rgb2hex(l, l, l);
    }
    const var2 = l < 0.5 ? l * (s + 1) : (l + s) - (s * l);
    const var1 = l * 2 - var2;

    const hue2rgb = (hue: number) => {
      if (hue < 0) { hue += 1; }
      if (hue > 1) { hue -= 1; }
      if (hue * 6 < 1) { return var1 + (var2 - var1) * hue * 6 ; }
      if (hue * 2 < 1) { return var2; }
      if (hue * 3 < 2) { return var1 + (var2 - var1) * (2 / 3 - hue) * 6; }
      return var1;
    };
    return rgb2hex(hue2rgb(h + 1 / 3), hue2rgb(h), hue2rgb(h - 1 / 3));
  }

  export function hueFromStr(str: string): number {
    let a = 1;
    for (let i = 0; i < str.length; i++) {
      a = ((a + str.charCodeAt(i)) * 17) % 360;
    }
    return a / 360;
  }

}
