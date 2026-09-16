// Lightweight shim: Firefox exposes the promise-based `browser` global natively.
// Chrome's MV3 chrome.* APIs used here (action, scripting, tabs) are already
// promise-based when no callback is passed, so we just alias `browser` to `chrome`.
if (typeof globalThis.browser === "undefined") {
  globalThis.browser = globalThis.chrome;
}
