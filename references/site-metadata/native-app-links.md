# Native app links

Open when a site has an iOS or Android app and links to the site should open the app, the site should promote the app, or a link card should offer the app.

## The choices

| Goal | Apple | Android | Elsewhere |
| --- | --- | --- | --- |
| Open the app from any link to the site | Universal links, from `apple-app-site-association` [1, 2] | App Links, from `assetlinks.json` [3] | |
| Promote the app on the site | Smart App Banner, the `apple-itunes-app` tag [4] | The manifest's `related_applications` with `prefer_related_applications` [5] | |
| Offer the app in a link card | | | X app card tags [6] |
| Share sign-in credentials with the app | `webcredentials` in `apple-app-site-association` [1] | | |

## Universal links on Apple platforms

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["ABCDE12345.com.example.app"],
        "components": [
          { "/": "/buy/*" },
          { "/": "/help/website/*", "exclude": true },
          { "/": "/help/*" }
        ]
      }
    ]
  },
  "webcredentials": { "apps": ["ABCDE12345.com.example.app"] }
}
```

- **Where:** `https://<domain>/.well-known/apple-app-site-association`, with no file extension [1].
- **Serving:** over https with a valid certificate and no redirects [1].
- **Each subdomain:** `example.com`, `www.example.com` and `support.example.com` each serve their own file and each need their own entry in the app's entitlement [1].
- **App IDs:** the team's 10-character application identifier prefix, a dot, then the bundle ID [1].
- **Components:** each entry matches a URL's path (`/`), query items (`?`) or fragment (`#`), and `"exclude": true` keeps matching URLs out of the app. Apple's example lists an exclusion before the broader pattern it carves out of [1].
- **Fetching:** apps ask an Apple CDN, not the site, for the file; the CDN fetches it within 24 hours, and devices check for updates about once a week after installation [1].
- **Same-site taps stay in Safari:** a universal link tapped on a page of the same domain opens in Safari; one tapped from another domain opens the app [2].

## Android App Links

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.app",
    "sha256_cert_fingerprints": ["14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"]
  }
}]
```

- **Where:** `https://<domain>/.well-known/assetlinks.json` [3].
- **The fingerprint:** the SHA-256 of the app's signing certificate. With Play App Signing, a fingerprint from a local `keytool` run usually does not match the one on users' devices; Play Console's App signing page shows the right one and a ready snippet [3]. The list can hold several fingerprints, such as debug and release builds [3].
- **Several apps or sites:** one file can list several apps, and several sites can each list the same app [3].
- **Dynamic rules:** on Android 15 and later, the file can also carry server-side matching rules for paths, fragments and query parameters [3].

## Promoting the app

- **Smart App Banner:** `<meta name="apple-itunes-app" content="app-id=123456789, app-argument=https://example.com/item/42">`; details in [Apple platforms](apple-platforms.md) [4].
- **The manifest:** on Android, `related_applications` with `"prefer_related_applications": true` sends people to the app's Google Play page instead of installing the site, and Chrome no longer treats the site itself as installable [5].
- **X app cards:** `twitter:app:id:iphone`, `twitter:app:id:ipad` and `twitter:app:id:googleplay` with matching names and deep links; see [X cards](x-cards.md) [6].

## In the bundled scripts

- **Writing the files:** `siteFiles.appLinks` in the [preview configuration](preview-config.md) writes both files: `apple` takes `appIDs`, `components`, `webcredentials` and `appclips`; `android` takes `package`, `sha256` and `relations`. Malformed app IDs and fingerprints are refused.
- **Checking them:** the [metadata audit](metadata-audit.md) checks each file's structure, an `apple-app-site-association.json` name, `apple-itunes-app` and `prefer_related_applications`.
- **Serving:** both files live under `/.well-known/`; see [Well-known files](well-known-files.md) for static hosts.

## Sources

1. Apple Developer Documentation, [Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
2. Apple Developer Documentation, [Allowing apps and websites to link to your content](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
3. Android Developers, [Configure website associations and dynamic rules](https://developer.android.com/training/app-links/configure-assetlinks)
4. Apple Developer Documentation, [Promoting apps with Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners)
5. web.dev, [What does it take to be installable?](https://web.dev/articles/install-criteria)
6. X Developer Platform, [App card](https://web.archive.org/web/20260204163853/https://developer.x.com/en/docs/x-for-websites/cards/overview/app-card) (archived 4 February 2026)

LevyBytes. [Original document](https://github.com/LevyBytes/AI-SKILL-modern-web-development/blob/main/references/site-metadata/native-app-links.md). Written for this skill from the primary sources listed above.
