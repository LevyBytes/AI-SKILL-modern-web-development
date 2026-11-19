// Portable adaptation of GoogleChrome Modern Web Guidance run-grader.ts.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs, stripVTControlCharacters } from 'node:util';
import type { JSONReportSuite } from '@playwright/test/reporter';
import { localURL, startTargetServer } from './target-server.ts';

const help =
  'node run-grader.ts --grader FILE --target HTML_OR_DIR [--url LOOPBACK_URL] [--output PARENT] [--browser EXECUTABLE] [--features JSON_FILE] [--control HTML_OR_DIR]';
export interface RunOptions {
  grader: string;
  target: string;
  url?: string;
  output?: string;
  browser?: string;
  features?: string;
}
function outcomes(suites: JSONReportSuite[]) {
  const passedCases: string[] = [];
  const assertionFailures: string[] = [];
  function visit(suite: JSONReportSuite) {
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        const result = test.results.at(-1);
        if (test.expectedStatus !== 'passed' || !result) continue;
        if (result.status === 'passed') passedCases.push(spec.id);
        if (
          result.status === 'failed' &&
          result.errors.some((error) =>
            /\bexpect\(|\bAssertionError\b|\bERR_ASSERTION\b/.test(
              stripVTControlCharacters(error.message ?? '').split('\n')[0],
            ),
          )
        )
          assertionFailures.push(spec.id);
      }
    }
    suite.suites?.forEach(visit);
  }
  suites.forEach(visit);
  return { passedCases, assertionFailures };
}
export async function runPlaywright(options: RunOptions) {
  const grader = fs.realpathSync(options.grader);
  const target = fs.realpathSync(options.target);
  const root = fs.statSync(target).isDirectory() ? target : path.dirname(target);
  const isDir = target === root;
  const parent = path.resolve(options.output ?? os.tmpdir());
  fs.mkdirSync(parent, { recursive: true });
  const out = fs.mkdtempSync(path.join(parent, 'web-grader-'));
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const config = fileURLToPath(new URL('./playwright.config.ts', import.meta.url));
  const featureFile = options.features ? fs.realpathSync(options.features) : '';
  const browser = options.browser ? fs.realpathSync(options.browser) : '';
  const server = options.url
    ? undefined
    : await startTargetServer(root, { targetFile: isDir ? 'index.html' : target });
  try {
    const url = options.url ? localURL(options.url) : server!.url;
    const env = {
      ...process.env,
      TARGET_FILE: target,
      TARGET_URL: url,
      GRADER_ROOT: root,
      GRADER_FILE: grader,
      GRADER_OUTPUT: path.join(out, 'artifacts'),
      GRADER_BROWSER: browser,
      GRADER_FEATURES: featureFile,
      PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(out, 'report.json'),
      PWTEST_CACHE_DIR: path.join(out, 'transform-cache'),
    };
    const child = spawn(process.execPath, [cli, 'test', '--config', config], {
      cwd: root,
      env,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const log = fs.createWriteStream(path.join(out, 'runner.log'));
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    const interrupt = () => child.kill('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    let code: number | null;
    try {
      code = await new Promise<number | null>((ok, fail) => {
        child.once('error', fail);
        child.once('close', ok);
      });
    } finally {
      process.off('SIGINT', interrupt);
      process.off('SIGTERM', interrupt);
      log.end();
    }
    const reportFile = path.join(out, 'report.json');
    if (!fs.existsSync(reportFile))
      throw Error('Playwright produced no JSON report. Inspect ' + path.join(out, 'runner.log'));
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    const stats = report.stats;
    if (!stats || report.errors?.length || code === null)
      throw Error('Runner or discovery failed. Inspect ' + reportFile);
    const cases = outcomes(report.suites);
    return {
      ...cases,
      passed:
        code === 0 && cases.passedCases.length > 0 && stats.unexpected === 0 && stats.flaky === 0,
      expected: stats.expected,
      unexpected: stats.unexpected,
      skipped: stats.skipped,
      flaky: stats.flaky,
      report: reportFile,
    };
  } finally {
    await server?.stop();
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { values } = parseArgs({
      options: {
        grader: { type: 'string' },
        target: { type: 'string' },
        url: { type: 'string' },
        output: { type: 'string' },
        browser: { type: 'string' },
        features: { type: 'string' },
        control: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.help) console.log(help);
    else {
      if (!values.grader || !values.target) throw Error(help);
      if (values.url && values.control)
        throw Error('Use separate local targets when calibrating a control.');
      const opts = { ...values, grader: values.grader, target: values.target };
      const positive = await runPlaywright(opts);
      const negative = values.control
        ? await runPlaywright({ ...opts, target: values.control })
        : undefined;
      const calibrated = negative
        ? positive.passed &&
          negative.unexpected > 0 &&
          negative.assertionFailures.some((id) => positive.passedCases.includes(id))
        : undefined;
      console.log(JSON.stringify({ positive, negative, calibrated }, null, 2));
      if (!positive.passed || calibrated === false) process.exitCode = 1;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}
