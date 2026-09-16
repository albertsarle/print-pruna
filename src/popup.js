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

async function ensureInjected(tabId) {
  const alreadyInjected = await isContentScriptInjected(tabId);
  if (!alreadyInjected) {
    await browser.scripting.insertCSS({
      target: { tabId },
      files: ["src/content.css"],
    });
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["src/content.js"],
    });
  }
}

async function startPicker(mode) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await ensureInjected(tab.id);
  await browser.tabs.sendMessage(tab.id, { type: "brx-start-picker", mode });
  window.close();
}

async function printPage() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Injectem el content script (si encara no hi és) perquè instal·li el
  // "guard" del drecera Ctrl/Cmd+P; després cridem window.print() des del
  // content script, que corre en un "isolated world" i per tant no es veu
  // afectat si la pàgina ha sobreescrit window.print.
  await ensureInjected(tab.id);
  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.print(),
  });
  window.close();
}

document.getElementById("brx-select").addEventListener("click", () => startPicker("select"));
document.getElementById("brx-remove").addEventListener("click", () => startPicker("remove"));
document.getElementById("brx-print").addEventListener("click", printPage);
