(() => {
  if (window.__brxInjected) return;
  window.__brxInjected = true;

  const browser = window.browser || window.chrome;

  let picking = false;
  let currentHoverEl = null;

  function onMouseOver(event) {
    if (currentHoverEl) {
      currentHoverEl.classList.remove("brx-hover-highlight");
    }
    currentHoverEl = event.target;
    currentHoverEl.classList.add("brx-hover-highlight");
  }

  function onMouseOut(event) {
    event.target.classList.remove("brx-hover-highlight");
    if (currentHoverEl === event.target) {
      currentHoverEl = null;
    }
  }

  function onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    selectBlock(event.target);
    stopPicking();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      stopPicking();
    }
  }

  function selectBlock(selectedEl) {
    // Build the ancestor chain from <body> down to the selected element.
    const chain = [];
    let node = selectedEl;
    while (node && node !== document.body) {
      chain.unshift(node);
      node = node.parentElement;
    }

    let container = document.body;
    for (const keepEl of chain) {
      for (const sibling of Array.from(container.children)) {
        if (sibling !== keepEl) {
          sibling.style.setProperty("display", "none", "important");
        }
      }
      container = keepEl;
    }

    reflowSelection(chain, selectedEl);
  }

  // Els contenidors intermedis solien dimensionar el bloc seleccionat via
  // flex/grid repartit entre germans (ara amagats), fent-lo col·lapsar a la
  // seva mida mínima. Forcem cada ancestre a block/100% i el contenidor
  // exterior a un 90% centrat perquè el bloc recuperi una amplada llegible.
  function reflowSelection(chain, selectedEl) {
    const ancestors = chain.slice(0, -1);

    for (const ancestor of ancestors) {
      const computedDisplay = getComputedStyle(ancestor).display;
      if (/flex|grid|table/.test(computedDisplay)) {
        ancestor.style.setProperty("display", "block", "important");
      }
      ancestor.style.setProperty("width", "100%", "important");
      ancestor.style.setProperty("max-width", "100%", "important");
      ancestor.style.setProperty("float", "none", "important");
      ancestor.style.setProperty("position", "static", "important");
    }

    const outer = chain[0];
    if (outer) {
      outer.style.setProperty("width", "90%", "important");
      outer.style.setProperty("max-width", "1400px", "important");
      outer.style.setProperty("margin", "0 auto", "important");
    }

    selectedEl.style.setProperty("width", "100%", "important");
    selectedEl.style.setProperty("max-width", "100%", "important");
  }

  function startPicking() {
    picking = true;
    document.documentElement.classList.add("brx-picking");
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function stopPicking() {
    picking = false;
    document.documentElement.classList.remove("brx-picking");
    if (currentHoverEl) {
      currentHoverEl.classList.remove("brx-hover-highlight");
      currentHoverEl = null;
    }
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "brx-toggle-picker") {
      picking ? stopPicking() : startPicking();
    }
  });

  startPicking();
})();
