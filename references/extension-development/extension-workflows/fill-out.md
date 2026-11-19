### How to fill it out

For each section, pull information from the actual project files:
1. Read `manifest.json` to extract name, version, description, permissions, host_permissions
2. Scan the codebase for data collection (storage, fetch calls, analytics)
3. Check for icon files and their dimensions
4. Look at the extension's UI to understand features for the description

Write store-facing copy in a tone that is specific, honest, and benefit-oriented. The Chrome
Web Store review team rejects vague descriptions. "Makes your life easier" will be rejected.
"Highlights search results on any webpage and lets you save highlights to a local list" will
pass.

**Never mention implementation details.** Users care what the extension does for them, not
how it was built. Strip any mention of APIs, libraries, frameworks, or code patterns:

| ❌ Implementation detail (cut it) | ✅ User benefit (keep it) |
|-----------------------------------|--------------------------|
| "Uses a MutationObserver to detect page changes" | "Automatically detects new content as you browse" |
| "Built with custom elements and Shadow DOM" | "Works seamlessly without affecting page styles" |
| "Powered by a service worker for background processing" | "Runs quietly in the background without slowing your browser" |
| "Leverages the chrome.storage.sync API" | "Your settings sync across all your devices" |
| "Implements declarativeNetRequest for filtering" | "Blocks ads and trackers without reading your page content" |

### CHROMEWEBSTORE.md Sections

Read `references/webstore/chromewebstore-template.md` before generating the file — it defines
what each section covers and how to fill it out. The highest-risk section is Permissions
Justification: write a specific plain-English reason per permission and per host_permission.
"Needed for the extension to work" will be rejected. Read `references/webstore/privacy-policy.md`
for guidance on generating a privacy policy.

### Pre-Publish Checklist

Before submission, run through `references/webstore/review-checklist.md`. The most common
first-submission failures:
- Every permission and host_permission must have a specific justification (not "needed to work")
- Privacy policy URL must be live and match the data use disclosure form
- At least 1 screenshot at 1280×800 or 640×400
- ZIP must exclude `.git/`, `node_modules/`, `.env`, `CHROMEWEBSTORE.md`

### Store Listing Copy Guidelines

For copy guidelines and common rejection reasons, see `references/webstore/store-listing.md`.
Key rule: lead with function ("Highlights search terms on any webpage"), not feeling ("Enjoy
searching again").

---

## Reference Files

For detailed API patterns and publishing guidance, read the relevant file BEFORE writing code or content:

| Topic | Reference |
|-------|-----------|
| Permissions | `references/extensions/permissions.md` |
| Side panels | `references/extensions/side-panel.md` |
| Content scripts & DOM | `references/extensions/content-scripts.md` |
| Popups | `references/extensions/popup-ui.md` |
| Service worker lifetime | `references/extensions/service-worker.md` |
| Code execution & CSP | `references/extensions/csp-sandbox.md` |
| API calls | `references/extensions/api-calling.md` |
| Declarative Net Request | `references/extensions/declarative-net-request.md` |
| Chrome Prompt API | `references/extensions/prompt-api.md` |
| DevTools panels | `references/extensions/devtools.md` |
| Authentication | `references/extensions/auth-identity.md` |
| Context menus | `references/extensions/context-menus.md` |
| Omnibox | `references/extensions/omnibox.md` |
| Storage | `references/extensions/storage.md` |
| Tab & window management | `references/extensions/tab-management.md` |
| Tab/desktop capture | `references/extensions/media-capture.md` |
| User scripts | `references/extensions/user-scripts.md` |
| Message passing | `references/extensions/message-passing.md` |
| Icons | `references/extensions/icons.md` |
| CHROMEWEBSTORE.md template | `references/webstore/chromewebstore-template.md` |
| Privacy policy guidance | `references/webstore/privacy-policy.md` |
| Pre-publish review checklist | `references/webstore/review-checklist.md` |
| Store listing tips & rejections | `references/webstore/store-listing.md` |


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/SKILL.md#L419-L497). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
