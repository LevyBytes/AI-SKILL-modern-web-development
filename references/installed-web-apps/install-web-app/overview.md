```yaml
---
name: install-web-app
description: Install web applications from a page using browser-controlled consent UI.
web-feature-ids:
  - install
  - navigator-install
  - beforeinstallprompt
  - manifest
---
```

# Installing web applications

Use the Web Install API to give users an explicit, in-page way to install a web
application. Installation is always completed through browser-controlled consent
UI; websites cannot silently install an app.

Use either the HTML `<install>` element or the JavaScript
`navigator.install()` method.

## Choose which install approach to use: HTML element or JavaScript method

Decide to use either the HTML `<install>` element or the JavaScript
`navigator.install()` method based on the following considerations.

* `<install>` element:
  {# Dynamic "Launch" label for installed apps is not currently supported due to installed-state privacy constraints (crbug.com/485281836). #}
  * Pros:
    * The browser provides the install control, ensuring a consistent and
      trustworthy installation experience.
    * Installing another app does not trigger a separate permission prompt
      before the installation confirmation dialog.
    * No JavaScript is required to trigger the installation.
  * Cons:
    * Visual customization of the button is restricted.
    * The number of `<install>` elements on a page is capped by user-agent
      anti-spam limits, making `navigator.install()` a better fit for large app
      catalogs. {# Chromium currently caps install elements at 24 per page. #}

* JavaScript `navigator.install()` method:

  * Pros:
    * The installation UI can be fully customized to match the look and feel of
      the website.
    * The number of installation UI elements is not limited by the browser.
  * Cons:
    * Requires JavaScript to trigger the installation.
    * Installing another app triggers an initial `web-app-installation`
      permission prompt before the installation confirmation dialog.

## Prepare the web app

The app being installed must have a web app manifest. Give the manifest a stable
`id` so the browser can keep the app's identity separate from its launch URL.
For installation of the current app, link the manifest from the document.

```html
<!-- The current document's manifest is used by the no-argument install APIs. -->
<link rel="manifest" href="/manifest.webmanifest">
```

```json
{
  "id": "/",
  "name": "Example application",
  "short_name": "Example",
  "start_url": "/",
  "display": "standalone",
  "icons": [
    {
      "src": "/icons/app-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/app-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Keep the manifest URL stable. For current-document installation, the manifest
must explicitly declare an `id` that is same-origin with the document. When
offering a different app by manifest URL, the manifest must be reachable over
HTTPS without credentials or redirects (CORS headers are not required), return a
JSON MIME `Content-Type` (such as `application/manifest+json`), and share the
same origin as that app's `start_url`.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/guides/pwa/install-web-app/guide.md#L1-L89). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
