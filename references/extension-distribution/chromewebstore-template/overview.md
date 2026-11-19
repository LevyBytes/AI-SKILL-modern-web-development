[Complete example](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/chromewebstore-template.md#L9-L178). Related sections: [Permission and privacy disclosures](permission-and-privacy-disclosures.md).
# CHROMEWEBSTORE.md Template

Copy this template into the project root as `CHROMEWEBSTORE.md` and fill in each section.
Fields marked `[REQUIRED]` must be completed before submission. Fields marked `[RECOMMENDED]`
are optional but improve listing quality and approval odds.

---

```markdown
# Chrome Web Store Listing — [Extension Name]

> Last Updated: YYYY-MM-DD

## Store Listing

**Extension Name** [REQUIRED]
<!-- Must match manifest.json "name". Max 75 characters. -->


**Short Description** [REQUIRED]
<!-- Max 132 characters. Shown in search results and tiles. Be specific about function. -->


**Detailed Description** [REQUIRED]
<!-- Max 16,000 characters. Structure recommendation:
     Line 1: One-sentence summary of what the extension does
     Paragraph 2: Key features (use line breaks, not bullet points — CWS strips markdown)
     Paragraph 3: How to use it (step-by-step)
     Paragraph 4: Privacy/permissions note (builds trust)
     Paragraph 5: Support/feedback info

     WRITE FROM A USER'S PERSPECTIVE — what the extension does FOR them, not HOW it works.
     Never mention implementation details: APIs used, libraries, frameworks, code patterns.

     ❌ "Uses a MutationObserver and custom elements to track page changes"
     ✅ "Automatically detects new content as you scroll"

     ❌ "Powered by a service worker for background processing"
     ✅ "Runs quietly in the background without slowing your browser"

     ❌ "Implements declarativeNetRequest for network filtering"
     ✅ "Blocks ads and trackers without reading your page content"
-->


**Category** [REQUIRED]
<!-- Pick one: Accessibility, Blogging, Developer Tools, Fun, News & Weather,
     Photos, Productivity, Search Tools, Shopping, Social & Communication, Sports -->


**Single Purpose** [REQUIRED]
<!-- One sentence. Narrow and easy to understand.
     Good: "Highlights and saves text selections on web pages"
     Bad:  "Productivity tool that helps you work better" -->


**Primary Language** [REQUIRED]
<!-- e.g., English, German, etc. -->


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 4 | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 5 | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | |

<!-- Status options: ⬜ Not created | 🟡 Needs update | ✅ Ready -->

### Screenshot Notes
<!-- Describe what each screenshot should show. Good screenshots demonstrate the extension
     in action, not just the popup. Include annotations if helpful. -->


```

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/chromewebstore-template.md#L1-L80). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
