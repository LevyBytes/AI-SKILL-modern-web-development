#### 11. `chrome.action` API requires `action` in manifest

Using `chrome.action.setBadgeText`, `chrome.action.setIcon`, or `chrome.action.onClicked` requires
an `"action"` key in manifest.json — even if it's empty. Without it, `chrome.action` is `undefined`.

```js
// ❌ BROKEN — manifest has no "action" key
await chrome.action.setBadgeText({ text: '5' });
// TypeError: Cannot read properties of undefined (reading 'setBadgeText')

// ✅ FIX — add "action" to manifest.json (at minimum an empty object)
{ "action": {} }
// or with a popup:
{ "action": { "default_popup": "popup/popup.html" } }
```

#### 12. `activeTab` only works on direct user gestures — not from side panels

`activeTab` grants temporary access to the current tab ONLY on a direct user gesture (action
icon click, context menu item, keyboard shortcut, omnibox suggestion) — NOT from a button click
inside a side panel or popup. Use `tabs` + `host_permissions` instead. See
`references/extensions/permissions.md` and `references/extensions/side-panel.md`.

#### 13. DevTools panel URLs are relative to the extension root

When creating a DevTools panel, the panel HTML path is relative to the **extension root**, NOT
relative to the devtools page that calls `chrome.devtools.panels.create()`.

```js
// ❌ BROKEN — path relative to devtools/ directory
chrome.devtools.panels.create("My Panel", "", "panel/panel.html");

// ✅ CORRECT — full path from extension root
chrome.devtools.panels.create("My Panel", "", "devtools/panel/panel.html");
```

See `references/extensions/devtools.md`.

#### 14. Offscreen documents have NO access to most chrome.* APIs

Offscreen documents (`chrome.offscreen`) are **severely restricted**. Most `chrome.*` APIs
are unavailable, including `chrome.downloads`, `chrome.tabs`, `chrome.action`, and others.

```js
// ❌ BROKEN — chrome.downloads is undefined in offscreen documents
chrome.downloads.download({ url, filename: 'recording.webm' }); // TypeError

// ❌ BROKEN — chrome.action is undefined in offscreen documents
chrome.action.setBadgeText({ text: 'REC' }); // TypeError
```

**The only APIs available in offscreen documents are:**
- `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`
- `chrome.runtime.getURL`
- Standard Web APIs (DOM, fetch, MediaRecorder, Canvas, Web Audio, etc.)

**Rule of thumb:** Offscreen documents do the Web API work (recording, parsing, audio). The service worker does all chrome.* API work (downloads, badge updates, notifications). Use `chrome.runtime.sendMessage` to bridge between them. See `references/extensions/message-passing.md`.

#### 15. Notifications and badge icons must reference real image files

`chrome.notifications.create()` requires a valid `iconUrl` pointing to an actual image file.
If the file doesn't exist or the path is wrong, the call fails with `"Unable to download all specified images."`

```js
// ❌ BROKEN — icon file doesn't exist
chrome.notifications.create('reminder', {
  type: 'basic',
  iconUrl: 'icons/icon-128.png', // File not in extension!
  title: 'Reminder',
  message: 'Time is up!'
});

// ✅ Generate a data URL at runtime via OffscreenCanvas — no file needed.
// See `references/extensions/icons.md` for a reusable implementation.
const iconUrl = await getIconDataUrl();
chrome.notifications.create('reminder', { type: 'basic', iconUrl, title: 'Reminder', message: 'Time is up!' });
```

This applies to ALL image references in chrome.* APIs — notifications, `chrome.action.setIcon`,
context menu icons, etc. **If you reference a file, it must exist.**


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/SKILL.md#L175-L255). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
