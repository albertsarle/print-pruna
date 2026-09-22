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

  let activeEdge = null; // "left" | "right" | "top" | "bottom" | null
  let edgeHoverEl = null;
  let resizeState = null;
  const RESIZE_EDGE_THRESHOLD = 6; // px
  const RESIZE_MIN_SIZE = 20; // px

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
      if (resizeState) {
        cancelResizeDrag();
        event.stopPropagation();
        return;
      }
      stopPicking();
    }
  }

  function detectEdge(el, clientX, clientY) {
    if (!el || el === document.documentElement || el === document.body) return null;
    const computedDisplay = getComputedStyle(el).display;
    if (computedDisplay === "inline") return null;

    const rect = el.getBoundingClientRect();
    const nearLeft = Math.abs(clientX - rect.left) <= RESIZE_EDGE_THRESHOLD;
    const nearRight = Math.abs(clientX - rect.right) <= RESIZE_EDGE_THRESHOLD;
    const nearTop = Math.abs(clientY - rect.top) <= RESIZE_EDGE_THRESHOLD;
    const nearBottom = Math.abs(clientY - rect.bottom) <= RESIZE_EDGE_THRESHOLD;

    const withinVertical = clientY >= rect.top - RESIZE_EDGE_THRESHOLD && clientY <= rect.bottom + RESIZE_EDGE_THRESHOLD;
    const withinHorizontal = clientX >= rect.left - RESIZE_EDGE_THRESHOLD && clientX <= rect.right + RESIZE_EDGE_THRESHOLD;

    if (nearTop && withinHorizontal) return "top";
    if (nearBottom && withinHorizontal) return "bottom";
    if (nearLeft && withinVertical) return "left";
    if (nearRight && withinVertical) return "right";
    return null;
  }

  function isHorizontalEdge(edge) {
    return edge === "top" || edge === "bottom";
  }

  // content.css força `cursor` amb !important sobre <html>/<body> en mode
  // resize, i un !important de la fulla d'estils guanya sempre a un estil
  // inline normal. Cal fixar el cursor també amb prioritat "important".
  function setResizeCursor(value) {
    if (value) {
      document.documentElement.style.setProperty("cursor", value, "important");
    } else {
      document.documentElement.style.removeProperty("cursor");
    }
  }

  // El cursor de <html> és una propietat heretada: qualsevol element per
  // sota del punter amb el seu propi `cursor` (enllaços, botons, etc.) el
  // sobreescriu encara que <html> tingui !important, perquè un valor propi
  // sempre guanya a un valor heretat. Durant l'arrossegament fem servir un
  // overlay transparent a pantalla completa amb el cursor fixat directament
  // sobre ell, perquè el navegador no consulti mai el cursor dels elements
  // de la pàgina.
  let dragOverlayEl = null;

  function showDragOverlay(cursorValue) {
    if (!dragOverlayEl) {
      dragOverlayEl = document.createElement("div");
      dragOverlayEl.id = "brx-resize-drag-overlay";
      document.documentElement.appendChild(dragOverlayEl);
    }
    dragOverlayEl.style.setProperty("cursor", cursorValue, "important");
  }

  function hideDragOverlay() {
    if (dragOverlayEl) {
      dragOverlayEl.remove();
      dragOverlayEl = null;
    }
  }

  function clearEdgeHighlight() {
    if (edgeHoverEl) {
      edgeHoverEl.classList.remove("brx-resize-edge-highlight");
      edgeHoverEl = null;
    }
    activeEdge = null;
    setResizeCursor(null);
  }

  function onResizeMouseMove(event) {
    if (resizeState) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const edge = detectEdge(target, event.clientX, event.clientY);

    if (!edge) {
      clearEdgeHighlight();
      return;
    }

    if (edgeHoverEl && edgeHoverEl !== target) {
      edgeHoverEl.classList.remove("brx-resize-edge-highlight");
    }
    edgeHoverEl = target;
    activeEdge = edge;
    edgeHoverEl.classList.add("brx-resize-edge-highlight");
    setResizeCursor(isHorizontalEdge(edge) ? "ns-resize" : "ew-resize");
  }

  // Un bloc redimensionat sovint conté contenidors amb overflow:hidden/auto
  // pensats per a una mida fixa (carrusels, scrollers horitzontals, etc.).
  // Si no els obrim, el contingut queda retallat encara que el bloc creixi.
  // El "clip" real sovint no és l'element ni els seus descendents, sinó un
  // ANCESTRE (p. ex. el contenidor del carrusel que amaga l'overflow del
  // <ul> de dins), així que forcem overflow:visible també cap amunt fins a
  // <body>.
  // Un contenidor flex/grid amb `flex-wrap: nowrap` (típic de carrusels
  // horitzontals amb botons de "següent") no reorganitza els fills quan
  // l'obrim amb overflow:visible: el contingut sobrant simplement es
  // renderitza per sobre/darrere de la resta de la pàgina en lloc
  // d'aprofitar l'espai nou. Forcem flex-wrap:wrap perquè el contingut
  // flueixi dins de l'espai disponible.
  function forceVisibleOverflow(el) {
    const ancestors = [];
    let ancestor = el.parentElement;
    while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
      ancestors.push(ancestor);
      ancestor = ancestor.parentElement;
    }

    const candidates = [...ancestors, el, ...el.querySelectorAll("*")];
    const overrides = [];
    for (const node of candidates) {
      const s = getComputedStyle(node);
      const clipsOverflow = s.overflow !== "visible" || s.overflowX !== "visible" || s.overflowY !== "visible";
      const needsWrap = /flex/.test(s.display) && s.flexWrap === "nowrap";
      if (!clipsOverflow && !needsWrap) continue;

      overrides.push({
        node,
        overflow: node.style.getPropertyValue("overflow"),
        overflowX: node.style.getPropertyValue("overflow-x"),
        overflowY: node.style.getPropertyValue("overflow-y"),
        flexWrap: node.style.getPropertyValue("flex-wrap"),
      });

      if (clipsOverflow) {
        node.style.setProperty("overflow", "visible", "important");
        node.style.setProperty("overflow-x", "visible", "important");
        node.style.setProperty("overflow-y", "visible", "important");
      }
      if (needsWrap) {
        node.style.setProperty("flex-wrap", "wrap", "important");
      }
    }
    return overrides;
  }

  function restoreOverflow(overrides) {
    for (const { node, overflow, overflowX, overflowY, flexWrap } of overrides) {
      if (overflow) node.style.setProperty("overflow", overflow, "important");
      else node.style.removeProperty("overflow");
      if (overflowX) node.style.setProperty("overflow-x", overflowX, "important");
      else node.style.removeProperty("overflow-x");
      if (overflowY) node.style.setProperty("overflow-y", overflowY, "important");
      else node.style.removeProperty("overflow-y");
      if (flexWrap) node.style.setProperty("flex-wrap", flexWrap, "important");
      else node.style.removeProperty("flex-wrap");
    }
  }

  function onResizeMouseDown(event) {
    if (!activeEdge || !edgeHoverEl) return;
    event.preventDefault();
    event.stopPropagation();

    const el = edgeHoverEl;
    const computed = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    const originalBoxSizing = el.style.getPropertyValue("box-sizing");
    if (computed.boxSizing !== "border-box") {
      el.style.setProperty("box-sizing", "border-box", "important");
    }

    const originalFlex = el.style.getPropertyValue("flex");
    const parent = el.parentElement;
    if (parent && /flex/.test(getComputedStyle(parent).display)) {
      el.style.setProperty("flex", "0 0 auto", "important");
    }

    // Per a les vores superior/esquerra volem que la vora arrossegada
    // segueixi el cursor (en lloc de créixer sempre cap avall/dreta amb la
    // vora oposada fixa). Ho simulem amb position:relative + un desplaçament
    // top/left en sentit contrari, compensant el marge perquè el contingut
    // que ve després no es mogui.
    const originalPosition = el.style.getPropertyValue("position");
    if (computed.position === "static") {
      el.style.setProperty("position", "relative", "important");
    }
    const originalTop = el.style.getPropertyValue("top");
    const originalLeft = el.style.getPropertyValue("left");
    const originalMarginBottom = el.style.getPropertyValue("margin-bottom");
    const originalMarginRight = el.style.getPropertyValue("margin-right");
    const baseMarginBottom = parseFloat(computed.marginBottom) || 0;
    const baseMarginRight = parseFloat(computed.marginRight) || 0;

    const overflowOverrides = forceVisibleOverflow(el);

    resizeState = {
      el,
      edge: activeEdge,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      originalWidth: el.style.getPropertyValue("width"),
      originalHeight: el.style.getPropertyValue("height"),
      originalBoxSizing,
      originalFlex,
      originalPosition,
      originalTop,
      originalLeft,
      originalMarginBottom,
      originalMarginRight,
      baseMarginBottom,
      baseMarginRight,
      overflowOverrides,
    };

    setResizeCursor("grabbing");
    showDragOverlay("grabbing");

    document.addEventListener("mousemove", onResizeDragMove, true);
    document.addEventListener("mouseup", onResizeDragEnd, true);
  }

  function onResizeDragMove(event) {
    if (!resizeState) return;
    const { el, edge, startX, startY, startWidth, startHeight, baseMarginBottom, baseMarginRight } = resizeState;

    if (edge === "left" || edge === "right") {
      const dx = edge === "right" ? event.clientX - startX : startX - event.clientX;
      const newWidth = Math.max(RESIZE_MIN_SIZE, startWidth + dx);
      el.style.setProperty("width", `${newWidth}px`, "important");
      if (edge === "left") {
        el.style.setProperty("left", `${-dx}px`, "important");
        el.style.setProperty("margin-right", `${baseMarginRight - dx}px`, "important");
      }
    } else {
      const dy = edge === "bottom" ? event.clientY - startY : startY - event.clientY;
      const newHeight = Math.max(RESIZE_MIN_SIZE, startHeight + dy);
      el.style.setProperty("height", `${newHeight}px`, "important");
      if (edge === "top") {
        el.style.setProperty("top", `${-dy}px`, "important");
        el.style.setProperty("margin-bottom", `${baseMarginBottom - dy}px`, "important");
      }
    }
  }

  function endResizeDrag() {
    document.removeEventListener("mousemove", onResizeDragMove, true);
    document.removeEventListener("mouseup", onResizeDragEnd, true);
    resizeState = null;
    hideDragOverlay();
    setResizeCursor(activeEdge ? (isHorizontalEdge(activeEdge) ? "ns-resize" : "ew-resize") : null);
  }

  function onResizeDragEnd() {
    endResizeDrag();
  }

  function cancelResizeDrag() {
    if (!resizeState) return;
    const {
      el,
      originalWidth,
      originalHeight,
      originalBoxSizing,
      originalFlex,
      originalPosition,
      originalTop,
      originalLeft,
      originalMarginBottom,
      originalMarginRight,
      overflowOverrides,
    } = resizeState;

    if (originalWidth) el.style.setProperty("width", originalWidth, "important");
    else el.style.removeProperty("width");

    if (originalHeight) el.style.setProperty("height", originalHeight, "important");
    else el.style.removeProperty("height");

    if (originalBoxSizing) el.style.setProperty("box-sizing", originalBoxSizing, "important");
    else el.style.removeProperty("box-sizing");

    if (originalFlex) el.style.setProperty("flex", originalFlex, "important");
    else el.style.removeProperty("flex");

    if (originalPosition) el.style.setProperty("position", originalPosition, "important");
    else el.style.removeProperty("position");

    if (originalTop) el.style.setProperty("top", originalTop, "important");
    else el.style.removeProperty("top");

    if (originalLeft) el.style.setProperty("left", originalLeft, "important");
    else el.style.removeProperty("left");

    if (originalMarginBottom) el.style.setProperty("margin-bottom", originalMarginBottom, "important");
    else el.style.removeProperty("margin-bottom");

    if (originalMarginRight) el.style.setProperty("margin-right", originalMarginRight, "important");
    else el.style.removeProperty("margin-right");

    restoreOverflow(overflowOverrides);

    endResizeDrag();
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
    document.documentElement.classList.toggle("brx-mode-resize", mode === "resize");
    document.addEventListener("keydown", onKeyDown, true);
    if (mode === "resize") {
      document.addEventListener("mousemove", onResizeMouseMove, true);
      document.addEventListener("mousedown", onResizeMouseDown, true);
    } else {
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("mouseout", onMouseOut, true);
      document.addEventListener("click", onClick, true);
    }
  }

  function stopPicking() {
    picking = false;
    document.documentElement.classList.remove("brx-picking", "brx-mode-remove", "brx-mode-resize");
    if (currentHoverEl) {
      currentHoverEl.classList.remove("brx-hover-highlight");
      currentHoverEl = null;
    }
    if (resizeState) cancelResizeDrag();
    clearEdgeHighlight();
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("mousemove", onResizeMouseMove, true);
    document.removeEventListener("mousedown", onResizeMouseDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "brx-start-picker") {
      if (picking) stopPicking();
      const nextMode = message.mode === "remove" ? "remove" : message.mode === "resize" ? "resize" : "select";
      startPicking(nextMode);
    }
  });
})();
