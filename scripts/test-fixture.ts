// Adapted from GoogleChrome Modern Web Guidance test-fixture.ts for caller-owned targets.
import { test as base, chromium, type Page, type Browser, type BrowserContext, type Request } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import type { Project } from 'ts-morph';
import type { CSSStyleSheet,CSSRule,RuleRoot,AnyRuleConstructor } from 'cssomnom';
import { startTargetServer, localURL, type TargetServer } from './target-server.ts';
const require=createRequire(import.meta.url);
export { expect } from '@playwright/test';
export { startTargetServer, type TargetServer };

export function skipUnless(conditions:{unsupported:string}){
  const file=process.env.GRADER_FEATURES;
  if(!file) throw Error('A fallback test requires a feature profile. Pass --features FILE with feature IDs mapped to boolean support.');
  const support=JSON.parse(fs.readFileSync(file,'utf8'));
  const ids=conditions.unsupported.split(',').map(s=>s.trim());
  if(!ids.length || ids.some(id=>!Object.hasOwn(support,id)||typeof support[id]!=='boolean'))
    throw Error('Unknown feature in fallback test: '+conditions.unsupported);
  base.skip(ids.every(id=>support[id]),'Fallback case requires an unsupported feature: '+ids.join(', '));
}


export interface PageLoadResult {
  ok: boolean;
  errors: string[];
  buildWarning?: string;
  noPage?: boolean;
}

export interface CheckPageLoadOptions {
  gotoTimeoutMs?: number;
  networkIdleTimeoutMs?: number;
}

export interface ExpectNeverOptions<Arg = undefined> {
  forMs: number;
  arg?: Arg;
  message?: string;
}

/**
 * Continually observes `predicate` in the page on every animation frame (or at
 * most every 16ms) for `forMs` milliseconds, failing immediately if `predicate`
 * ever evaluates to a truthy value.
 */
export async function expectNever<Arg = undefined>(
  page: Page,
  predicate: (arg: Arg) => unknown,
  options: ExpectNeverOptions<Arg>,
): Promise<void> {
  const { forMs, arg, message } = options;
  if (!Number.isFinite(forMs) || forMs <= 0) {
    throw new Error(`expectNever requires a positive finite forMs (got ${String(forMs)})`);
  }

  const start = performance.now();
  while (true) {
    const matched = Boolean(await page.evaluate<unknown, any>(predicate, arg));
    if (matched) {
      const elapsed = Math.round(performance.now() - start);
      const prefix = message ? `${message}: ` : '';
      throw new Error(
        `${prefix}expectNever failed: predicate became truthy after ${elapsed}ms (observation window: ${forMs}ms)`,
      );
    }

    const elapsed = performance.now() - start;
    const remaining = forMs - elapsed;
    if (remaining <= 0) {
      return;
    }

    await page.evaluate(
      (maxWaitMs) =>
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, maxWaitMs);
          requestAnimationFrame(() => {
            clearTimeout(timer);
            resolve();
          });
        }),
      Math.min(16, remaining),
    );
  }
}

export type ServerWorkerFixtures = {
  TARGET_URL: string;
};



function isBrowser(browserOrContext: Browser | BrowserContext): browserOrContext is Browser {
  return 'newContext' in browserOrContext;
}

const RESERVED_PLACEHOLDER_DOMAINS = ['example.com', 'example.net', 'example.org'];
const RESERVED_PLACEHOLDER_TLDS = ['.test', '.example', '.invalid'];

/**
 * Returns true if `hostname` is an RFC 2606 / RFC 6761 reserved placeholder domain
 * (`example.com`, `example.net`, `example.org` and their subdomains, or `.test`, `.example`, `.invalid` TLDs).
 */
export function isReservedPlaceholderHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host) return false;
  if (RESERVED_PLACEHOLDER_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return true;
  }
  if (host === 'test' || host === 'example' || host === 'invalid') {
    return true;
  }
  return RESERVED_PLACEHOLDER_TLDS.some((tld) => host.endsWith(tld));
}

function isIgnoredPlaceholderScriptFailure(urlStr: string, errorText: string): boolean {
  if (!errorText.includes('ERR_NAME_NOT_RESOLVED')) {
    return false;
  }
  try {
    const parsed = new URL(urlStr);
    return isReservedPlaceholderHost(parsed.hostname);
  } catch {
    return false;
  }
}

export async function checkPageLoad(
  browserOrContext: Browser | BrowserContext,
  url: string,
  options: CheckPageLoadOptions = {},
): Promise<PageLoadResult> {
  const gotoTimeoutMs = options.gotoTimeoutMs ?? 15000;
  const networkIdleTimeoutMs = options.networkIdleTimeoutMs ?? 3000;
  const errors: string[] = [];
  const failedScriptRequests = new WeakSet<Request>();

  const ownsContext = isBrowser(browserOrContext);
  let context: BrowserContext | undefined;
  let page: Page | undefined;

  const onPageError = (err: Error) => {
    errors.push(`[pageerror] ${err.stack || err.message || String(err)}`);
  };
  const onRequestFailed = (req: Request) => {
    if (req.resourceType() === 'script' && !failedScriptRequests.has(req)) {
      const failure = req.failure();
      const errorText = failure?.errorText || 'failed';
      if (isIgnoredPlaceholderScriptFailure(req.url(), errorText)) {
        return;
      }
      failedScriptRequests.add(req);
      errors.push(`[requestfailed] ${req.method()} ${req.url()}: ${errorText}`);
    }
  };
  const onResponse = (res: { status(): number; statusText(): string; url(): string; request(): Request }) => {
    const req = res.request();
    if (req.resourceType() === 'script' && res.status() >= 400 && !failedScriptRequests.has(req)) {
      failedScriptRequests.add(req);
      errors.push(`[response ${res.status()}] ${req.method()} ${res.url()} ${res.statusText()}`.trim());
    }
  };

  try {
    try {
      context = ownsContext ? await browserOrContext.newContext() : browserOrContext;
      page = await context.newPage();
    } catch (err) {
      errors.push(`[browser] ${(err as Error).message || String(err)}`);
      return { ok: false, errors };
    }

    page.on('pageerror', onPageError);
    page.on('requestfailed', onRequestFailed);
    page.on('response', onResponse);

    try {
      const response = await page.goto(url, { waitUntil: 'load', timeout: gotoTimeoutMs });
      if (response && response.status() >= 400) {
        errors.push(`[document ${response.status()}] GET ${url} ${response.statusText()}`.trim());
      }
      // Bounded networkidle wait so async module graphs and deferred scripts settle without fixed sleeps.
      await page.waitForLoadState('networkidle', { timeout: networkIdleTimeoutMs }).catch(() => {});
    } catch (err) {
      errors.push(`[navigation] ${(err as Error).message || String(err)}`);
    }
  } finally {
    if (page) {
      page.off('pageerror', onPageError);
      page.off('requestfailed', onRequestFailed);
      page.off('response', onResponse);
      await page.close().catch(() => {});
    }
    if (ownsContext && context) {
      await context.close().catch(() => {});
    }
  }

  const uniqueErrors = Array.from(new Set(errors));
  return { ok: uniqueErrors.length === 0, errors: uniqueErrors };
}



export async function checkTargetPageLoad(targetDir:string, existingBrowser?:Browser, options?:{serverUrl?:string}):Promise<PageLoadResult>{
  const server=options?.serverUrl?undefined:await startTargetServer(targetDir);
  let browser=existingBrowser;
  try{
    browser??=await chromium.launch({headless:true,executablePath:process.env.GRADER_BROWSER||undefined});
    return await checkPageLoad(browser,options?.serverUrl?localURL(options.serverUrl):server!.url);
  }finally{
    try{if(!existingBrowser) await browser?.close();}finally{await server?.stop();}
  }
}

export function getTargetFiles(_testFileUrl?:string):string[]{
  const target=fs.realpathSync(process.env.TARGET_FILE??process.env.GRADER_ROOT??process.cwd());
  if(!fs.statSync(target).isDirectory())return [target];
  const files:string[]=[];
  function walk(dir:string){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if(entry.isSymbolicLink()||entry.name.startsWith('.')||entry.name==='node_modules')continue;
      const name=path.join(dir,entry.name);
      if(entry.isDirectory())walk(name);
      else if(entry.isFile() && /\.(html?|astro|css|[cm]?js|ts|jsx|tsx)$/i.test(entry.name) &&
              !/(?:^grader|\.(?:test|spec|grader))\.[cm]?[jt]sx?$/i.test(entry.name))files.push(name);
    }
  }
  walk(target);
  return files.sort();
}


export const test = base.extend<{ page: Page }, ServerWorkerFixtures>({
  page: async ({ page }, use, testInfo) => {
    const diagnostics: string[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        const loc = msg.location();
        const locSuffix = loc.url ? ` (${loc.url}:${loc.lineNumber})` : '';
        diagnostics.push(`[console.${type}] ${msg.text()}${locSuffix}`);
      }
    });

    page.on('pageerror', (err) => {
      diagnostics.push(`[pageerror] ${err.stack || err.message || String(err)}`);
    });

    page.on('requestfailed', (req) => {
      const failure = req.failure();
      diagnostics.push(`[requestfailed] ${req.method()} ${req.url()}: ${failure?.errorText || 'failed'}`);
    });

    page.on('response', (res) => {
      if (res.status() >= 400) {
        diagnostics.push(`[response ${res.status()}] ${res.request().method()} ${res.url()} ${res.statusText()}`);
      }
    });

    try {
      await use(page);
    } finally {
      const failed = (testInfo.status !== 'passed' && testInfo.status !== 'skipped') || testInfo.errors.length > 0;
      if (failed) {
        if (diagnostics.length > 0) {
          await testInfo.attach('browser-errors', {
            body: diagnostics.join('\n'),
            contentType: 'text/plain',
          });
        }
        if (!page.isClosed()) {
          // A crashed or hung page can't be snapshotted. Record why rather than failing fixture teardown.
          const body = await page.locator('body').ariaSnapshot({ timeout: 2000 })
            .catch((err: Error) => `(page snapshot unavailable: ${err.message})`);
          await testInfo.attach('page-snapshot', { body, contentType: 'text/plain' });
        }
      }
    }
  },

  TARGET_URL: [async ({}, use) => {
    if (process.env.TARGET_URL) {
      await use(localURL(process.env.TARGET_URL));
      return;
    }
    const target = fs.realpathSync(process.env.TARGET_FILE ?? process.cwd());
    const dir = fs.statSync(target).isDirectory() ? target : path.dirname(target);
    const server = await startTargetServer(dir, { targetFile: fs.statSync(target).isFile() ? target : undefined });
    try { await use(server.url); } finally { await server.stop(); }
  }, { scope: 'worker', timeout: 60000 }]
});


const HTML_EXTS = /\.(html|htm|astro)$/i;
const CSS_EXTS = /\.css$/i;
const JS_EXTS = /\.(m?js|cjs|ts|tsx|jsx)$/i;
const TEST_FILE_EXTS = /\.(test|spec)\.(m?js|cjs|ts|tsx|jsx)$/i;

// Matches (1) comments and raw-text/RCDATA elements, which are passed through untouched, or
// (2) `<?...>` processing-instruction-like markup, captured for rewriting.
const PI_SCAN = /<!--[\s\S]*?-->|<(script|style|textarea|title)\b[^>]*>[\s\S]*?<\/\1\s*>|<\?([^>]*)>/gi;

/**
 * Browsers' HTML parsers turn `<?...>` into bogus comments (Comment nodes whose data starts
 * with `?`), but linkedom drops them entirely. Rewrite them as real comments so graders can
 * find markers such as `<?start name="x">`, `<?end>`, and `<?marker name="x">` via the DOM.
 */
function processingInstructionsToComments(content: string): string {
  if (!content.includes('<?')) return content;
  return content.replace(PI_SCAN, (match, _rawTextTag: string | undefined, pi: string | undefined) =>
    pi === undefined ? match : `<!--?${pi}-->`
  );
}

function parseHtmlDocument(file: string, content: string): any {
  const normalized = file.endsWith('.astro')
    ? content
        .replace(/^---[\r\n]+[\s\S]*?[\r\n]+---/, '')
        .replace(/\b(class(?::list)?)=\{((?:[^{}]|\{[^{}]*\})+)\}/g, (_, attr: string, expr: string) => {
          const clean = expr.replace(/\$\{[^{}]*\}/g, ' ');
          const classes = Array.from(clean.matchAll(/['"`]([a-zA-Z0-9_\s-]+)['"`]/g), (m) => m[1].trim()).join(' ');
          return `${attr}="${classes}"`;
        })
    : content;
  const { parseHTML } = require('linkedom') as typeof import('linkedom');
  const { document } = parseHTML(processingInstructionsToComments(normalized));
  document.querySelectorAll('[class\\:list]').forEach((el: any) => {
    el.classList.add(...el.getAttribute('class:list').split(/\s+/).filter(Boolean));
  });
  return document;
}


const cssStyleSheetCache = new Map<string, CSSStyleSheet>();

function computeFilesCacheKey(files: string[]): string {
  return files
    .map((f) => {
      try {
        const stat = fs.statSync(f);
        return `${f}:${stat.mtimeMs}:${stat.size}`;
      } catch {
        return `${f}:missing`;
      }
    })
    .join('\0');
}

/**
 * Recursively collects rules matching the given RuleClass in depth-first pre-order.
 * When passed an array of file paths (string[]), automatically parses and caches
 * the consolidated CSSStyleSheet via getCssStyleSheet(files).
 */
export function getRules(root: RuleRoot | string[]): CSSRule[];
export function getRules<T extends CSSRule>(root: RuleRoot | string[], ruleType: AnyRuleConstructor<T>): T[];
export function getRules(root: RuleRoot | string[], ruleType?: AnyRuleConstructor<any>): any[] {
  if (Array.isArray(root) && root.length === 0) {
    return [];
  }
  let actualRoot: RuleRoot;
  if (Array.isArray(root)) {
    if (typeof root[0] === 'string') {
      actualRoot = getCssStyleSheet(root as string[]);
    } else {
      actualRoot = root as unknown as CSSRule[];
    }
  } else {
    actualRoot = root;
  }
  const { getRules: cssomGetRules } = require('cssomnom') as typeof import('cssomnom');
  return ruleType ? cssomGetRules(actualRoot, ruleType) : cssomGetRules(actualRoot);
}

function unwrapGlobalPseudo(css: string): string {
  let result = css;
  const token = ':global(';
  let idx = result.indexOf(token);
  while (idx !== -1) {
    let depth = 1;
    let i = idx + token.length;
    while (i < result.length && depth > 0) {
      if (result[i] === '(') depth++;
      else if (result[i] === ')') depth--;
      i++;
    }
    if (depth === 0) {
      const inner = result.slice(idx + token.length, i - 1);
      result = result.slice(0, idx) + inner + result.slice(i);
      idx = result.indexOf(token, idx + inner.length);
    } else {
      break;
    }
  }
  return result;
}

/**
 * Parses all CSS across standalone stylesheets (.css), HTML/Astro <style> tags,
 * and inline styles into a CSSOMNom CSSStyleSheet object.
 * Results are memoized by file path, mtime, and file size.
 */
export function getCssStyleSheet(files: string[]): CSSStyleSheet {
  const cacheKey = computeFilesCacheKey(files);
  const cached = cssStyleSheetCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const { parse, CSSStyleDeclaration } = require('cssomnom') as typeof import('cssomnom');
  const cssBlocks: string[] = [];
  for (const file of files) {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
    const content = fs.readFileSync(file, 'utf8');

    if (CSS_EXTS.test(file)) {
      cssBlocks.push(content);
    } else if (HTML_EXTS.test(file)) {
      // Exclude <template> elements to avoid extracting inert component template styles as global page styles
      const withoutTemplates = content.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '');
      try {
        const document = parseHtmlDocument(file, content);
        document.querySelectorAll('template').forEach((el: any) => el.remove());
        document.querySelectorAll('style').forEach((style: any) => {
          if (style.textContent) cssBlocks.push(style.textContent);
        });
        document.querySelectorAll('[style]').forEach((el: any) => {
          const inlineStyle = el.getAttribute('style')?.trim();
          if (!inlineStyle) return;
          // Parse through CSSStyleDeclaration so unparsed JSX expressions (e.g. `{expr}`) yield
          // no declarations and are skipped, and valid ones serialize with balanced braces/strings.
          const decl = new CSSStyleDeclaration();
          decl.cssText = inlineStyle;
          if (decl.length > 0) {
            cssBlocks.push(`[style] { ${decl.cssText} }`);
          }
        });
        // Also extract <style> blocks from <script> tags (e.g. shadowRoot.innerHTML in web components)
        document.querySelectorAll('script').forEach((script: any) => {
          const scriptText = script.textContent || '';
          const styleMatches = scriptText.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
          if (styleMatches) {
            for (const match of styleMatches) {
              cssBlocks.push(match.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, ''));
            }
          }
        });
      } catch {
        const styleMatches = withoutTemplates.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        if (styleMatches) {
          for (const match of styleMatches) {
            cssBlocks.push(match.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, ''));
          }
        }
      }
    } else if (JS_EXTS.test(file)) {
      const styleMatches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
      if (styleMatches) {
        for (const match of styleMatches) {
          cssBlocks.push(match.replace(/^<style[^>]*>/i, '').replace(/<\/style>$/i, ''));
        }
      }
    }
  }
  // Parse each block in isolation so CSS EOF error recovery closes any unterminated
  // block, string, url(, or comment at its own boundary instead of swallowing later blocks.
  // Preserves full AST instances (including duplicate/fallback declarations) without re-serializing.
  const sheet = parse('', { allowUnknownPseudos: true });
  for (const block of cssBlocks) {
    const parsedBlock = parse(unwrapGlobalPseudo(block), { allowUnknownPseudos: true });
    for (const rule of Array.from(parsedBlock.cssRules)) {
      (rule as any)._parentStyleSheet = sheet;
      (sheet as any)._rules.push(rule);
    }
  }
  cssStyleSheetCache.set(cacheKey, sheet);
  return sheet;
}

export function populateJsProject(project: Project, files: string[]): void {
  for (const file of files) {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
    if (TEST_FILE_EXTS.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');

    if (JS_EXTS.test(file) && !HTML_EXTS.test(file)) {
      project.createSourceFile(file, content, { overwrite: true });
    } else if (HTML_EXTS.test(file)) {
      try {
        if (file.endsWith('.astro')) {
          const frontmatter = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
          if (frontmatter && frontmatter[1]) {
            project.createSourceFile(`${file}_frontmatter.ts`, frontmatter[1], { overwrite: true });
          }
        }
        const document = parseHtmlDocument(file, content);
        document.querySelectorAll('script').forEach((script: any, idx: number) => {
          if (script.textContent) {
            project.createSourceFile(`${file}_script_${idx}.ts`, script.textContent, { overwrite: true });
          }
        });
      } catch {
        // Fallback for non-standard HTML fragments
      }
    }
  }
}

export function getJsProject(files: string[]): Project {
  const { Project } = require('ts-morph') as typeof import('ts-morph');
  const project = new Project({ useInMemoryFileSystem: true });
  populateJsProject(project, files);
  return project;
}

export function getHtmlDocuments(files: string[]): Array<{ file: string; document: any }> {
  const docs: Array<{ file: string; document: any }> = [];
  for (const file of files) {
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
    if (HTML_EXTS.test(file)) {
      const content = fs.readFileSync(file, 'utf8');
      docs.push({ file, document: parseHtmlDocument(file, content) });
    }
  }
  return docs;
}
