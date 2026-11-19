# Store Listing Tips & Common Rejections

## Writing Effective Descriptions

### Short Description (132 chars max)

This appears in search results and category pages. It's your elevator pitch. Rules:

- Start with a verb or the extension's function: "Blocks ads on all websites" not "Ad blocker"
- Be specific: "Translates selected text into 50+ languages" not "Translation tool"
- Include the primary keyword naturally
- Don't waste characters on "Chrome extension" — the user already knows

**Good examples:**
- "Save articles to read later with one click. Works offline."
- "Replace new tab with a minimal dashboard showing weather and tasks"
- "Highlight and annotate text on any webpage. Export notes as Markdown."

**Bad examples:**
- "The best productivity tool for Chrome!" (vague, marketing-speak)
- "Extension for helping you do things better" (says nothing)
- "NEW! Amazing tab manager extension tool app for Chrome browser" (keyword stuffing)

### Detailed Description (16,000 chars max)

The CWS strips all markdown formatting. Use plain text with line breaks. Structure:

```
[One sentence: what does this extension do?]

FEATURES
• Feature 1 — brief explanation
• Feature 2 — brief explanation
• Feature 3 — brief explanation

HOW TO USE
1. Click the extension icon in the toolbar
2. [Next step]
3. [Next step]

PRIVACY
This extension does not collect any personal data. Your [data type] is stored
locally on your device and never transmitted to any server.

PERMISSIONS
• "Read and change data on sites you visit" — needed to [specific feature].
  The extension only activates when you [trigger action].

SUPPORT
Found a bug? Have a suggestion? Email [email] or open an issue at [URL].

Version [X.Y.Z] — [Brief changelog for latest version]
```

### The Implementation-Detail Rule

**Never describe how the extension is built.** Potential users are not developers evaluating your stack — they want to know what the extension does for them.

Strip all of the following from every piece of copy:

- Web API names: `MutationObserver`, `IntersectionObserver`, `Service Worker`, `Shadow DOM`, `IndexedDB`, `WebSockets`
- Chrome API names: `chrome.storage`, `declarativeNetRequest`, `chrome.scripting`, `offscreen document`
- Framework/library names: React, custom elements, Lit, Webpack, TypeScript
- Architecture descriptions: "background processing", "event-driven", "declarative"

**Transform every implementation sentence into a user benefit:**

| Before (implementation) | After (user benefit) |
|-------------------------|----------------------|
| "Uses a MutationObserver to detect page changes" | "Automatically detects new content as you browse" |
| "Built with custom elements and Shadow DOM" | "Works seamlessly without affecting page styles" |
| "Powered by a service worker" | "Runs quietly in the background" |
| "Your settings are synced via chrome.storage.sync" | "Your settings sync across all your devices" |
| "Implements declarativeNetRequest for filtering" | "Blocks ads and trackers without reading your page content" |

### Why This Structure Works

1. **One-sentence opener** — The reviewer and users both scan the first line. Make it count.
2. **Features list** — Users scan for capabilities. Plain-text bullets (•) render well.
3. **How to use** — Reduces support requests and proves the extension actually works.
4. **Privacy section** — Pre-empts user concerns about permissions. Builds trust.
5. **Permissions explanation** — Users see permission warnings during install. If you
   explain them in the description, they're less likely to abort installation.
6. **Support info** — Required by CWS policy ("meaningful customer support").
7. **Latest version note** — Shows the extension is actively maintained.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/store-listing.md#L1-L86). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
