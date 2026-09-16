# Block Removal - Clean Print

Extensió per a Chrome i Firefox que permet seleccionar un bloc HTML de la
pàgina actual i amagar tota la resta de contingut, per poder-la imprimir de
forma neta.

## Ús

1. Fes clic a la icona de l'extensió a la barra d'eines. El cursor canvia a
   una creueta i, en passar el ratolí pels elements de la pàgina, es
   ressalten en vermell.
2. Fes clic sobre el bloc que vulguis conservar. La resta de la pàgina
   s'amaga (`display: none`).
3. Imprimeix la pàgina normalment (`Ctrl+P` / `Cmd+P`).
4. Per tornar a l'estat original, recarrega la pàgina (F5).

Prem `Esc` en qualsevol moment per sortir del mode selecció sense amagar res.

## Instal·lació en mode desenvolupador

### Chrome / Edge / Brave

1. Obre `chrome://extensions`.
2. Activa "Mode desenvolupador" (cantonada superior dreta).
3. Clica "Carrega l'extensió sense empaquetar" i selecciona aquesta carpeta.

### Firefox

1. Obre `about:debugging#/runtime/this-firefox`.
2. Clica "Carrega el complement temporal" i selecciona el fitxer
   `manifest.json` d'aquesta carpeta.

> Nota: la càrrega a Firefox és temporal i es perd en tancar el navegador.
> Per una instal·lació permanent caldria signar l'extensió via
> [addons.mozilla.org](https://addons.mozilla.org).

## Estructura

```
manifest.json         Manifest V3, compartit entre Chrome i Firefox
src/background.js     Gestiona el clic a la icona i injecta el content script
src/content.js        Lògica de hover, selecció i ocultació de la resta de blocs
src/content.css        Estils del ressaltat en hover i el cursor de selecció
vendor/browser-polyfill.js  Petit shim per unificar browser.* / chrome.*
icons/                 Icones de l'extensió
```
