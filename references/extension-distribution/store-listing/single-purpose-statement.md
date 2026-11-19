### Single Purpose Statement

This is filled in the developer dashboard, not shown to users. The review team reads it
carefully. It must be a single sentence that describes the extension's narrow purpose.

**Approved examples:**
- "Saves highlighted text from web pages to a local reading list"
- "Replaces the new tab page with a customizable dashboard"
- "Blocks cookie consent banners on websites"

**Rejected examples:**
- "Improves your browsing experience" (too vague)
- "Productivity and organization tool" (too broad)
- "Highlights text, saves bookmarks, manages tabs, and blocks ads" (not single purpose)

If your extension does multiple things, focus on the primary function. The detailed
description can cover secondary features.

## Common Rejection Reasons

### 1. Excessive Permissions

**Symptom:** "Your extension requests more permissions than it needs."

**Fix:**
- Replace `<all_urls>` with specific host patterns
- Replace `tabs` with `activeTab` if you only need the current tab on click
- Remove permissions you're not using
- Ensure every permission has a clear justification

### 2. Missing or Inadequate Single Purpose

**Symptom:** "Your item does not have a single, clear purpose."

**Fix:**
- Rewrite the single purpose field to be narrow and specific
- If the extension truly does too many unrelated things, consider splitting it

### 3. Misleading Description or Functionality

**Symptom:** "Your extension does not provide the functionality described."

**Fix:**
- Ensure every feature listed in the description actually works
- Remove claims about features you haven't built yet
- Don't use superlatives ("the best", "the fastest") unless verifiable

### 4. Privacy Policy Issues

**Symptom:** "Your extension requires a privacy policy." or "Your privacy policy URL
is not accessible."

**Fix:**
- Host the privacy policy at a stable, public URL
- Ensure it's not behind a login wall
- Make sure it covers all data the extension actually collects
- Match the privacy policy with the data disclosure form

### 5. Trademark Violation

**Symptom:** "Your extension uses trademarked content without authorization."

**Fix:**
- Don't use other companies' names in your extension name (e.g., "YouTube Downloader")
- Don't use logos or brand colors that imply affiliation
- Use generic terms: "Video Downloader for [site]" might be fine, but check the site's terms

### 6. Code Readability

**Symptom:** "Your extension contains obfuscated code."

**Fix:**
- Minification is allowed; obfuscation is not
- If using a bundler (webpack, rollup, vite), ensure source maps are NOT included but
  the output is minified, not obfuscated
- Don't use string encoding tricks to hide code intent

### 7. Remote Code Execution

**Symptom:** "Your extension executes remotely hosted code."

**Fix:**
- Bundle all JavaScript in the extension package
- Don't load scripts from CDNs at runtime
- Don't use `eval()` or `new Function()` with remote content
- Fetching JSON data from APIs is fine; fetching and executing JS is not


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/store-listing.md#L87-L173). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
