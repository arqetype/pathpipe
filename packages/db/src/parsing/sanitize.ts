const DECIMAL_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
  ocirc: 'ô',
  ucirc: 'û',
  icirc: 'î',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  szlig: 'ß',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

export const decodeEntities = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name: string) => DECIMAL_ENTITIES[name.toLowerCase()] ?? match,
    );

/**
 * Tags kept when storing a board's own markup.
 *
 * The sanitiser below *rebuilds* the document from this list rather than
 * stripping bad parts out of the original: anything not named here — including
 * every attribute except a link's `href` — cannot be expressed in the output, so
 * the stored markup is safe to render without a second pass on the client.
 */
const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'code',
  'pre',
  'a',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

/** Tags whose content is markup we do not want to keep as text either. */
const DROPPED_CONTENT = /<(script|style|noscript|template)[\s\S]*?<\/\1>/gi;

const VOID_TAGS = new Set(['br', 'hr']);

/** Unclosed tags that must not swallow the rest of the document. */
const IMPLICITLY_CLOSED: Record<string, string[]> = {
  li: ['li'],
  tr: ['tr', 'td', 'th'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  p: ['p'],
};

const BLOCK_LIKE =
  /^(div|section|article|header|footer|main|aside|form|fieldset)$/;

const escapeText = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** `href` values safe to keep — anything else loses the attribute. */
const safeHref = (raw: string): string | null => {
  const value = decodeEntities(raw).trim();
  if (!/^(https?:\/\/|mailto:)/i.test(value)) return null;
  // A control character inside a URL is how obfuscated schemes are smuggled
  // past a prefix check; a link carrying one is not one we keep.
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  if (value.length > 2000) return null;
  return escapeText(value);
};

/**
 * Rewrites a board's description markup into a small, safe subset.
 *
 * Unknown tags are dropped while their text is kept, so a `<div>`-only layout
 * still reads correctly; scripts, styles, iframes, event handlers and
 * `javascript:` links have no representation in the output at all.
 */
export const sanitizeHtml = (raw: string): string => {
  const source = raw
    .replace(DROPPED_CONTENT, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const out: string[] = [];
  const open: string[] = [];
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;

  const closeDownTo = (index: number): void => {
    for (let i = open.length - 1; i >= index; i--) out.push(`</${open[i]}>`);
    open.splice(index);
  };

  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source)) !== null) {
    out.push(escapeText(decodeEntities(source.slice(cursor, match.index))));
    cursor = tagPattern.lastIndex;

    const name = (match[1] ?? '').toLowerCase();
    const attributes = match[2] ?? '';
    const closing = match[0].startsWith('</');

    if (!ALLOWED_TAGS.has(name)) {
      // A layout tag we do not keep still ends a line.
      if (BLOCK_LIKE.test(name)) out.push('<br>');
      continue;
    }

    if (VOID_TAGS.has(name)) {
      if (!closing) out.push(`<${name}>`);
      continue;
    }

    if (closing) {
      const index = open.lastIndexOf(name);
      if (index !== -1) closeDownTo(index);
      continue;
    }

    // `<li>` after `<li>` means the previous one ended; boards omit the close.
    const implicit = IMPLICITLY_CLOSED[name];
    if (implicit) {
      const last = open[open.length - 1];
      if (last && implicit.includes(last)) closeDownTo(open.length - 1);
    }

    if (name === 'a') {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(
        attributes,
      );
      const value = href?.[2] ?? href?.[3] ?? href?.[4];
      const safe = value ? safeHref(value) : null;
      out.push(
        safe
          ? `<a href="${safe}" target="_blank" rel="noopener noreferrer nofollow">`
          : '<a>',
      );
    } else {
      out.push(`<${name}>`);
    }
    open.push(name);
  }

  out.push(escapeText(decodeEntities(source.slice(cursor))));
  closeDownTo(0);

  return out
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/(?:<br>\s*){3,}/g, '<br><br>')
    .replace(/^(?:\s|<br>)+|(?:\s|<br>)+$/g, '')
    .trim();
};

/** True when the value already carries markup worth sanitising. */
export const looksLikeHtml = (value: string): boolean =>
  /<(p|div|br|ul|ol|li|h[1-6]|strong|em|span|table)\b[^>]*>/i.test(value);
