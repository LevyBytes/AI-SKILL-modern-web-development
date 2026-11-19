Related section: [Review checklist](overview.md).
## Updates (for existing extensions)

- [ ] **CHROMEWEBSTORE.md version history updated** — New entry with version, date, and
      summary of changes.
- [ ] **Last Updated date bumped** — If any user-facing changes were made.
- [ ] **Feature list in descriptions updated** — If new features were added.
- [ ] **Permissions justification updated** — If manifest.json permissions changed.
- [ ] **Screenshots refreshed** — If the UI changed significantly.
- [ ] **Privacy disclosures updated** — If data practices changed.

## Packaging Script

To create a clean ZIP for submission, use a script like:

```bash
#!/bin/bash
# package-extension.sh — Creates a clean ZIP for Chrome Web Store submission

EXTENSION_NAME="my-extension"
VERSION=$(node -p "require('./manifest.json').version")
OUTPUT="${EXTENSION_NAME}-v${VERSION}.zip"

# Remove old package
rm -f "$OUTPUT"

# Create ZIP excluding dev files
zip -r "$OUTPUT" . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".env" \
  -x "*.map" \
  -x "tests/*" \
  -x "__tests__/*" \
  -x "*.test.*" \
  -x "*.spec.*" \
  -x ".eslintrc*" \
  -x ".prettierrc*" \
  -x "tsconfig.json" \
  -x "package.json" \
  -x "package-lock.json" \
  -x "webpack.config.*" \
  -x "vite.config.*" \
  -x "rollup.config.*" \
  -x "CHROMEWEBSTORE.md" \
  -x "README.md" \
  -x "CHANGELOG.md" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x "*.sh" \
  -x "store-assets/*"

echo "Packaged: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
```

Customize the exclusion list for your project. The key principle: ship only what Chrome
needs to run the extension.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/skills-src/chrome-extensions/references/webstore/review-checklist.md#L90-L145). [Upstream licensing terms](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/README.md#license). Reorganized for this edition.
