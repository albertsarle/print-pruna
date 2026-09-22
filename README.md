<p align="center">
  <img src="docs/logo.png" alt="Logo de PrintPruna" width="180" />
</p>

<h1 align="center">PrintPruna</h1>

Extensió per a Chrome i Firefox que permet marcar blocs HTML de la pàgina
actual per netejar-la abans d'imprimir-la a PDF.

## Ús

1. Fes clic a la icona de l'extensió a la barra d'eines. S'obre un petit
   menú amb cinc opcions:
   - **Selecciona**: marca el bloc que vulguis conservar; la resta de la
     pàgina s'amaga. El bloc seleccionat es reajusta (~90% d'ample,
     centrat) perquè no perdi llegibilitat si depenia d'un layout
     flex/grid amb els germans ara amagats.
   - **Elimina**: marca un bloc concret i el fa desaparèixer, mantenint la
     resta de la pàgina intacta. Es pot fer servir diverses vegades
     seguides per eliminar més d'un bloc.
   - **Redimensiona**: arrossega qualsevol de les quatre vores d'un bloc per
     canviar-ne l'amplada o l'alçada. La vora esquerra/superior segueix
     visualment el cursor (en lloc de créixer sempre cap a l'altre costat).
     El mode es manté actiu perquè es puguin ajustar diversos blocs seguits
     sense reobrir el menú.
   - **Elimina Publicitat**: escaneja tota la pàgina en un sol pas i amaga
     automàticament els blocs que semblin anuncis o banners publicitaris
     (per id/classe amb paraules com `ad`, `ads`, `sponsor`, `banner-ad`,
     etc., o iframes/scripts de xarxes publicitàries conegudes com
     Google Ads, Taboola o Outbrain). No cal seleccionar res manualment; si
     algun anunci no es detecta, es pot eliminar amb "Elimina".
   - **Imprimeix**: obre el diàleg d'impressió del navegador directament
     (`window.print()`), sense passar pel teclat. Útil en pàgines que
     bloquegen `Ctrl+P`/`Cmd+P` amb JavaScript, ja que aquesta crida es fa
     des del "isolated world" de l'extensió i no es veu afectada encara
     que la pàgina hagi sobreescrit `window.print`. Abans d'obrir el
     diàleg, desactiva els CSS de `@media print` propis de la pàgina (vegeu
     més avall) perquè el resultat imprès s'assembli al que s'ha estat
     editant a pantalla.
2. Cada mode té un cursor propi per identificar-lo d'un cop d'ull: creueta
   per "Selecciona", `not-allowed` per "Elimina", i fletxes de
   redimensionar per "Redimensiona" (que canvien a `↕`/`↔` en apropar-se a
   una vora concreta, i a una mà durant l'arrossegament). Els elements es
   ressalten en passar-hi el ratolí (blau per "Selecciona", vermell per
   "Elimina", taronja discontinu per la vora activa a "Redimensiona"). Fes
   clic (o arrossega, en el cas de "Redimensiona") sobre l'element desitjat
   per aplicar l'acció.
3. Per tornar a l'estat original, recarrega la pàgina (F5).

Prem `Esc` en qualsevol moment per sortir del mode de marcatge —o
cancel·lar un arrossegament en curs a "Redimensiona"— sense fer cap canvi.

### Redimensionar sense amagar contingut

Molts blocs de pàgines reals (carrusels, taules d'acords, widgets amb
scroll horitzontal) tenen `overflow:hidden` o `flex-wrap:nowrap` pensats
per a una mida fixa. Si només es canviés `width`/`height`, el contingut
seguiria retallat encara que el bloc creixés. Per això, en començar a
arrossegar una vora, PrintPruna també:

- Força `overflow: visible` a l'element, als seus descendents i als seus
  ancestres (fins a `<body>`) que estiguessin clipant contingut.
- Força `flex-wrap: wrap` als contenidors flex en una sola fila (típics de
  carrusels amb botó de "següent"), perquè els elements es reorganitzin
  dins l'espai nou en lloc de sobreposar-se a la resta de la pàgina.

Tot això es desfà si es cancel·la l'arrossegament amb `Esc`; si es
completa, els canvis es mantenen igual que la resta de mutacions de
l'extensió.

### Ignorant els CSS de `print` de la pàgina

Moltes pàgines defineixen el seu propi full d'estils de `print` (o blocs
`@media print` dins d'un full normal) per canviar com es veu el contingut
en imprimir-lo, i sovint aquest disseny no coincideix amb el que s'ha
estat editant a pantalla amb "Selecciona"/"Elimina"/"Redimensiona". Per
evitar aquesta discrepància, en prémer "Imprimeix" (o `Ctrl+P`/`Cmd+P`)
l'extensió:

- Desactiva temporalment qualsevol full d'estils o `<link>`/`<style>` amb
  `media="print"`.
- Neutralitza els blocs `@media print { ... }` dins de fulls d'estils que
  no siguin ells mateixos `print`-only.
- Restaura tot això automàticament quan es tanca el diàleg d'impressió
  (event `afterprint`), tant si s'ha imprès com si s'ha cancel·lat.

Com que això s'aplica de forma general, en algunes pàgines que facin
servir el seu `@media print` per corregir problemes de renderitzat propis
del motor d'impressió (per exemple, tècniques CSS com `mask-image` que
alguns navegadors no dibuixen bé en generar el PDF) el resultat imprès pot
perdre alguna d'aquestes correccions puntuals. És un compromís assumit
conscientment: es prioritza que la impressió sigui fidel al que s'ha
editat a pantalla per sobre d'ajustos de compatibilitat específics de
cada web.

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
src/popup.html    Menú de la icona amb les opcions "Selecciona", "Elimina", "Redimensiona", "Elimina Publicitat" i "Imprimeix"
src/popup.js      Injecta el content script (si cal) i envia el mode triat
src/content.js    Lògica de hover, selecció/eliminació/redimensionament de blocs i escaneig heurístic de publicitat
src/content.css   Estils del ressaltat en hover, els cursors per mode i l'overlay d'arrossegament
icons/            Icones de l'extensió (icon48.png, icon128.png)
docs/logo.png     Logo en gran per al README / store listing
```
