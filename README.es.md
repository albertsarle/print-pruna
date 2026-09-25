<p align="center">
  <img src="docs/logo.png" alt="Logo de PrintPruna" width="180" />
</p>

<h1 align="center">PrintPruna</h1>

Extensión para Chrome y Firefox que te permite marcar bloques HTML de la página
actual para limpiarla antes de imprimirla en PDF.

El propósito inicial de este proyecto era limpiar páginas de acordes y
partituras de guitarra (cifraclub.com y similares) antes de generar un
PDF para imprimir — por eso hay algunos ajustes pensados específicamente para
ese tipo de webs (por ejemplo, cómo se gestionan los `overflow` y los
CSS de `print` propios de esos sitios). Dicho esto, en general la extensión es
útil en cualquier página web donde quieras eliminar anuncios, menús u otro
contenido innecesario antes de imprimir.

## Uso

1. Haz clic en el icono de la extensión en la barra de herramientas. Se abre un pequeño
   menú con cinco opciones:
   - **Selecciona**: marca el bloque que quieras conservar; el resto de la
     página se oculta. El bloque seleccionado se reajusta (~90% de ancho,
     centrado) para que no pierda legibilidad si dependía de un layout
     flex/grid con los hermanos ahora ocultos.
   - **Elimina**: marca un bloque concreto y lo hace desaparecer, manteniendo el
     resto de la página intacta. Se puede usar varias veces seguidas para
     eliminar más de un bloque.
   - **Redimensiona**: arrastra cualquiera de los cuatro bordes de un bloque para
     cambiar su ancho o alto. El borde izquierdo/superior sigue
     visualmente el cursor (en lugar de crecer siempre hacia el otro lado).
     El modo se mantiene activo para que se puedan ajustar varios bloques seguidos
     sin reabrir el menú.
   - **Elimina Publicidad**: escanea toda la página en un solo paso y oculta
     automáticamente los bloques que parezcan anuncios o banners publicitarios
     (por id/clase con palabras como `ad`, `ads`, `sponsor`, `banner-ad`,
     etc., o iframes/scripts de redes publicitarias conocidas como
     Google Ads, Taboola u Outbrain). No necesitas seleccionar nada manualmente; si
     algún anuncio no se detecta, puedes eliminarlo con "Elimina".
   - **Imprime**: abre el diálogo de impresión del navegador directamente
     (`window.print()`), sin pasar por el teclado. Útil en páginas que
     bloquean `Ctrl+P`/`Cmd+P` con JavaScript, ya que esta llamada se hace
     desde el "isolated world" de la extensión y no se ve afectada aunque
     la página haya sobrescrito `window.print`. Antes de abrir el
     diálogo, desactiva los CSS de `@media print` propios de la página (véase
     más abajo) para que el resultado impreso se parezca al que has estado
     editando en pantalla.
2. Cada modo tiene un cursor propio para identificarlo de un vistazo: cruz
   para "Selecciona", `not-allowed` para "Elimina", y flechas de
   redimensionamiento para "Redimensiona" (que cambian a `↕`/`↔` al acercarse a
   un borde concreto, y a una mano durante el arrastre). Los elementos se
   resaltan al pasar el ratón (azul para "Selecciona", rojo para
   "Elimina", naranja discontinuo para el borde activo en "Redimensiona"). Haz
   clic (o arrastra, en el caso de "Redimensiona") sobre el elemento deseado
   para aplicar la acción.
3. Deshacer y Rehacer:
   - Presiona `Ctrl+Z` (o `Cmd+Z` en macOS) para deshacer la última acción
     (remove, select o resize). Se puede usar múltiples veces para ir
     atrás a través del historial (hasta 50 acciones atrás).
   - Presiona `Ctrl+Y` (o `Cmd+Y` en macOS) para rehacer, o `Ctrl+Shift+Z`
     (`Cmd+Shift+Z` en macOS) en navegadores que lo soporten.
   - El historial se pierde al recargar la página.
4. Para volver al estado original completamente, recarga la página (F5).

Presiona `Esc` en cualquier momento para salir del modo de marcaje —o
cancelar un arrastre en curso en "Redimensiona"— sin hacer ningún cambio.

### Redimensionar sin ocultar contenido

Muchos bloques de páginas reales (carruseles, tablas de acordes, widgets con
scroll horizontal) tienen `overflow:hidden` o `flex-wrap:nowrap` pensados
para un tamaño fijo. Si solo se cambiara `width`/`height`, el contenido
seguiría recortado aunque el bloque creciera. Por eso, al empezar a
arrastrar un borde, PrintPruna también:

- Fuerza `overflow: visible` en el elemento, en sus descendientes y en sus
  ancestros (hasta `<body>`) que estuvieran recortando contenido.
- Fuerza `flex-wrap: wrap` en los contenedores flex en una sola fila (típicos de
  carruseles con botón de "siguiente"), para que los elementos se reorganicen
  dentro del espacio nuevo en lugar de superponerse al resto de la página.

Todo esto se deshace si se cancela el arrastre con `Esc`; si se
completa, los cambios se mantienen como el resto de mutaciones de
la extensión.

### Ignorando los CSS de `print` de la página

Muchas páginas definen su propia hoja de estilos de `print` (o bloques
`@media print` dentro de una hoja normal) para cambiar cómo se ve el contenido
al imprimirlo, y a menudo este diseño no coincide con el que has
estado editando en pantalla con "Selecciona"/"Elimina"/"Redimensiona". Para
evitar esta discrepancia, al presionar "Imprime" (o `Ctrl+P`/`Cmd+P`)
la extensión:

- Desactiva temporalmente cualquier hoja de estilos o `<link>`/`<style>` con
  `media="print"`.
- Neutraliza los bloques `@media print { ... }` dentro de hojas de estilos que
  no sean ellos mismos `print`-only.
- Restaura todo esto automáticamente cuando se cierra el diálogo de impresión
  (event `afterprint`), tanto si has impreso como si has cancelado.

Como esto se aplica de forma general, en algunas páginas que hagan
servir su `@media print` para corregir problemas de renderizado propios
del motor de impresión (por ejemplo, técnicas CSS como `mask-image` que
algunos navegadores no dibujan bien al generar el PDF) el resultado impreso puede
perder alguna de esas correcciones puntuales. Es un compromiso asumido
conscientemente: se prioriza que la impresión sea fiel a lo que has
editado en pantalla sobre ajustes de compatibilidad específicos de
cada web.

### Sobre el bloqueo de `Ctrl+P`

Cuando se activa cualquier opción del menú, la extensión también instala un
listener de `keydown` a nivel de ventana (fase de captura) que intenta
adelantarse a los listeners que la página haya enganchado a `document` para
bloquear la tecla de impresión. Como la fase de captura recorre
`window → document → ...`, nuestro listener se ejecuta siempre primero y
detiene la propagación sin llamar a `preventDefault()`, dejando que el
navegador haga su acción por defecto. Es una mitigación "best effort":
si la página engancha su listener directamente a `window` antes de que
se inyecte la extensión, este método no puede superarlo — en ese caso,
utiliza la opción "Imprime" del menú.

## Privacidad

PrintPruna no recoge ni transmite ningún dato: todo el procesamiento se hace
localmente, dentro del navegador. Véase la [política de privacidad](docs/PRIVACY.md)
completa.

## Instalación en modo desarrollador

### Chrome / Edge / Brave

1. Abre `chrome://extensions`.
2. Activa "Modo de desarrollador" (esquina superior derecha).
3. Haz clic en "Cargar extensión sin empaquetar" y selecciona esta carpeta.

### Firefox

1. Abre `about:debugging#/runtime/this-firefox`.
2. Haz clic en "Cargar complemento temporal" y selecciona el archivo
   `manifest.json` de esta carpeta.

> Nota: la carga en Firefox es temporal y se pierde al cerrar el navegador.
> Para una instalación permanente sería necesario firmar la extensión a través de
> [addons.mozilla.org](https://addons.mozilla.org).

## Estructura

```
manifest.json     Manifest V3, compartido entre Chrome y Firefox
src/popup.html    Menú del icono con las opciones "Selecciona", "Elimina", "Redimensiona", "Elimina Publicidad" e "Imprime"
src/popup.js      Inyecta el script de contenido (si es necesario) y envía el modo elegido
src/content.js    Lógica de hover, selección/eliminación/redimensionamiento de bloques y escaneo heurístico de publicidad
src/content.css   Estilos del resaltado en hover, los cursores por modo y el overlay de arrastre
icons/            Iconos de la extensión (icon48.png, icon128.png)
docs/logo.png     Logo en grande para el README / store listing
```
