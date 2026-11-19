Related section: [Migrate web app origin](overview.md).
## Fallbacks & browser support

{{ BASELINE_STATUS("app-migration") }}

### Manual reinstallation prompt

For browsers that do not support automatic migration, the user will remain on the old installation. You should implement a UI element (e.g., a notification banner) on the old origin that directs the user to the new site.

The user's settings will not be migrated, and the old app will not be automatically uninstalled.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/guides/pwa/migrate-web-app-origin/guide.md#L93-L101). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
