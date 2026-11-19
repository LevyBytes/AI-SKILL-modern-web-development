## Use the JavaScript `navigator.install()` method

Use `navigator.install()` in a secure context (HTTPS) when custom page UI is
necessary. Keep the button hidden until a supported installation mechanism is
available. Call `navigator.install()` directly from the click handler so the
call retains the required transient user activation.

```html
<button id="install-app" type="button" hidden>Install app</button>
<p id="install-status" role="status"></p>

<script type="module">
  const installButton = document.querySelector("#install-app");
  const installStatus = document.querySelector("#install-status");
  const supportsWebInstall =
    typeof Navigator.prototype.install === "function";

  if (supportsWebInstall) {
    installButton.hidden = false;
  }

  installButton.addEventListener("click", async () => {
    if (installButton.getAttribute("aria-disabled") === "true") {
      return;
    }
    // Use aria-disabled instead of disabled so activating the button does not drop focus.
    installButton.setAttribute("aria-disabled", "true");

    try {
      // MANDATORY: Call during the click handler; delayed calls lose user activation.
      await navigator.install();
      installStatus.textContent = "The app was installed or opened.";
      installButton.hidden = true;
    } catch (error) {
      if (error.name === "AbortError") {
        // Cancellation is an expected user choice; keep the button available to retry.
        installStatus.textContent = "Installation was canceled or could not complete.";
      } else {
        installStatus.textContent = "Installation could not start.";
        // Surface invalid manifests and unexpected platform failures to developers.
        console.error(error);
      }
    } finally {
      installButton.removeAttribute("aria-disabled");
    }
  });
</script>
```

Calling `navigator.install()` with no arguments installs the current document's
linked app and requires the manifest to declare an `id`.

To offer another app (including a cross-origin app, provided the target
`manifest` URL and its `start_url` share the same origin and the manifest is
served over HTTPS with a JSON MIME `Content-Type`), pass its manifest URL:

```js
await navigator.install({
  manifest: "https://app.example/manifest.webmanifest",
});
```

Prefer declaring an explicit, stable `id` in the target manifest. If that
manifest does not declare an `id`, also pass the target web app's computed
manifest ID (`start_url` resolved against the manifest URL without fragments)
so the browser can verify the expected identity:

```js
await navigator.install({
  manifest: "https://app.example/manifest.webmanifest",
  manifestId: "https://app.example/",
});
```

The `manifestId` option can either be absolute or relative. Relative values are
resolved against the installing document's base URL, and the resulting URL must
match the target manifest's processed ID.


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance/blob/64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65/skills/modern-web-guidance/guides/pwa/install-web-app.md#L166-L243). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
