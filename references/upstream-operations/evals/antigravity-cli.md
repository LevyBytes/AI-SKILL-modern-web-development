Related section: [Evaluation harness](overview.md).
### Antigravity CLI

Antigravity CLI (`antigravity_cli`) is the default agent used by the guide development workflows (`gd dev`).

**Installation:**
Antigravity CLI (`agy`) must be installed first:
```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```
Then run `agy` once interactively to sign in.

**Configuration:**
All settings are optional. If you sign in with a personal Antigravity account, no GCP project is needed. If you use agy through a GCP project, set it in `~/.gemini/antigravity-cli/settings.json` (`gcp.project`), or override it in your `.env` file:
```bash
# Optional: GCP project (only for GCP-project auth)
ANTIGRAVITY_GCP_PROJECT=<YOUR-GCP-PROJECT-ID>
# Optional: path to the agy binary if it is not on your PATH (e.g. under cron)
ANTIGRAVITY_CLI_BIN=/home/<you>/.local/bin/agy
# Optional: model override for Antigravity CLI agent runs
ANTIGRAVITY_MODEL=gemini-3.8-flash-medium
# Optional: reasoning effort (`--effort <level>`); defaults to agy's built-in effort when unset.
# Cannot be combined with a tiered model ID that already ends in a level suffix (like `gemini-3.8-flash-medium`).
# ANTIGRAVITY_EFFORT=high
```

---

### Reasoning Effort Recording & Conflict Rule

Each trial (`trajectory_summary.json`) and job (`evals.json`) records `reasoningEffort: { level?: string, source: 'observed' | 'configured' | 'model-id' | 'agent-default' }` alongside `model` (precedence: `observed > configured > model-id > agent-default`):

- **Antigravity CLI (`ANTIGRAVITY_EFFORT`)**, **Jetski CLI (`JETSKI_EFFORT`)**, and **Claude Code (`CLAUDE_EFFORT`)** pass `--effort <level>`.
- **Codex CLI (`CODEX_EFFORT`)** passes `-c model_reasoning_effort=<level>`.
- **Pi (`PI_MODEL` / `PROMPT_MODEL`)** accepts thinking levels via a `:<thinking>` suffix on the model ID (for example `openrouter/deepseek/deepseek-v4.1-flash:low` or `...:off`).
- **Startup conflict check:** Setting `<AGENT>_EFFORT` alongside a model ID that already ends in a `-<level>` or `:<level>` tier suffix (such as `gemini-3.8-flash-medium` or `opus-5.5-high`) throws a startup error instead of passing conflicting flags. When neither an effort env var nor a model-ID tier is present and logs do not report an observed tier, `reasoningEffort` is recorded as `{ source: 'agent-default' }`.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/docs/EVALS.md#L74-L108). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
