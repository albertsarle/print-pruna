const browser = window.browser || window.chrome;

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

async function startPicker(mode) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

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
  }

  await browser.tabs.sendMessage(tab.id, { type: "brx-start-picker", mode });
  window.close();
}

document.getElementById("brx-select").addEventListener("click", () => startPicker("select"));
document.getElementById("brx-remove").addEventListener("click", () => startPicker("remove"));
