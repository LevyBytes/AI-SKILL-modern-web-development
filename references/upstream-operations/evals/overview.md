Related section: [Antigravity CLI](antigravity-cli.md).
# Evaluation Harness & Agent Configuration

This document provides comprehensive instructions and configuration details for executing the evaluation harness across supported AI coding agents.

## Overview

The evaluation harness measures how effectively AI coding agents adopt modern web APIs. It runs automated benchmarks across various agent harnesses and validates their implementation against outcome-based Playwright checks.

Supported agents are defined in the `Agents` object within [`src/harness/config.ts`](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/src/harness/config.ts).

---

## Agents

### Claude Code

The Claude Code agent (`claude_code`) is implemented with [Claude Code on Vertex AI](https://code.claude.com/docs/en/google-vertex-ai).

**Configuration:**
1. Log in with `gcloud` and set your active project ID:
   ```bash
   gcloud config set project <YOUR-GCP-PROJECT-ID>
   ```
2. Ensure your GCP project has enabled the Vertex AI API and the desired model in the Model Garden.
3. Set the following environment variables in your `.env` file or session:
   ```bash
   CLAUDE_CODE_USE_VERTEX=1
   CLOUD_ML_REGION=global
   ANTHROPIC_VERTEX_PROJECT_ID=<YOUR-GCP-PROJECT-ID>
   ANTHROPIC_MODEL=<enabled-model-in-vertex>
   # Optional: reasoning effort (`--effort <level>`); defaults to Claude Code's built-in effort when unset (captured as `observed` from `api-request` or `assistant` logs when present).
   # Cannot be combined with a model ID that already ends in a level suffix (e.g., `opus-5.5-high`).
   # CLAUDE_EFFORT=high
   ```

---

### Codex CLI

To use the Codex CLI agent, you will need to request an exception, which appears when attempting to use it:

```bash
node_modules/.bin/codex
```

1. This request should file a bug similar to [`b/492300931`](https://b.corp.google.com/issues/492300931).
2. After approval, restart the CLI locally and log in to your account.
3. Set your preferred model (and optional reasoning effort) in your environment:
   ```bash
   CODEX_MODEL='gpt-5.5'
   # Optional: reasoning effort (`-c model_reasoning_effort=<level>`); defaults to `~/.codex/config.toml` / CLI default when unset.
   # Cannot be combined with a model ID ending in a level suffix.
   # CODEX_EFFORT=high
   ```

---

### Jetski CLI

Jetski CLI (`jetski_cli`) can be used by the guide development workflows (`gd dev`) via the `GD_DEV_USE_JETSKI` flag.

**Configuration:**
Configure the preferred model for Jetski CLI agent runs:
```bash
# Model selection for Jetski CLI agent runs
JETSKI_MODEL='Gemini 3.8 Flash (Medium)'
# Optional: reasoning effort (`--effort <level>`) when using a base model ID without a level suffix; defaults to Jetski CLI's built-in effort.
# JETSKI_EFFORT=high
GD_DEV_USE_JETSKI=1  # Required to use Jetski CLI for 'gd dev'
```

---


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/docs/EVALS.md#L1-L73). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
