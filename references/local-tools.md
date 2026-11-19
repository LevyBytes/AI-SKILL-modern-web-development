# Local lookup and grading

Run these commands from the skill directory using Node.js 22.18 or later. Lookup uses Node built-ins. Each search result contains a topic ID, edition and local page path. Use the page path to read a specific section or the topic ID to read the complete guide in its preferred edition. Source footers remain in the retrieved text.

```powershell
node scripts/lookup.ts search "IME composing text" --limit 5
node scripts/lookup.ts retrieve ime-safe-enter-submit --edition expectations
node scripts/lookup.ts retrieve references/form-controls/ime-safe-enter-submit/overview.md
node scripts/lookup.ts list --area extension-development
node scripts/lookup.ts verify
node scripts/lookup.ts rebuild
```

Use `--lexical` to search by terms only. The optional semantic signal uses frozen vectors for covered guide IDs. Rebuild reads the area catalogs and local content pages, regenerating the compressed lexical index, edition map and content hashes. It requires no model or network access. Newly indexed topics receive lexical coverage immediately. New semantic vectors require a separate embedding build. Results are suggestions, including for unrelated queries. For a scope-only result, follow the related guides listed in its source metadata.

## Grade a local implementation

Install the grading dependencies from `scripts/package.json` into a working copy of the tools. Use the same Playwright installation for the grader and the runner. The runner accepts a trusted grader module and a local HTML file or directory. By default it serves the target on a temporary loopback port. For a framework app, start its development or preview server through the app's normal workflow and pass its loopback address with `--url`. The source directory remains available for static assertions.

```powershell
npm ci --prefix scripts --ignore-scripts --no-audit --no-fund
node scripts/grader-lint.ts --json ./evals/example/grader.ts
node scripts/run-grader.ts --grader ./evals/example/grader.ts --target ./fixtures/working --control ./fixtures/failing --output ./results
```

Supply your own grader and fixtures at the indicated paths. A grader can import `test` and `expect` from `test-fixture.ts` and request the worker fixture `TARGET_URL`. The runner also sets `TARGET_FILE` and `TARGET_URL` for existing Playwright graders. Select a directory for whole-project source inspection or a single file to restrict static assertions to that file. Use a Playwright-installed Chromium or pass `--browser` with the path to a compatible installed browser. Each run uses its own output directory and retains a JSON report, runner log and failure attachments.

`skipUnless({ unsupported: 'feature-id' })` is for a fallback test. Pass `--features` a local JSON object mapping feature IDs to observed boolean support. The test runs when at least one listed feature is unsupported. An undeclared feature fails the test. Static lint checks grader assertions and naming patterns; capability support comes from the supplied test profile.

A positive control must pass at least one test with no unexpected failures or flaky tests. Calibration requires a passing case to fail on the negative control with a recognizable Playwright or Node assertion. Inspect its report to confirm that the failing assertion checks the intended behavior. The runner consumes prepared fixture variants.

Unmodified upstream scripts and their versioned source identities are bundled under `assets/upstream/` for comparison. Use the ports under `scripts/` for the commands above.
