#!/usr/bin/env node
/**
 * Readwise → src/content/books importer.
 *
 * Usage:
 *   node scripts/import-readwise.mjs [path-or-dir ...]
 *
 * Defaults to importing every .md file inside ./readwise-inbox/.
 *
 * Behavior:
 *   - Parses each Readwise markdown export (title, author, highlights).
 *   - Computes a slug from the title (matches src/lib/bookSlug.ts).
 *   - Looks up the book in src/data/books.json to seed metadata
 *     (cover, rating, tags, year_read, quake).
 *   - If src/content/books/<slug>.md does NOT exist: writes a fresh file
 *     using the standard template with Key Takeaways / Interconnections /
 *     Highlights sections.
 *   - If it DOES exist: dedupes new highlights against existing ones using
 *     the ^rwid-<id> block-ref tokens, appends only what's new, and never
 *     touches the Key Takeaways or Interconnections sections.
 *
 * No third-party dependencies. Node ≥ 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = path.join(REPO_ROOT, 'src', 'content', 'books');
const BOOKS_JSON = path.join(REPO_ROOT, 'src', 'data', 'books.json');
const DEFAULT_INBOX = path.join(REPO_ROOT, 'readwise-inbox');

// ---------- helpers ----------

function bookSlug(title) {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function rwidFor(text, locationUrl) {
  // Stable 12-char hash of text + location. Same input → same id forever.
  const h = crypto
    .createHash('sha1')
    .update((text || '').trim() + '|' + (locationUrl || ''))
    .digest('hex')
    .slice(0, 12);
  return 'rwid-' + h;
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function flattenLibrary(booksData) {
  const out = [];
  for (const b of booksData.quake_books || []) {
    out.push({ ...b, year_read: b.year_read, quake: true });
  }
  for (const [year, books] of Object.entries(booksData.library || {})) {
    for (const b of books) {
      out.push({ ...b, year_read: Number(year) });
    }
  }
  return out;
}

function findBookMeta(allBooks, title) {
  const target = bookSlug(title);
  // 1. exact title
  const exact = allBooks.find(b => b.title === title);
  if (exact) return exact;
  // 2. case-insensitive
  const ci = allBooks.find(b => b.title.toLowerCase() === title.toLowerCase());
  if (ci) return ci;
  // 3. slug match
  const bySlug = allBooks.find(b => bookSlug(b.title) === target);
  if (bySlug) return bySlug;
  return null;
}

// ---------- Readwise parser ----------

// Readwise has two common markdown export formats; this parser handles both.
//
// Format A — Obsidian / bullet-style:
//   # Title
//   ## Metadata
//   - Author: [[Name]]
//   - URL: https://readwise.io/bookreview/12345
//   ## Highlights
//   - highlight text ([Location 123](url))
//       - Note: a note
//
// Format B — Flat/paragraph style (e.g. "Highlights Only" export):
//   # Title by Author
//   <highlight as paragraph>
//   **Note:** optional note line
//
//   <next highlight as paragraph>
//   ...
//
// Format B has no Metadata or Highlights heading — just the H1 followed
// by blank-line-separated paragraphs. When the title ends with " by <author>"
// we split that off.

function parseReadwiseExport(raw) {
  const lines = raw.split(/\r?\n/);

  // Title from the first H1
  let title = null;
  let titleLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+?)\s*$/);
    if (m) { title = m[1].trim(); titleLineIdx = i; break; }
  }
  if (!title) return null;

  const hasMetadataBlock = lines.some(l => /^##\s+Metadata\s*$/i.test(l));
  const hasHighlightsHeading = lines.some(l => /^##\s+Highlights\s*$/i.test(l));

  if (hasHighlightsHeading || hasMetadataBlock) {
    return parseBulletFormat(lines, title);
  }
  return parseFlatFormat(lines, title, titleLineIdx);
}

function parseBulletFormat(lines, title) {
  // Metadata block
  let author = null;
  let readwiseUrl = null;
  let bookId = null;
  const metaStart = lines.findIndex(l => /^##\s+Metadata\s*$/i.test(l));
  if (metaStart !== -1) {
    for (let i = metaStart + 1; i < lines.length && !/^##\s+/.test(lines[i]); i++) {
      const line = lines[i];
      const a = line.match(/^-\s*Author:\s*(?:\[\[)?([^\]]+?)(?:\]\])?\s*$/i);
      if (a) author = a[1].trim();
      const u = line.match(/^-\s*URL:\s*(\S+)/i);
      if (u) {
        readwiseUrl = u[1].trim();
        const id = readwiseUrl.match(/(\d{5,})/);
        if (id) bookId = id[1];
      }
    }
  }

  // Highlights block — every top-level "- " bullet under "## Highlights"
  const highlights = [];
  const hlStart = lines.findIndex(l => /^##\s+Highlights\s*$/i.test(l));
  if (hlStart !== -1) {
    let current = null;
    for (let i = hlStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^##\s+/.test(line)) break;
      const top = line.match(/^-\s+(.*)$/);
      const indented = line.match(/^(?:\s{2,}|\t)-\s+(.*)$/);
      if (top && !indented) {
        if (current) highlights.push(current);
        const text = top[1];
        let blockRef = null;
        const refMatch = text.match(/\s\^([\w-]+)\s*$/);
        const cleanText = refMatch ? text.slice(0, refMatch.index).trimEnd() : text;
        if (refMatch) blockRef = refMatch[1];
        const locUrl = (cleanText.match(/\((https?:\/\/[^)]+)\)/) || [])[1] || '';
        current = {
          text: cleanText,
          locationUrl: locUrl,
          rwid: blockRef || rwidFor(cleanText, locUrl),
          notes: [],
        };
      } else if (indented && current) {
        current.notes.push(indented[1]);
      }
    }
    if (current) highlights.push(current);
  }

  return { title, author, readwiseUrl, bookId, highlights };
}

function parseFlatFormat(lines, rawTitle, titleLineIdx) {
  // Pull " by Author" suffix off the title if present.
  let title = rawTitle;
  let author = null;
  const byMatch = rawTitle.match(/^(.+?),?\s+by\s+(.+)$/i);
  if (byMatch) {
    title = byMatch[1].trim().replace(/,\s*$/, '');
    author = byMatch[2].trim();
  }

  // Collect body after the H1 into paragraphs (blank-line separated).
  const bodyLines = lines.slice(titleLineIdx + 1);
  const paragraphs = [];
  let buf = [];
  const flush = () => {
    if (buf.length) {
      const text = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (text) paragraphs.push(text);
      buf = [];
    }
  };
  for (const line of bodyLines) {
    if (line.trim() === '') {
      flush();
    } else {
      buf.push(line.trim());
    }
  }
  flush();

  // Walk paragraphs: each non-note paragraph is a highlight. A paragraph
  // beginning with "**Note:**" attaches to the previous highlight.
  const highlights = [];
  let current = null;
  for (const p of paragraphs) {
    const noteMatch = p.match(/^\*\*Note:\*\*\s*(.*)$/i);
    if (noteMatch && current) {
      current.notes.push(noteMatch[1].trim());
      continue;
    }
    if (noteMatch) continue; // orphan note — skip
    // Skip pure metadata-ish lines like tag rows
    if (/^#\S+(\s+#\S+)*$/.test(p)) continue;
    if (current) highlights.push(current);
    current = {
      text: p,
      locationUrl: '',
      rwid: rwidFor(p, ''),
      notes: [],
    };
  }
  if (current) highlights.push(current);

  return { title, author, readwiseUrl: null, bookId: null, highlights };
}

// ---------- Frontmatter helpers ----------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fmText = m[1];
  const body = m[2];
  const fm = {};
  const lines = fmText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([a-zA-Z_][\w]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2];
    if (val === '' || val === undefined) {
      // multi-line list (YAML "- item" form)
      const items = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        i++;
        items.push(lines[i].replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, ''));
      }
      if (items.length) { fm[key] = items; continue; }
    }
    // strip surrounding quotes
    val = val.replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return { fm, body, raw };
}

function coerceFmNumber(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function coerceFmBool(v) {
  if (v === true) return true;
  if (typeof v === 'string') return v === 'true';
  return false;
}

function yamlEscape(s) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (/[:#\-?{}[\],&*!|>'"%@`]/.test(str) || /^\s|\s$/.test(str)) {
    return JSON.stringify(str);
  }
  return str;
}

function buildFrontmatter(meta) {
  const lines = ['---'];
  if (meta.title)        lines.push(`title: ${JSON.stringify(meta.title)}`);
  if (meta.author)       lines.push(`author: ${JSON.stringify(meta.author)}`);
  if (meta.cover)        lines.push(`cover: ${JSON.stringify(meta.cover)}`);
  if (meta.year_read)    lines.push(`year_read: ${meta.year_read}`);
  if (meta.rating != null) lines.push(`rating: ${meta.rating}`);
  if (meta.quake)        lines.push(`quake: true`);
  if (meta.tags && meta.tags.length) {
    lines.push('tags:');
    for (const t of meta.tags) lines.push(`  - ${yamlEscape(t)}`);
  }
  if (meta.readwise_url) lines.push(`readwise_url: ${JSON.stringify(meta.readwise_url)}`);
  if (meta.readwise_book_id) lines.push(`readwise_book_id: ${JSON.stringify(String(meta.readwise_book_id))}`);
  if (meta.last_imported) lines.push(`last_imported: ${JSON.stringify(meta.last_imported)}`);
  lines.push(`key_takeaways_status: ${meta.key_takeaways_status || 'pending'}`);
  lines.push('---');
  return lines.join('\n');
}

function renderHighlight(h) {
  // The rwid is embedded as an HTML comment so the markdown renderer
  // strips it entirely from the rendered page, but we can still find it
  // on re-import for dedup.
  const out = [`- ${h.text} <!--rwid:${h.rwid}-->`];
  for (const n of h.notes) out.push(`  - ${n}`);
  return out.join('\n');
}

function buildFreshBody(highlights) {
  const hlBlock = highlights.length
    ? highlights.map(renderHighlight).join('\n')
    : '_Highlights from this book will appear here once imported from Readwise._';
  return `
## Key Takeaways

<!-- key-takeaways -->
_Under Consideration — to be added._
<!-- /key-takeaways -->

## Interconnections

<!-- interconnections -->
_Under Consideration — to be added._
<!-- /interconnections -->

## Highlights

${hlBlock}
`;
}

// Replace just the "## Highlights" section of an existing file body.
// Anything before that heading is left untouched (Key Takeaways /
// Interconnections / any other sections Kyle has written).
function spliceHighlightsSection(body, newHighlightsBlock) {
  const idx = body.search(/^##\s+Highlights\s*$/m);
  if (idx === -1) {
    // No highlights section yet — append one.
    return body.replace(/\s*$/, '') + '\n\n## Highlights\n\n' + newHighlightsBlock + '\n';
  }
  const before = body.slice(0, idx);
  // Find the next H2 after the highlights heading (if any)
  const after = body.slice(idx);
  const nextH2 = after.slice(2).search(/^##\s+/m);
  const tail = nextH2 === -1 ? '' : after.slice(2 + nextH2);
  return before + '## Highlights\n\n' + newHighlightsBlock + '\n' + (tail ? '\n' + tail : '');
}

function extractExistingRwids(body) {
  const set = new Set();
  const idx = body.search(/^##\s+Highlights\s*$/m);
  if (idx === -1) return set;
  const after = body.slice(idx);
  const nextH2 = after.slice(2).search(/^##\s+/m);
  const section = nextH2 === -1 ? after : after.slice(0, 2 + nextH2);
  // Current format: <!--rwid:rwid-xxxxxx-->
  for (const m of section.matchAll(/<!--rwid:(rwid-[\w-]+)-->/g)) set.add(m[1]);
  // Legacy format: ^rwid-xxxxxx (block-ref) — supported for migration
  for (const m of section.matchAll(/\^(rwid-[\w-]+)/g)) set.add(m[1]);
  return set;
}

function extractExistingHighlightLines(body) {
  // Returns the literal contents of the existing Highlights section
  // so we can append to it (preserving order + any manual edits).
  // Returns '' if the existing section has no real bullet items
  // (e.g. the seed placeholder text), so we cleanly replace it.
  const idx = body.search(/^##\s+Highlights\s*$/m);
  if (idx === -1) return '';
  const after = body.slice(idx);
  const nextH2 = after.slice(2).search(/^##\s+/m);
  const section = nextH2 === -1 ? after : after.slice(0, 2 + nextH2);
  const stripped = section.replace(/^##\s+Highlights\s*\n+/, '').replace(/\s+$/, '');
  // No bullets at all → treat as placeholder, return empty.
  if (!/^-\s+/m.test(stripped)) return '';
  return stripped;
}

// ---------- main ----------

function gatherInputFiles(args) {
  const inputs = args.length ? args : [DEFAULT_INBOX];
  const files = [];
  for (const input of inputs) {
    if (!fs.existsSync(input)) {
      console.warn(`! skip (not found): ${input}`);
      continue;
    }
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      for (const f of fs.readdirSync(input)) {
        if (f.endsWith('.md')) files.push(path.join(input, f));
      }
    } else if (input.endsWith('.md')) {
      files.push(input);
    }
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const files = gatherInputFiles(args);

  if (!files.length) {
    console.log('No .md files found. Drop Readwise exports into ./readwise-inbox/ and re-run.');
    process.exit(0);
  }

  if (!fs.existsSync(BOOKS_DIR)) fs.mkdirSync(BOOKS_DIR, { recursive: true });

  const booksData = readJSON(BOOKS_JSON);
  const allBooks = flattenLibrary(booksData);
  const today = new Date().toISOString().slice(0, 10);

  const report = { created: 0, updated: 0, unchanged: 0, unmatched: [] };

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = parseReadwiseExport(raw);
    if (!parsed) {
      console.warn(`! skip (no title): ${file}`);
      continue;
    }
    const slug = bookSlug(parsed.title);
    const target = path.join(BOOKS_DIR, `${slug}.md`);
    const meta = findBookMeta(allBooks, parsed.title);
    if (!meta) {
      report.unmatched.push(parsed.title);
    }

    // Pre-read existing frontmatter (if any) so we can preserve manual edits
    // like rating overrides, tags additions, custom covers, etc.
    let existingFmObj = {};
    if (fs.existsSync(target)) {
      const existingRawTmp = fs.readFileSync(target, 'utf8');
      existingFmObj = parseFrontmatter(existingRawTmp).fm;
    }

    const frontmatterMeta = {
      title: parsed.title,
      author: parsed.author || (meta && meta.author) || existingFmObj.author || 'Unknown',
      cover: (meta && meta.cover) || existingFmObj.cover,
      year_read: (meta && meta.year_read) || coerceFmNumber(existingFmObj.year_read) || existingFmObj.year_read,
      rating: (meta && meta.rating) ?? coerceFmNumber(existingFmObj.rating),
      quake: (meta && meta.quake) || coerceFmBool(existingFmObj.quake),
      tags: (meta && meta.tags && meta.tags.length ? meta.tags : (Array.isArray(existingFmObj.tags) ? existingFmObj.tags : [])),
      readwise_url: parsed.readwiseUrl || existingFmObj.readwise_url,
      readwise_book_id: parsed.bookId || existingFmObj.readwise_book_id,
      last_imported: today,
      key_takeaways_status: existingFmObj.key_takeaways_status || 'pending',
    };

    if (!fs.existsSync(target)) {
      const fm = buildFrontmatter(frontmatterMeta);
      const body = buildFreshBody(parsed.highlights);
      fs.writeFileSync(target, fm + '\n' + body);
      console.log(`+ created  ${slug}.md  (${parsed.highlights.length} highlights)`);
      report.created++;
      continue;
    }

    // existing file — merge highlights
    const existingRaw = fs.readFileSync(target, 'utf8');
    const { body: existingBody } = parseFrontmatter(existingRaw);

    const existingRwids = extractExistingRwids(existingBody);
    const newOnes = parsed.highlights.filter(h => !existingRwids.has(h.rwid));
    if (!newOnes.length) {
      console.log(`= unchanged ${slug}.md  (${parsed.highlights.length} already present)`);
      report.unchanged++;
      // Still bump last_imported.
      const fm = buildFrontmatter(frontmatterMeta);
      fs.writeFileSync(target, fm + '\n' + existingBody);
      continue;
    }

    const existingHighlightsText = extractExistingHighlightLines(existingBody);
    const newHighlightsText = newOnes.map(renderHighlight).join('\n');
    const mergedBlock = existingHighlightsText
      ? existingHighlightsText + '\n' + newHighlightsText
      : newHighlightsText;

    const newBody = spliceHighlightsSection(existingBody, mergedBlock);
    const fm = buildFrontmatter(frontmatterMeta);
    fs.writeFileSync(target, fm + '\n' + newBody);
    console.log(`~ updated  ${slug}.md  (+${newOnes.length} new, ${existingRwids.size} already present)`);
    report.updated++;
  }

  console.log('');
  console.log(`Done. created=${report.created} updated=${report.updated} unchanged=${report.unchanged}`);
  if (report.unmatched.length) {
    console.log('');
    console.log('⚠ Books not found in src/data/books.json (added with bare metadata):');
    for (const t of report.unmatched) console.log('   - ' + t);
    console.log('Add them to books.json and re-run to backfill cover/rating/tags.');
  }
}

main();
