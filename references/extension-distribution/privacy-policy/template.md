Related section: [Privacy policy](overview.md).
### Template

```
Privacy Policy for [Extension Name]

Last updated: [Date]

## What Data We Collect

[Describe each type of data collected and the feature that requires it.]

## How Data Is Stored

[Describe storage mechanism — local only, synced, or server-side.]

## How Data Is Used

[Describe each use case. Tie to specific features.]

## Third-Party Services

[List any third-party services used. Link to their privacy policies.
If none, state "This extension does not use any third-party services."]

## Data Sharing

[State whether data is shared. If yes, with whom and why.]

## Data Retention and Deletion

[How long data is kept. How users can delete it.]

## Changes to This Policy

[How and when the policy may be updated. How users will be notified.]

## Contact

[Email or support URL for privacy inquiries.]
```

## Common Mistakes

- **Policy doesn't match the data disclosure form**: The CWS data disclosure form and your
  privacy policy must be consistent. If the form says "no data collected" but the policy
  mentions analytics, you'll be rejected.

- **Policy is too vague**: "We may collect some data" is not acceptable. Be specific.

- **Dead link**: If your privacy policy URL returns a 404, the submission is auto-rejected.
  Verify the link before submitting.

- **Missing data types**: If your extension uses `chrome.storage.sync`, that data goes to
  Google's servers — disclose this. If you make any `fetch()` calls, disclose what's sent.

- **No contact information**: The CWS requires a way for users to reach you about privacy
  concerns. Include an email address at minimum.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/privacy-policy.md#L72-L128). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
