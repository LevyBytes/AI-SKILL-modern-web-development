### Handle installation success and errors

The `navigator.install()` method returns a promise that resolves when the
installation completes or when the user approves an action (such as opening) for
an already-installed app. Pages cannot distinguish between these two cases.

The promise rejects with the following errors if the installation fails or is
canceled:

* `AbortError`:
  * The user aborted the installation.
  * The permission was denied.
  * The environment doesn't support installation.
  * Multiple concurrent installation attempts.
  * A page navigation occurred during the installation process.
* `DataError`:
  * Missing linked manifest, invalid or unreachable manifest URL, redirect, or non-JSON `Content-Type` header.
  * Missing required manifest fields, or `start_url` is not same-origin with `manifest`.
  * The manifest omits `id` and no `manifestId` was provided, or `manifestId` does not match the manifest's processed ID.
* `NotAllowedError`:
  * Missing transient user activation.
* `TypeError`:
  * An options argument omits `manifest`, or `manifest` or `manifestId` is empty or cannot be parsed as a URL.
* `InvalidStateError`:
  * The API was called from a detached document, subframe, or fenced frame.
* `SecurityError`:
  * The `web-app-installation` Permissions Policy is disabled or the document is sandboxed.

## Fallback strategies

The Web Install API is a progressive enhancement. Browsers without either modern
entry point still provide their own installation UI when they support installing
web apps.

### Web app manifest fallback

Browser support for Web app manifest: Limited availability.
Supported by: Chrome 53 (Aug 2016), Edge 79 (Jan 2020), Safari 17 (Sep 2023), and Safari iOS 15.4 (Mar 2022).
Unsupported in: Firefox.

Browsers that do not use web app manifests can still present the application as
a normal website. Treat installation and standalone display as enhancements; do
not block access to core functionality when manifest-based installation is
unavailable.

### `<install>` fallback

`<install>` is not natively supported by any major browser yet.

The `<install>` element supports fallback child content for browsers that do not
render the browser-controlled install button. Use fallback content to link to a
maintained installation help page when the product provides one.

```html
<install>
  <!-- Rendered only when the browser does not provide the install control. -->
  <a href="/install-help">How to install this app</a>
</install>
```

If browser-specific instructions would be inaccurate or difficult to maintain,
leave the element empty. It then renders no non-functional replacement in an
unsupported browser.

For a custom install button, render it separately with `hidden` and reveal it
only when `navigator.install()` is supported or a `beforeinstallprompt` event
has been captured. Do not put an always-visible imitation of the
browser-controlled install button inside the fallback content.

### `navigator.install()` fallback

navigator.install() is not natively supported by any major browser yet.

When `navigator.install()` is unavailable, use the `beforeinstallprompt` event
as a fallback for installing the current app. Unlike `navigator.install()`, this
event cannot install a different app.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance/blob/64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65/skills/modern-web-guidance/guides/pwa/install-web-app.md#L244-L320). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
