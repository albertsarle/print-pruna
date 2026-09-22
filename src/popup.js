const browser = window.browser || window.chrome;

async function injectContentScript(tabId) {
  await browser.scripting.insertCSS({
    target: { tabId },
    files: ["src/content.css"],
  });
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["src/content.js"],
  });
}

// Comprovar si el content script ja hi és amb un executeScript de sondeig
// abans de cada missatge costa un round-trip addicional a l'API scripting,
// encara que el cas comú (script ja injectat en una pàgina que ja s'havia
// obert el popup) no en necessiti cap. En lloc d'això, provem d'enviar el
// missatge directament: si no hi ha cap listener (pàgina encara no
// injectada), sendMessage rebutja la promesa i és llavors quan injectem i
// reintentem, un únic cop.
async function sendToContentScript(tabId, message) {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    await injectContentScript(tabId);
    await browser.tabs.sendMessage(tabId, message);
  }
}

async function startPicker(mode) {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await sendToContentScript(tab.id, { type: "brx-start-picker", mode });
  window.close();
}

async function printPage() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Injectem el content script (si encara no hi és) perquè instal·li el
  // "guard" del drecera Ctrl/Cmd+P; després li enviem un missatge perquè
  // sigui ell qui cridi window.print(), ja que corre en un "isolated world"
  // i per tant no es veu afectat si la pàgina ha sobreescrit window.print.
  // Fer-ho via missatge (en lloc d'un executeScript separat) permet que el
  // content script desactivi primer els CSS de `print` propis de la pàgina,
  // perquè la impressió reflecteixi el que es veu a pantalla.
  await sendToContentScript(tab.id, { type: "brx-print" });
  window.close();
}

async function removeAds() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  await sendToContentScript(tab.id, { type: "brx-remove-ads" });
  window.close();
}

document.getElementById("brx-select").addEventListener("click", () => startPicker("select"));
document.getElementById("brx-remove").addEventListener("click", () => startPicker("remove"));
document.getElementById("brx-resize").addEventListener("click", () => startPicker("resize"));
document.getElementById("brx-remove-ads").addEventListener("click", removeAds);
document.getElementById("brx-print").addEventListener("click", printPage);
