export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

export interface StanzaInput {
  name: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  children?: Array<StanzaInput | string | null | undefined>;
  text?: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function unescapeXml(value: string): string {
  if (value.indexOf('&') === -1) return value;
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code[0] === '#') {
      const codePoint =
        code[1] === 'x' || code[1] === 'X'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    const named = NAMED_ENTITIES[code];
    return named === undefined ? match : named;
  });
}

export function buildStanza(input: StanzaInput): string {
  let attrs = '';
  if (input.attrs) {
    for (const [key, value] of Object.entries(input.attrs)) {
      if (value === null || value === undefined) continue;
      attrs += ` ${key}="${escapeXml(String(value))}"`;
    }
  }

  const inner: string[] = [];
  if (input.text !== undefined) inner.push(escapeXml(input.text));
  if (input.children) {
    for (const child of input.children) {
      if (child === null || child === undefined) continue;
      inner.push(typeof child === 'string' ? escapeXml(child) : buildStanza(child));
    }
  }

  if (inner.length === 0) return `<${input.name}${attrs}/>`;
  return `<${input.name}${attrs}>${inner.join('')}</${input.name}>`;
}

const NAME_CHAR = /[^\s/>=]/;

class Scanner {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): XmlNode | null {
    this.skipProlog();
    if (this.index >= this.source.length) return null;
    if (this.source[this.index] !== '<') return null;
    return this.parseElement();
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && /\s/.test(this.source[this.index]!)) this.index += 1;
  }

  private skipProlog(): void {
    for (;;) {
      this.skipWhitespace();
      if (this.source.startsWith('<?', this.index)) {
        const end = this.source.indexOf('?>', this.index);
        if (end === -1) {
          this.index = this.source.length;
          return;
        }
        this.index = end + 2;
        continue;
      }
      if (this.source.startsWith('<!--', this.index)) {
        const end = this.source.indexOf('-->', this.index);
        if (end === -1) {
          this.index = this.source.length;
          return;
        }
        this.index = end + 3;
        continue;
      }
      return;
    }
  }

  private readName(): string {
    const start = this.index;
    while (this.index < this.source.length && NAME_CHAR.test(this.source[this.index]!)) {
      this.index += 1;
    }
    return this.source.slice(start, this.index);
  }

  private parseElement(): XmlNode | null {
    if (this.source[this.index] !== '<') return null;
    this.index += 1;
    const name = this.readName();
    if (name.length === 0) return null;

    const node: XmlNode = { name, attrs: {}, children: [], text: '' };

    for (;;) {
      this.skipWhitespace();
      const char = this.source[this.index];
      if (char === undefined) return node;
      if (char === '/') {
        this.index += 1;
        if (this.source[this.index] === '>') this.index += 1;
        return node;
      }
      if (char === '>') {
        this.index += 1;
        break;
      }
      const attrName = this.readName();
      if (attrName.length === 0) {
        this.index += 1;
        continue;
      }
      this.skipWhitespace();
      let attrValue = '';
      if (this.source[this.index] === '=') {
        this.index += 1;
        this.skipWhitespace();
        const quote = this.source[this.index];
        if (quote === '"' || quote === "'") {
          this.index += 1;
          const end = this.source.indexOf(quote, this.index);
          const raw = end === -1 ? this.source.slice(this.index) : this.source.slice(this.index, end);
          attrValue = unescapeXml(raw);
          this.index = end === -1 ? this.source.length : end + 1;
        }
      }
      node.attrs[attrName] = attrValue;
    }

    this.parseChildren(node);
    return node;
  }

  private parseChildren(node: XmlNode): void {
    let text = '';
    for (;;) {
      if (this.index >= this.source.length) break;
      const char = this.source[this.index]!;
      if (char === '<') {
        if (this.source.startsWith('<![CDATA[', this.index)) {
          const end = this.source.indexOf(']]>', this.index);
          const raw = end === -1 ? this.source.slice(this.index + 9) : this.source.slice(this.index + 9, end);
          text += raw;
          this.index = end === -1 ? this.source.length : end + 3;
          continue;
        }
        if (this.source.startsWith('<!--', this.index)) {
          const end = this.source.indexOf('-->', this.index);
          this.index = end === -1 ? this.source.length : end + 3;
          continue;
        }
        if (this.source[this.index + 1] === '/') {
          const end = this.source.indexOf('>', this.index);
          this.index = end === -1 ? this.source.length : end + 1;
          break;
        }
        const child = this.parseElement();
        if (child) node.children.push(child);
        continue;
      }
      const next = this.source.indexOf('<', this.index);
      const chunk = next === -1 ? this.source.slice(this.index) : this.source.slice(this.index, next);
      text += chunk;
      this.index = next === -1 ? this.source.length : next;
    }
    node.text = unescapeXml(text).trim();
  }
}

export function parseStanza(xml: string): XmlNode | null {
  return new Scanner(xml).parse();
}

export function findChild(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((child) => child.name === name || localName(child.name) === name);
}

export function findChildren(node: XmlNode, name: string): XmlNode[] {
  return node.children.filter((child) => child.name === name || localName(child.name) === name);
}

export function localName(name: string): string {
  const colon = name.indexOf(':');
  return colon === -1 ? name : name.slice(colon + 1);
}
