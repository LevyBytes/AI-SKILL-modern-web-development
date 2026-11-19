### 8. User Data Disclosure Mismatch

**Symptom:** "Your extension's data usage does not match your disclosure."

**Fix:**
- Audit every `fetch()`, `XMLHttpRequest`, and `chrome.storage.sync` call
- Remember that `chrome.storage.sync` transmits data to Google's servers
- If you use any analytics library (even self-hosted), declare it
- If you log errors to an external service, declare it

## After Rejection

When an extension is rejected:

1. Read the rejection email carefully — it specifies which policy was violated
2. Update CHROMEWEBSTORE.md with the rejection reason and fix
3. Make the required changes to the extension code or listing
4. Re-verify against the pre-publish checklist
5. Resubmit through the developer dashboard
6. Note: Repeated policy violations can result in account suspension

## Review Timeline

- First submission: typically 1–3 business days, can be longer
- Updates to existing extensions: usually faster, often within 24 hours
- Expedited review: not officially available; maintaining a clean track record helps
- Deferred publishing: you can choose to publish manually after review passes,
  giving you control over timing. Must publish within 30 days of approval.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/store-listing.md#L174-L201). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
