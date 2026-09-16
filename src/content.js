(() => {
  if (window.__brxInjected) return;
  window.__brxInjected = true;

  const browser = window.browser || window.chrome;

  // Algunes pàgines capturen Ctrl/Cmd+P amb un listener de "keydown" a
  // document (o body) i fan preventDefault() per mostrar el seu propi
  // diàleg. Com que la fase de captura recorre window -> document -> ...,
  // un listener capturador registrat a `window` s'executa sempre abans que
  // un registrat a `document`, encara que el nostre s'afegeixi més tard.
  // Aturem la propagació (sense preventDefault) perquè el listener de la
  // pàgina no arribi a executar-se i el navegador faci la seva acció
  // per defecte (obrir el diàleg d'impressió natiu).
  window.addEventListener(
    "keydown",
    (event) => {
      const key = (event.key || "").toLowerCase();
      const isPrintCombo = (event.ctrlKey || event.metaKey) && !event.altKey && (key === "p" || event.code === "KeyP");
      if (isPrintCombo) {
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  let picking = false;
  let mode = "select";
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
    if (mode === "remove") {
      removeBlock(event.target);
    } else {
      selectBlock(event.target);
    }
    stopPicking();
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      stopPicking();
    }
  }

  function removeBlock(el) {
    el.style.setProperty("display", "none", "important");
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

  function startPicking(pickMode) {
    mode = pickMode;
    picking = true;
    document.documentElement.classList.add("brx-picking");
    document.documentElement.classList.toggle("brx-mode-remove", mode === "remove");
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function stopPicking() {
    picking = false;
    document.documentElement.classList.remove("brx-picking", "brx-mode-remove");
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
    if (message?.type === "brx-start-picker") {
      if (picking) stopPicking();
      startPicking(message.mode === "remove" ? "remove" : "select");
    }
  });
})();
