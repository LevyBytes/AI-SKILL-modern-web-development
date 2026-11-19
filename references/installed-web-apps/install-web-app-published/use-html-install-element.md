## Use the HTML `<install>` element

The `<install>` element renders a user-agent-controlled button. Prefer it when
the browser's standard label and presentation are appropriate, because the
browser-owned control gives users a trustworthy installation affordance.

```html
<!-- No attributes installs the current document's linked web app. -->
<install></install>
```

To offer another web app (including a cross-origin app from an app catalog or
suite launcher), provide its manifest URL. The target `manifest` URL and its
`start_url` must share the same origin, and the manifest must be reachable
without credentials or redirects and return a JSON MIME `Content-Type`:

```html
<install manifest="https://app.example/manifest.webmanifest"></install>
```

Prefer declaring an explicit, stable `id` in the target manifest. If the target
manifest does not declare an `id`, you must supply its computed manifest ID in
the `manifestid` attribute so the browser can verify the expected app identity:

```html
<install
  manifest="https://app.example/manifest.webmanifest"
  manifestid="https://app.example/"
></install>
```

When a manifest omits `id`, the browser computes its fallback ID by resolving
the manifest's `start_url` against the manifest URL (not the installing page)
and stripping any URL fragment while keeping query parameters. For example, a
manifest at `https://app.example/catalog/manifest.webmanifest` with no `id` and
`"start_url": "../launch?source=catalog"` has a computed ID of
`https://app.example/launch?source=catalog`. Supplying `manifestid` checks that
computed identity; it does not override the manifest or keep the identity stable
if `start_url` later changes.

The `manifestid` attribute can either be absolute or relative. Relative values
are resolved against the installing document's base URL, and the resulting URL
must match the target manifest's processed ID.

Do not imitate, overlay, or transform the browser-controlled element. Its
presentation and activation restrictions protect users from deceptive
installation prompts.

### Handle installation success and errors

Listen for the `installresult` event to handle installation success and errors
and use the `event.result` property to determine the outcome:

* `"success"`: the app was installed, or the user approved an action (such as
  opening) for an already-installed app. Pages cannot distinguish between these
  two cases.
* `"aborted"`: the user canceled the installation or a browser condition
  prevented the installation from completing.
* `"invalid-data"`: the `manifest` or `manifestid` attribute values, manifest
  response, or required manifest fields are invalid.

```html
<install></install>
<p id="install-status" role="status"></p>

<script type="module">
  const installButton = document.querySelector("install");
  const installStatus = document.querySelector("#install-status");

  installButton.addEventListener("installresult", (event) => {
    switch (event.result) {
      case "success":
        installStatus.textContent = "The app was installed or opened.";
        break;
      case "aborted":
        installStatus.textContent =
          "Installation was canceled or could not complete.";
        break;
      case "invalid-data":
        installStatus.textContent =
          "Installation could not start because the app data is invalid.";
        break;
    }
  });
</script>
```


GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance/blob/64a6d708f5a43f2cd3fde5d4d7db3905ba1bdf65/skills/modern-web-guidance/guides/pwa/install-web-app.md#L79-L165). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
