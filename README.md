# Block Removal - Clean Print

Extensió per a Chrome i Firefox que permet marcar blocs HTML de la pàgina
actual per netejar-la abans d'imprimir-la.

## Ús

1. Fes clic a la icona de l'extensió a la barra d'eines. S'obre un petit
   menú amb dues opcions:
   - **Selecciona**: marca el bloc que vulguis conservar; la resta de la
     pàgina s'amaga. El bloc seleccionat es reajusta (~90% d'ample,
     centrat) perquè no perdi llegibilitat si depenia d'un layout
     flex/grid amb els germans ara amagats.
   - **Elimina**: marca un bloc concret i el fa desaparèixer, mantenint la
     resta de la pàgina intacta. Es pot fer servir diverses vegades
     seguides per eliminar més d'un bloc.
2. En qualsevol dels dos modes, el cursor canvia a una creueta i els
   elements es ressalten en passar-hi el ratolí (blau per "Selecciona",
   vermell per "Elimina"). Fes clic sobre l'element desitjat per aplicar
   l'acció.
3. Imprimeix la pàgina normalment (`Ctrl+P` / `Cmd+P`).
4. Per tornar a l'estat original, recarrega la pàgina (F5).

Prem `Esc` en qualsevol moment per sortir del mode de marcatge sense fer cap
canvi.

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
manifest.json     Manifest V3, compartit entre Chrome i Firefox
src/popup.html    Menú de la icona amb les opcions "Selecciona" i "Elimina"
src/popup.js      Injecta el content script (si cal) i envia el mode triat
src/content.js    Lògica de hover, selecció/eliminació de blocs
src/content.css   Estils del ressaltat en hover i el cursor de marcatge
icons/            Icones de l'extensió
```
