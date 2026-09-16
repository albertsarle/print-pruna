importScripts("../vendor/browser-polyfill.js");

async function isContentScriptInjected(tabId) {
  try {
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(window.__brxInjected),
    });
    return Boolean(result);
  } catch {
    return false;
  }
}

browser.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const alreadyInjected = await isContentScriptInjected(tab.id);

  if (!alreadyInjected) {
    await browser.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/content.css"],
    });
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/content.js"],
    });
  } else {
    await browser.tabs.sendMessage(tab.id, { type: "brx-toggle-picker" });
  }
});
