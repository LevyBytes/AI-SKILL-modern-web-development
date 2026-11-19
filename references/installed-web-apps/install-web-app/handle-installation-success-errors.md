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

{{ BASELINE_STATUS("manifest") }}

Browsers that do not use web app manifests can still present the application as
a normal website. Treat installation and standalone display as enhancements; do
not block access to core functionality when manifest-based installation is
unavailable.

### `<install>` fallback

{{ BASELINE_STATUS("install") }}

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

{{ BASELINE_STATUS("navigator-install") }}

When `navigator.install()` is unavailable, use the `beforeinstallprompt` event
as a fallback for installing the current app. Unlike `navigator.install()`, this
event cannot install a different app.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/guides/pwa/install-web-app/guide.md#L255-L329). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
