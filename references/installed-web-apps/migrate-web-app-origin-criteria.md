- The new origin's manifest contains a `migrate_from` field pointing back to the old origin.
- The new origin's manifest contains an `id`.
- A `.well-known/web-app-origin-association` file exists on the old origin and explicitly allows migration to the new manifest URL.
- The old app has a fallback UI with a link to the new app for browsers that do not support automatic migration.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/guides/pwa/migrate-web-app-origin/expectations.md#L1-L4). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
