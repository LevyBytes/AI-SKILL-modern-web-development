// Applies the proposals in a preview output folder to a copy of the site's repository: each proposed head replaces
// the <head> of its page, and each proposed file is written at its path. Without --write it only lists what it
// would change. It never deletes a file and never runs Git; reviewing and committing stay with the site's owner.
// Apply to a work copy first, run the site's own checks there, then apply to the repository the owner commits from.
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Config, fail, headBounds, isMain, readConfig, required, runCli } from './shared.ts';

const HELP = `Apply the proposed heads and site files to a repository folder (lists the changes unless --write).
  node scripts/share-previews/apply-proposals.ts --config <preview.config.json> --out <folder> --repo <repository folder> [--write]`;

function walk(root: string, dir = root): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(root, full) : [path.relative(root, full).split(path.sep).join('/')];
  });
}

function inside(repo: string, relative: string) {
  const target = path.resolve(repo, relative);
  if (path.relative(repo, target).startsWith('..') || path.isAbsolute(path.relative(repo, target))) fail(`refusing a path outside the repository: ${relative}`);
  return target;
}

export async function applyProposals(config: Config, out: string, repo: string, write: boolean) {
  if (!existsSync(repo)) fail(`repository folder not found: ${repo}`);
  const changes: { path: string; action: string; detail?: string }[] = [];
  const pending: { target: string; content: string | Buffer }[] = [];
  for (const file of walk(path.join(out, 'proposed-head'))) {
    const proposed = (await readFile(path.join(out, 'proposed-head', file), 'utf8')).replace(/\r\n?/g, '\n');
    const bounds = headBounds(proposed);
    const head = proposed.slice(bounds.start, bounds.end);
    const relative = `${config.site.base}${file}`;
    const target = inside(repo, relative);
    if (!existsSync(target)) { changes.push({ path: relative, action: 'missing', detail: 'the page does not exist in the repository' }); continue; }
    const page = await readFile(target, 'utf8');
    const crlf = page.includes('\r');
    const text = page.replace(/\r\n?/g, '\n');
    const at = headBounds(text);
    const next = text.slice(0, at.start) + head + text.slice(at.end);
    if (next === page) changes.push({ path: relative, action: 'unchanged' });
    else {
      changes.push({ path: relative, action: 'replace head', detail: crlf ? 'line endings become LF' : undefined });
      pending.push({ target, content: next });
    }
  }
  // Proposed files are compared and written as bytes: they include the published share image.
  for (const file of walk(path.join(out, 'proposed-files'))) {
    const content = await readFile(path.join(out, 'proposed-files', file));
    const target = inside(repo, file);
    const before = existsSync(target) ? await readFile(target) : null;
    if (before?.equals(content)) { changes.push({ path: file, action: 'unchanged' }); continue; }
    changes.push({ path: file, action: before === null ? 'create' : 'replace' });
    pending.push({ target, content });
  }
  for (const change of changes) console.log(`${change.action.padEnd(13)} ${change.path}${change.detail ? ` (${change.detail})` : ''}`);
  if (write) {
    for (const item of pending) {
      await mkdir(path.dirname(item.target), { recursive: true });
      await writeFile(item.target, item.content);
    }
    console.log(`wrote ${pending.length} files into ${repo}. Nothing was committed.`);
  } else console.log(`${pending.length} files would change. Run again with --write to apply them.`);
  return { ok: !changes.some(c => c.action === 'missing'), changes, written: write ? pending.length : 0 };
}

if (isMain(import.meta.url)) {
  await runCli(HELP, async options => (await applyProposals(readConfig(required(options, 'config', HELP)), path.resolve(required(options, 'out', HELP)),
    path.resolve(required(options, 'repo', HELP)), options.write === true)).ok);
}
