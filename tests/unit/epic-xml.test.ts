import { describe, expect, it } from 'vitest';
import {
  buildStanza,
  escapeXml,
  findChild,
  findChildren,
  localName,
  parseStanza,
  unescapeXml,
} from '../../src/epic/xml.js';

describe('epic/xml escaping', () => {
  it('escapes the five reserved characters', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;',
    );
  });

  it('unescapes named and numeric entities', () => {
    expect(unescapeXml('&lt;a&gt;&amp;&quot;&apos;')).toBe(`<a>&"'`);
    expect(unescapeXml('&#65;&#x42;')).toBe('AB');
  });

  it('leaves unknown entities untouched', () => {
    expect(unescapeXml('&unknown;')).toBe('&unknown;');
  });

  it('round-trips arbitrary text', () => {
    const value = `He said <"hi"> & 'bye'`;
    expect(unescapeXml(escapeXml(value))).toBe(value);
  });
});

describe('epic/xml buildStanza', () => {
  it('builds a self-closing element when empty', () => {
    expect(buildStanza({ name: 'ping', attrs: { xmlns: 'urn:xmpp:ping' } })).toBe(
      '<ping xmlns="urn:xmpp:ping"/>',
    );
  });

  it('skips null and undefined attributes and children', () => {
    const xml = buildStanza({
      name: 'presence',
      attrs: { type: undefined, id: null, to: 'x' },
      children: [null, undefined, { name: 'show', text: 'dnd' }],
    });
    expect(xml).toBe('<presence to="x"><show>dnd</show></presence>');
  });

  it('escapes attribute and text content', () => {
    const xml = buildStanza({ name: 'body', text: 'a & b', attrs: { note: '"q"' } });
    expect(xml).toBe('<body note="&quot;q&quot;">a &amp; b</body>');
  });

  it('serializes nested children and string children', () => {
    const xml = buildStanza({
      name: 'iq',
      attrs: { type: 'set', id: 'bind_1' },
      children: [
        {
          name: 'bind',
          attrs: { xmlns: 'urn:ietf:params:xml:ns:xmpp-bind' },
          children: [{ name: 'resource', text: 'V2:Fortnite:WIN::ABC' }],
        },
      ],
    });
    expect(xml).toBe(
      '<iq type="set" id="bind_1"><bind xmlns="urn:ietf:params:xml:ns:xmpp-bind"><resource>V2:Fortnite:WIN::ABC</resource></bind></iq>',
    );
  });
});

describe('epic/xml parseStanza', () => {
  it('parses attributes with either quote style', () => {
    const node = parseStanza(`<open xmlns='urn:framing' to="host" version="1.0"/>`);
    expect(node?.name).toBe('open');
    expect(node?.attrs.xmlns).toBe('urn:framing');
    expect(node?.attrs.to).toBe('host');
    expect(node?.attrs.version).toBe('1.0');
    expect(node?.children).toHaveLength(0);
  });

  it('skips the XML prolog and comments', () => {
    const node = parseStanza(`<?xml version="1.0"?><!-- hi --><presence/>`);
    expect(node?.name).toBe('presence');
  });

  it('parses prefixed element names and nested children', () => {
    const node = parseStanza(
      '<stream:features><mechanisms><mechanism>PLAIN</mechanism></mechanisms></stream:features>',
    );
    expect(node?.name).toBe('stream:features');
    expect(localName(node!.name)).toBe('features');
    const mechanisms = findChild(node!, 'mechanisms');
    expect(mechanisms).toBeDefined();
    expect(findChild(mechanisms!, 'mechanism')?.text).toBe('PLAIN');
  });

  it('parses a presence stanza with JSON status text', () => {
    const node = parseStanza(
      '<presence from="abc@host/res"><status>{"Status":"Battle Royale Lobby","bIsPlaying":true}</status></presence>',
    );
    expect(node?.attrs.from).toBe('abc@host/res');
    const status = findChild(node!, 'status');
    expect(status?.text).toBe('{"Status":"Battle Royale Lobby","bIsPlaying":true}');
    expect(JSON.parse(status!.text).bIsPlaying).toBe(true);
  });

  it('decodes CDATA sections', () => {
    const node = parseStanza('<body><![CDATA[a < b & c]]></body>');
    expect(node?.text).toBe('a < b & c');
  });

  it('finds multiple matching children', () => {
    const node = parseStanza('<x><a>1</a><a>2</a><b>3</b></x>');
    expect(findChildren(node!, 'a').map((child) => child.text)).toEqual(['1', '2']);
  });

  it('returns null on empty input', () => {
    expect(parseStanza('')).toBeNull();
    expect(parseStanza('   ')).toBeNull();
  });
});
