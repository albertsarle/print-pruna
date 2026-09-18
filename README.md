<p align="center">
  <img src="docs/logo.png" alt="Logo de PrintPruna" width="180" />
</p>

<h1 align="center">PrintPruna</h1>

Extensió per a Chrome i Firefox que permet marcar blocs HTML de la pàgina
actual per netejar-la abans d'imprimir-la a PDF.

## Ús

1. Fes clic a la icona de l'extensió a la barra d'eines. S'obre un petit
   menú amb tres opcions:
   - **Selecciona**: marca el bloc que vulguis conservar; la resta de la
     pàgina s'amaga. El bloc seleccionat es reajusta (~90% d'ample,
     centrat) perquè no perdi llegibilitat si depenia d'un layout
     flex/grid amb els germans ara amagats.
   - **Elimina**: marca un bloc concret i el fa desaparèixer, mantenint la
     resta de la pàgina intacta. Es pot fer servir diverses vegades
     seguides per eliminar més d'un bloc.
   - **Imprimeix**: obre el diàleg d'impressió del navegador directament
     (`window.print()`), sense passar pel teclat. Útil en pàgines que
     bloquegen `Ctrl+P`/`Cmd+P` amb JavaScript, ja que aquesta crida es fa
     des del "isolated world" de l'extensió i no es veu afectada encara
     que la pàgina hagi sobreescrit `window.print`.
2. En els modes "Selecciona" i "Elimina", el cursor canvia a una creueta i
   els elements es ressalten en passar-hi el ratolí (blau per "Selecciona",
   vermell per "Elimina"). Fes clic sobre l'element desitjat per aplicar
   l'acció.
3. Per tornar a l'estat original, recarrega la pàgina (F5).

Prem `Esc` en qualsevol moment per sortir del mode de marcatge sense fer cap
canvi.

### Sobre el bloqueig de `Ctrl+P`

Quan s'activa qualsevol opció del menú, l'extensió també instal·la un
listener de `keydown` a nivell de finestra (fase de captura) que intenta
avançar-se als listeners que la pàgina hagi enganxat a `document` per
bloquejar la drecera d'impressió. Com que la fase de captura recorre
`window → document → ...`, el nostre listener s'executa sempre primer i
atura la propagació sense cridar `preventDefault()`, deixant que el
navegador faci la seva acció per defecte. És una mitigació "best effort":
si la pàgina enganxa el seu listener directament a `window` abans que
s'injecti l'extensió, aquest mètode no el pot superar — en aquest cas,
utilitza l'opció "Imprimeix" del menú.

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
src/popup.html    Menú de la icona amb les opcions "Selecciona", "Elimina" i "Imprimeix"
src/popup.js      Injecta el content script (si cal) i envia el mode triat
src/content.js    Lògica de hover, selecció/eliminació de blocs
src/content.css   Estils del ressaltat en hover i el cursor de marcatge
icons/            Icones de l'extensió (icon48.png, icon128.png)
docs/logo.png     Logo en gran per al README / store listing
```
