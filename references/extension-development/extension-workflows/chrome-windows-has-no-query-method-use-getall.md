#### 19. `chrome.windows` has NO `.query()` method — use `getAll`, `getLastFocused`, or `getCurrent`

Unlike `chrome.tabs.query()`, the `chrome.windows` API does NOT have a `.query()` method.

```js
// ❌ BROKEN — chrome.windows.query does not exist
const windows = await chrome.windows.query({ focused: true });
// TypeError: chrome.windows.query is not a function

// ✅ CORRECT — use the right method for your need
const focused = await chrome.windows.getLastFocused({ populate: true });
const current = await chrome.windows.getCurrent({ populate: true });
const all     = await chrome.windows.getAll({ populate: true });
```

**`chrome.windows` methods:** `getAll`, `getLastFocused`, `getCurrent`, `get(windowId)`, `create`, `update`, `remove`. See `references/extensions/tab-management.md`.

#### 20. `chrome.permissions.request()` in the service worker must be called with no `await` before it in the message listener

A user gesture from a UI context (side panel, popup) does propagate across `chrome.runtime.sendMessage`
to the service worker's `onMessage` listener — but only for that one synchronous turn. If the
listener does an `await` (even a short delay) before calling `chrome.permissions.request()`, the
gesture is gone and the call throws `"This function must be called during a user gesture"`. Call
it as the first thing in the listener, with nothing awaited before it — see
`references/extensions/permissions.md`.

### Always Manifest V3

Never generate Manifest V2 code.
- `background.service_worker` not `background.scripts`
- `chrome.action` not `chrome.browserAction`
- `chrome.scripting.executeScript` not `chrome.tabs.executeScript`
- `host_permissions` is separate from `permissions`
- No inline scripts in HTML — use `<script src="file.js">`
- No inline event handlers — use `addEventListener`

---

## Part 2 — Publishing to the Chrome Web Store

Manage `CHROMEWEBSTORE.md` — the single source of truth for all Chrome Web Store listing
metadata, permissions justifications, privacy disclosures, version history, and publishing
readiness for a Chrome extension project.

### Core Workflow

Every time you touch a Chrome extension project in a way that affects its store presence,
update (or create) `CHROMEWEBSTORE.md` in the project root. The file tracks everything the
developer needs to fill out in the Chrome Developer Dashboard, so they can copy-paste from
a single doc instead of scrambling at publish time.

#### When to create CHROMEWEBSTORE.md

Create it the moment any of these happen:
- The user says they want to publish an extension
- The user asks to "prepare for the store" or "get ready to publish"
- You're building a new extension that will clearly end up on the store
- The user asks about store listing requirements

Use the template in `references/webstore/chromewebstore-template.md` as your starting point. Read it
before generating the file.

#### When to update CHROMEWEBSTORE.md

Update it whenever:
- **User-facing changes**: Bump the "Last Updated" date, update the feature list in
  descriptions, and add an entry to Version History
- **manifest.json changes**: If permissions, host_permissions, or content_scripts changed,
  update the Permissions Justification section — every permission needs a plain-English
  reason the review team can understand
- **New release**: Add a Version History entry with version number, date, and summary
- **Privacy-relevant changes**: If data collection, storage, or transmission changed,
  update the Privacy & Data Use section and the privacy policy
- **Asset changes**: If icons or UI changed, note which screenshots need refreshing
- **Rejection response**: If the user reports a CWS rejection, update the file with the
  fix and add a note to Version History


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/SKILL.md#L342-L418). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
