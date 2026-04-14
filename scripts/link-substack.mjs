#!/usr/bin/env node
/**
 * Matches local essays to Substack posts by slug and adds
 * substack_url to the essay frontmatter.
 *
 * Usage: node scripts/link-substack.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ESSAYS_DIR = path.resolve(__dirname, '..', 'src', 'content', 'essays');
const SUBSTACK_URLS_FILE = '/tmp/substack_urls.txt';

// Read substack URLs and build a slug → URL map
const substackUrls = fs.readFileSync(SUBSTACK_URLS_FILE, 'utf8')
  .split('\n')
  .filter(u => u.trim())
  .map(u => {
    const slug = u.trim().split('/p/')[1];
    return { slug, url: u.trim() };
  });
const substackMap = new Map(substackUrls.map(s => [s.slug, s.url]));

console.log(`Loaded ${substackMap.size} Substack post slugs`);

// Process each essay
const essays = fs.readdirSync(ESSAYS_DIR).filter(f => f.endsWith('.md'));
let matched = 0;
let alreadyLinked = 0;
let unmatched = 0;

for (const file of essays) {
  const filePath = path.join(ESSAYS_DIR, file);
  const raw = fs.readFileSync(filePath, 'utf8');

  // Parse frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) { unmatched++; continue; }

  const fmText = fmMatch[1];
  const body = fmMatch[2];

  // Already has substack_url?
  if (fmText.includes('substack_url:')) { alreadyLinked++; continue; }

  // Get the essay slug from frontmatter or filename
  const slugMatch = fmText.match(/^slug:\s*["']?([^"'\n]+)["']?\s*$/m);
  const essaySlug = slugMatch
    ? slugMatch[1].trim()
    : file.replace(/\.md$/, '');

  // Try to match against substack
  const substackUrl = substackMap.get(essaySlug);
  if (!substackUrl) {
    unmatched++;
    continue;
  }

  // Add substack_url to frontmatter (insert before the closing ---)
  const newFm = fmText + `\nsubstack_url: "${substackUrl}"`;
  const newContent = `---\n${newFm}\n---\n${body}`;
  fs.writeFileSync(filePath, newContent);
  console.log(`+ ${essaySlug}`);
  matched++;
}

console.log(`\nDone. matched=${matched} already-linked=${alreadyLinked} unmatched=${unmatched}`);
if (unmatched > 0) {
  console.log(`\n${unmatched} essays had no matching Substack slug.`);
}
