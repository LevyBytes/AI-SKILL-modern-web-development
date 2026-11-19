#### 16. Tab capture: guard against double-start with state locking

`chrome.tabCapture.getMediaStreamId()` fails with `"Cannot capture a tab with an active stream"`
if called while a previous capture is still active. Fast double-clicks on the extension icon
easily trigger this. Use explicit state locking:

```js
// ❌ BROKEN — no guard against rapid clicks
let isRecording = false;
chrome.action.onClicked.addListener(async (tab) => {
  if (isRecording) { stopRecording(); isRecording = false; }
  else { isRecording = true; startRecording(tab); } // Second click = "active stream" error
});

// ✅ CORRECT — use transitional states to lock out concurrent operations
// State machine: 'idle' → 'starting' → 'recording' → 'stopping' → 'idle'
// Store state in chrome.storage.session (survives SW restart, cleared on browser close)
chrome.action.onClicked.addListener(async (tab) => {
  const { recordingState = 'idle' } = await chrome.storage.session.get('recordingState');

  if (recordingState === 'starting' || recordingState === 'stopping') return;

  if (recordingState === 'idle') {
    await chrome.storage.session.set({ recordingState: 'starting' });
    try {
      await startRecording(tab);
      await chrome.storage.session.set({ recordingState: 'recording' });
      await chrome.action.setBadgeText({ text: 'REC' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } catch (err) {
      console.error('Failed to start recording:', err);
      await chrome.storage.session.set({ recordingState: 'idle' });
    }
  } else if (recordingState === 'recording') {
    await chrome.storage.session.set({ recordingState: 'stopping' });
    try { await stopRecording(); }
    finally {
      await chrome.storage.session.set({ recordingState: 'idle' });
      await chrome.action.setBadgeText({ text: '' });
    }
  }
});
```

This pattern applies to any chrome API that manages exclusive resources:
`chrome.tabCapture`, `chrome.desktopCapture`, `chrome.offscreen.createDocument` (only one
offscreen document allowed at a time). See `references/extensions/media-capture.md`.

#### 17. `chrome.desktopCapture` requires a target tab with URL access

When calling `chrome.desktopCapture.chooseDesktopMedia()` from a service worker, you must pass
the active tab as the `targetTab` parameter. The tab object must have its `url` field populated,
which requires the `"tabs"` permission.

```js
// ❌ BROKEN — called without targetTab from service worker
chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], (streamId) => { ... });
// Error: "A target tab is required when called from a service worker context."

// ❌ BROKEN — tab doesn't have url field (missing "tabs" permission)
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], tab, (streamId) => { ... });
// Error: "targetTab doesn't have URL field set."

// ✅ CORRECT — "tabs" permission in manifest + pass tab object
// manifest.json: { "permissions": ["tabs", "desktopCapture"] }
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], tab, (streamId) => {
  if (!streamId) return; // User cancelled
});
```

**Note:** Prefer `chrome.tabCapture.getMediaStreamId()` for tab-only recording. Use `chrome.desktopCapture` only when the user should choose which screen/window to capture. See `references/extensions/media-capture.md`.

#### 18. User scripts: four non-obvious pitfalls

`chrome.userScripts` runs **user-provided code** at runtime. Use it for script managers and
user automation — not for extension-bundled scripts.

- **API throws on property access if not enabled.** Chrome 138+ requires the user to toggle "Allow User Scripts" on the extension's details page; Chrome < 138 requires Developer mode. Always call `isUserScriptsAvailable()` before any `chrome.userScripts.*` call and show an error UI when it returns false.
- **Registered scripts are cleared on extension update.** Persist configs in `chrome.storage`; re-register them in `runtime.onInstalled` for the `"update"` reason.
- **Messaging requires explicit opt-in.** Call `configureWorld({ messaging: true })` first; listen on `runtime.onUserScriptMessage`, not `runtime.onMessage`.
- **`ScriptSource` constraint:** each `js` entry must have exactly one of `code` or `file`. **`id` constraint:** cannot start with `_`.

See `references/extensions/user-scripts.md`.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/SKILL.md#L256-L341). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
