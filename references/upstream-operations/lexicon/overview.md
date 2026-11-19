Related section: [Uplift](uplift.md).
# Evaluation & Benchmark Lexicon

The canonical domain language for Modern Web Guidance evaluation datasets, benchmark execution, grading, and reporting (`src/harness/`, `src/grading/`, `src/authoring/`, `src/dashboard/`). Distinct from the analyzer domain vocabulary in [`src/analyzing/LEXICON.md`](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/src/analyzing/LEXICON.md).

This lexicon governs documentation, CLI help, and dashboard UI terminology first; legacy internal symbols, flags, and artifact paths cited in `_Reference_` remain unchanged until follow-up code migrations.

## Benchmark Structure

### Dataset

The repository's complete collection of evaluation **Tasks** across guides (authored in guide `targets/` and legacy `tasks/` directories). Distinct from a **Job**, which executes a configured selection of tasks at a point in time, and from an analyzer **Grading Deck** (`src/analyzing/LEXICON.md`).

* _Reference_: `src/core/guide-validation.ts#getTaskMap`
* _AKA_: Evaluation Suite — `Agentic Benchmarks + Evals` / Anthropic eval terminology
* _Avoid_: Test Suite, Suite (for the static collection)

### Task

A single benchmark problem pairing a developer prompt (`task.md`), a **Base App**, and a Playwright **Grader** (`grader.ts`, derived from `expectations.md`). One guide may have multiple tasks across different base apps or Baseline targets (`widely` / `newly` / `limited`).

* _Reference_: `src/core/guide-validation.ts#TaskInfo`, `guides/<category>/<slug>/targets/<base_app>/task.md`
* _Avoid_: Scenario, Test Case

### Base App

A starter web application (`daily-grind`, `devtools-times`, `cards-app`, `empty-app`) stored in `src/harness/base-apps/` and copied as the clean starting workspace for a **Task** or ad-hoc `gd run`. Per-guide task inputs (`task.md`, `grader.ts`, patches) targeting that starter app live in `guides/<category>/<slug>/targets/<base_app>/` for historical reasons; distinct from a Web Platform Baseline feature target (`widely` / `newly` / `limited`).

* _Reference_: `src/core/guide-validation.ts#getSupportedBaseApps`, `src/harness/base-apps/`
* _Avoid_: Template (in CLI/UI prose), Target App

## Execution & Conditions

### Job

One batch execution of the **Eval Harness** across a configured selection of **Tasks**, **Conditions**, and repetitions for an **Agent Harness** and model snapshot (for example, a nightly schedule, a baseline release snapshot, or an ad-hoc invocation). Each row on the evaluation dashboard landing page represents one job.

* _Reference_: `src/harness/run-suite.ts`, `src/dashboard/summary-extractor.js#JobSummary`, `results/suites/`
* _AKA_: Job — Harbor Framework
* _Avoid_: Suite, Suite Run, Run (unscoped for the batch), Trial (for a historical job point in guide trend charts)

### Trial

A single execution of an **Agent Harness** on one **Task** under one **Condition** (**Guided** or **Unguided**), producing one **Trajectory** and one set of grader **Check** results. When a **Job** repeats tasks (`×N/task`), `N` specifies **trials per condition** (one guided trial and one unguided trial per repetition). Distinct from a Chrome `Origin Trial`.

* _Reference_: `src/harness/lib/metrics.ts#RunResult`, `results/suites/<suiteId>/<n>/<guide>/<task>/<guided|unguided>/`
* _AKA_: Trial — Harbor Framework and `Agentic Benchmarks + Evals`; Attempt — Harbor Framework (`n_attempts`)
* _Avoid_: Run / Task Run (for a leaf execution), Pass (for repetition count), Trial Pair

### Condition

The A/B experimental treatment under which a **Trial** runs within a **Job**: **Guided** gives the **Agent Harness** access to `modern-web-guidance` skills and CLI retrieval, whereas **Unguided** runs the control condition without guidance tools or docs enabled.

* _Reference_: `src/harness/run-suite.ts`, `src/harness/lib/metrics.ts#calculateMetrics` (`runType: 'guided' | 'unguided'`)

### Agent Harness

The coding CLI loop paired with a model under evaluation (shorthand: **Agent** — such as Claude Code, Codex CLI, Jetski CLI, or Antigravity CLI), invoked inside an isolated sandbox via an in-repo agent runner. Distinct from the **Eval Harness**, which orchestrates benchmarking around it.

* _Reference_: `src/harness/config.ts#Agents`, `src/harness/agents/`
* _AKA_: Agent Harness — `Agentic Benchmarks + Evals`

### Eval Harness

The repository's benchmarking infrastructure (`src/harness/`) that stages **Base App** workspaces, invokes **Agent Harness** trials, runs Playwright **Graders**, and aggregates **Job** results. Distinct from the **Agent Harness** under test.

* _Reference_: `src/harness/run-suite.ts`, `docs/EVALS.md`
* _AKA_: Evaluation Harness — `Agentic Benchmarks + Evals`

### Trajectory

The normalized structured execution history of a **Trial**, parsed from raw agent session logs into turns, reasoning, tool calls, skill searches, guide retrievals, and file edits. Distinct from unparsed raw CLI session files and `modern-web.log` sidecars.

* _Reference_: `src/harness/lib/trajectory-normalizer.ts#TrajectorySummary`
* _AKA_: Trajectory — Harbor Framework (`ATIF`); Trace / Transcript — `Agentic Benchmarks + Evals`

## Grading & Outcomes

### Grader

A Playwright test file (`grader.ts`, authored from `expectations.md`) that verifies a **Task** workspace by inspecting built artifacts, DOM state, computed styles, and browser runtime behavior. Distinct from an individual **Check** inside it and from an analyzer **Detection Eval Judge** (`src/analyzing/LEXICON.md`).

* _Reference_: `src/grading/run-grader.ts`, `guides/<category>/<slug>/targets/<base_app>/grader.ts`
* _Avoid_: Spec (outside Playwright internals), LLM Judge (reserved for `src/analyzing/`)

### Check

A single deterministic assertion executed by a **Grader** during a **Trial**; pass rate equals checks passed divided by checks run across valid paired tasks. Distinct from the whole `grader.ts` **Grader** file.

* _Reference_: `src/harness/lib/metrics.ts#ScenarioCheck`, `src/harness/lib/metrics.ts#calculateMetrics`
* _Avoid_: Assertion (in UI/metrics copy for a check)


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/docs/LEXICON.md#L1-L91). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
