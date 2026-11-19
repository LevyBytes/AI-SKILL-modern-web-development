Related section: [Benchmark vocabulary](overview.md).
### Uplift

The delta between **Guided** and **Unguided** check pass rates measured in percentage points (`pp`, e.g., `25% -> 90%` is `+65 pp`), not relative percent change. Also labeled concisely in compact UI badges as **Lift**.

* _Reference_: `src/harness/lib/metrics.ts#calculateMetrics`, `src/dashboard/index.html`
* _AKA_: Lift — dashboard compact badges

### Infra Error

Umbrella classification for **Trials** that fail due to harness, sandbox, environment, or upstream API infrastructure rather than the quality of the generated solution, excluded from pass-rate denominators and rendered as uncertainty bands in charts. Covers:

- **Generation Error**: agent crash, non-zero exit before completion, setup failure, upstream rate-limit exhaustion, or **Agent Timeout**.
- **Grading Infra Error**: missing grader file, Playwright runner crash, missing results report, or non-solution server/browser startup failures during grading.

Not to be confused with solution-caused **`Page-Load / Build Error`** (`pageLoadFailed`), missing solution app files (`Target app missing`), **`Unguided Leak`**, or authoring-time **`Calibration Failure`**.

* _Reference_: `src/harness/lib/metrics.ts#isEarlyFailureRun`, `src/harness/lib/collection.ts#evaluateScenarioResults`, `src/authoring/dev-report.ts#DevReportFlag` (`INFRASTRUCTURE_ERROR`)
* _Avoid_: Early Failure, Run failed before grading, System error (for runtime infra failures), Generation Error (when used as the top-level umbrella)

### Page-Load / Build Error

A grading outcome recorded when the agent's modified application fails to build or hits runtime errors on initial browser load during `checkTargetPageLoad`. Tracked separately from **`Infra Error`** because build/runtime defects in agent output reflect solution quality rather than harness infrastructure (except when caused by runner/browser startup crashes).

* _Reference_: `src/grading/test-fixture.ts#checkTargetPageLoad`, `src/grading/run-grader.ts#runPlaywright`, `src/dashboard/insights.js#toJobRef` (`pageLoadFailed`)

### Unguided Leak

A control-hygiene flag triggered when an **Unguided** trial accesses or retrieves its expected guide (or `modern-web-guidance` skill), indicating contamination of the unguided baseline rather than an **`Infra Error`** or check failure.

* _Reference_: `src/harness/lib/collection.ts#collectGuideUsage`, `src/dashboard/utils.js#isUnguidedLeakTrial`

### Calibration Failure

An authoring-time `gd dev` failure where a **Task**'s **Grader** fails validation against golden solutions or the untouched baseline (`zero-passrate.patch`). Distinct from runtime **`Infra Error`** and runtime check failures within a benchmark **Job**.

* _Reference_: `src/authoring/dev-report.ts#DevReportFlag` (`CALIBRATION_FAILED`), `src/grading/run-grader.ts`

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/docs/LEXICON.md#L92-L127). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
