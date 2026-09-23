const browser = window.browser || window.chrome;

// El HTML no admet `__MSG_...__` (només `manifest.json` ho substitueix
// automàticament), així que omplim els textos traduïbles a mà a l'arrencada
// del popup segons l'idioma del navegador (`chrome.i18n` tria el missatge
// disponible més proper a la configuració de l'usuari, amb el `default_locale`
// del manifest com a últim recurs).
document.documentElement.lang = browser.i18n.getUILanguage();
for (const el of document.querySelectorAll("[data-i18n]")) {
  const message = browser.i18n.getMessage(el.dataset.i18n);
  if (message) el.textContent = message;
}

// Els paths de `files` han de portar barra inicial ("/..."). Chrome els
// resol igual amb o sense barra (relatius a l'arrel de l'extensió), però
// a Firefox un path sense barra inicial (p. ex. "src/content.css") falla
// silenciosament amb un error genèric ("An unexpected error occurred"),
// sense cap detall que ho delati.
async function injectContentScript(tabId) {
  await browser.scripting.insertCSS({
    target: { tabId },
    files: ["/src/content.css"],
  });
  await browser.scripting.executeScript({
    target: { tabId },
    files: ["/src/content.js"],
  });
}

// Comprovar si el content script ja hi és amb un executeScript de sondeig
// abans de cada missatge costa un round-trip addicional a l'API scripting,
// encara que el cas comú (script ja injectat en una pàgina que ja s'havia
// obert el popup) no en necessiti cap. En lloc d'això, provem d'enviar el
// missatge directament: si no hi ha cap listener (pàgina encara no
// injectada), sendMessage rebutja la promesa amb "Could not establish
// connection. Receiving end does not exist." i és llavors quan injectem i
// reintentem, un únic cop. Un altre motiu de rebuig (p. ex. una pestanya
// chrome:// on scripting.executeScript no és permès) no s'ha d'amagar
// darrere d'un reintent inútil: deixem que l'error original es propagui.
function isMissingReceiverError(error) {
  return typeof error?.message === "string" && error.message.includes("Receiving end does not exist");
}

async function sendToContentScript(tabId, message) {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!isMissingReceiverError(error)) throw error;
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

// Els listeners no poden ser `async` directament: si la promesa que retorna
// startPicker/printPage/removeAds es rebutja (p. ex. perquè scripting.insertCSS
// o tabs.sendMessage fallen), el rebuig queda "unhandled" i no es veu enlloc.
// Resultat: el popup es queda obert i el clic sembla no fer res, sense cap
// pista de l'error real a la consola de l'usuari. Capturem l'error i el
// mostrem explícitament perquè almenys quedi registrat.
function handleClick(action) {
  return () => {
    action().catch((error) => {
      console.error("[PrintPruna]", error);
    });
  };
}

document.getElementById("brx-select").addEventListener("click", handleClick(() => startPicker("select")));
document.getElementById("brx-remove").addEventListener("click", handleClick(() => startPicker("remove")));
document.getElementById("brx-resize").addEventListener("click", handleClick(() => startPicker("resize")));
document.getElementById("brx-remove-ads").addEventListener("click", handleClick(removeAds));
document.getElementById("brx-print").addEventListener("click", handleClick(printPage));
