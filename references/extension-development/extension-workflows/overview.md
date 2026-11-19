```yaml
---
name: chrome-extensions
description: >
  Build and publish Chrome Extensions using Manifest V3 best practices. Use this skill
  whenever the user asks to create, modify, debug, or understand Chrome browser extensions,
  add-ons, or anything involving the Chrome Extensions API. Trigger on mentions of: 'Chrome
  extension', 'browser extension', 'manifest.json', 'content script', 'service worker' (in
  browser context), 'popup' (in browser extension context), 'side panel', 'chrome.* API',
  'declarativeNetRequest', 'omnibox', 'context menu' (in extension context), 'userScripts',
  'user script', 'script manager', or any request to build functionality that integrates with
  the Chrome browser UI. Also trigger for publishing to the Chrome Web Store: 'publish
  extension', preparing an extension for publishing, responding to a review rejection, writing
  permission justifications, or drafting a privacy policy.
---
```

# Chrome Extensions

Build production-quality Chrome extensions using Manifest V3 and publish them to the Chrome Web Store.

## Part 1 — Building Extensions

### Mandatory Rules

These address the most common causes of broken extensions. Violating any produces a non-functional build.

#### 1. Icons: only reference files you create — or omit icons entirely

```
❌ BROKEN — referencing files that don't exist or reusing one file for all sizes:
   "icons": { "16": "icon.png", "48": "icon.png", "128": "icon.png" }

✅ CORRECT — each size is a separate file at the correct pixel dimensions:
   "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
   (where icon-16.png is 16×16px, icon-48.png is 48×48px, icon-128.png is 128×128px)

✅ ALSO CORRECT — omit icons from manifest if you cannot generate real PNG files:
   (just remove the "icons" and "default_icon" fields — Chrome uses a default icon)
```

**If you include icon references, you MUST create the actual image files.** Generate them with a script (see `references/extensions/icons.md`) or leave them out. Never reference non-existent files.

#### 2. Side panel: you MUST provide a way to open it

Defining `"side_panel": {"default_path": "..."}` does NOT make it openable. Add a trigger:

```js
// In service-worker.js — open side panel on extension icon click
// IMPORTANT: chrome.action.onClicked ONLY fires when there is NO default_popup
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});
```

If the extension has both a popup AND side panel, add a button in the popup that calls `chrome.sidePanel.open()`. Alternatively, use `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` — but the property is `openPanelOnActionClick`, NOT `openPanelOnActionIconClick`; the "Icon" variant causes a synchronous TypeError that silently aborts the service worker. Do NOT also define `default_popup` when using `setPanelBehavior`. See `references/extensions/side-panel.md`.

#### 3. Code execution: sandboxed iframes ONLY

Extension CSP blocks `eval()`, `new Function()`, inline `<script>` in all extension pages.

```js
// ❌ BROKEN — direct iframe DOM access throws SecurityError
iframe.contentDocument.write(html);

// ❌ BROKEN — eval in extension page
eval(userCode); // CSP blocks this

// ✅ OPTION A: Sandbox in manifest + postMessage
// manifest.json: { "sandbox": { "pages": ["sandbox.html"] } }
iframe.contentWindow.postMessage({ html, css, js }, '*');
// sandbox.html receives and runs:
window.addEventListener('message', (e) => { eval(e.data.js); /* allowed in sandbox */ });

// ✅ OPTION B: Blob URL (creates separate origin, bypasses extension CSP)
iframe.src = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));

// ✅ OPTION C: srcdoc
iframe.srcdoc = `<style>${css}</style>${html}<script>${js}<\/script>`;
```

See `references/extensions/csp-sandbox.md` for full details.

#### 4. `tab.url` requires the `tabs` permission

Without it, `tab.url` silently returns `undefined` — no error thrown. See
`references/extensions/permissions.md`.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/SKILL.md#L1-L86). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
