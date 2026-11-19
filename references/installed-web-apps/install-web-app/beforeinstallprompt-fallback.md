### `beforeinstallprompt` fallback

{{ BASELINE_STATUS("beforeinstallprompt") }}

Capture the event, prevent its automatic prompt, and reveal the custom install
button only after the browser confirms that prompting is possible. Use one click
handler that selects `navigator.install()` when available and otherwise uses the
captured event. The event is single-use, so discard it before awaiting the
user's choice and hide the button unless a new `beforeinstallprompt` event fires.

```js
const installButton = document.querySelector("#install-app");
const installStatus = document.querySelector("#install-status");
const supportsWebInstall =
  typeof Navigator.prototype.install === "function";
let deferredInstallPrompt;

if (supportsWebInstall) {
  installButton.hidden = false;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;

  // Prefer navigator.install() when both mechanisms are available.
  if (!supportsWebInstall) {
    installButton.hidden = false;
  }
});

installButton.addEventListener("click", async () => {
  if (installButton.getAttribute("aria-disabled") === "true") {
    return;
  }
  // Use aria-disabled instead of disabled so activating the button does not drop focus.
  installButton.setAttribute("aria-disabled", "true");

  try {
    if (supportsWebInstall) {
      // Call directly from this handler to preserve transient user activation.
      await navigator.install();
      installStatus.textContent = "The app was installed or opened.";
      installButton.hidden = true;
    } else if (deferredInstallPrompt) {
      // Save and clear the single-use event before awaiting the user's choice.
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = undefined;
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      installStatus.textContent =
        outcome === "accepted"
          ? "The app was installed."
          : "Installation canceled.";
      if (!deferredInstallPrompt) {
        installButton.hidden = true;
      }
    }
  } catch (error) {
    if (error.name === "AbortError") {
      // Cancellation is an expected user choice; keep the button available to retry.
      installStatus.textContent = "Installation was canceled or could not complete.";
    } else {
      installStatus.textContent = "Installation could not start.";
      console.error(error);
    }
  } finally {
    installButton.removeAttribute("aria-disabled");
  }
});
```

Do not show a non-functional install button in browsers that support neither
mechanism. Hiding the button is graceful degradation: users can still use any
installation affordance provided by their browser. Do not replace the hidden
button with browser-specific step-by-step instructions unless the product has a
tested, maintained onboarding flow for those browsers.

GoogleChrome Modern Web Guidance contributors. [Original document](https://github.com/GoogleChrome/modern-web-guidance-src/blob/e8feb43e0e61c791f905904222492bf2e4e573fe/guides/pwa/install-web-app/guide.md#L330-L407). [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Upstream credits Mozilla Contributors, W3C, WHATWG and IETF. Reorganized for this edition.
