<p align="center">
  <img src="docs/logo.png" alt="PrintPruna Logo" width="180" />
</p>

<h1 align="center">PrintPruna</h1>

A Chrome and Firefox extension that lets you mark HTML blocks on the current page
to clean it up before printing it to PDF.

This project's initial purpose was to clean guitar chord and sheet music pages
(cifraclub.com and similar sites) before generating a PDF for printing — which is
why there are some tweaks designed specifically for those types of websites
(for example, how `overflow` and `print` CSS in those sites is handled). That said,
the extension is generally useful on any web page where you want to remove ads, menus,
or other unwanted content before printing.

## Usage

1. Click the extension icon in the toolbar. A small menu opens with five options:
   - **Select**: mark the block you want to keep; the rest of the
     page hides. The selected block resizes (~90% width,
     centered) so it doesn't lose readability if it depended on a
     flex/grid layout with siblings now hidden.
   - **Remove**: mark a specific block and make it disappear, keeping the
     rest of the page intact. You can use it multiple times in a row to
     remove more than one block.
   - **Resize**: drag any of the four edges of a block to
     change its width or height. The left/top edge follows
     the cursor visually (instead of always growing the other way).
     The mode stays active so you can adjust multiple blocks in a row
     without reopening the menu.
   - **Remove Ads**: scans the entire page in one pass and automatically hides
     blocks that look like ads or advertising banners
     (by id/class with words like `ad`, `ads`, `sponsor`, `banner-ad`,
     etc., or iframes/scripts from known ad networks like
     Google Ads, Taboola, or Outbrain). You don't need to select anything manually; if
     an ad isn't detected, you can remove it with "Remove".
   - **Print**: opens the browser's print dialog directly
     (`window.print()`), without going through the keyboard. Useful on pages that
     block `Ctrl+P`/`Cmd+P` with JavaScript, since this call is made
     from the extension's "isolated world" and isn't affected even if
     the page has overridden `window.print`. Before opening the
     dialog, it disables the page's own `@media print` CSS (see
     below) so the printed result looks like what you've been
     editing on screen.
2. Each mode has its own cursor to identify it at a glance: crosshair
   for "Select", `not-allowed` for "Remove", and resize arrows for
   "Resize" (which change to `↕`/`↔` when near a specific edge, and to a hand
   during dragging). Elements highlight when you hover over them (blue for "Select", red for
   "Remove", dashed orange for the active edge in "Resize"). Click
   (or drag, in the case of "Resize") on the desired element
   to apply the action.
3. Undo and Redo:
   - Press `Ctrl+Z` (or `Cmd+Z` on macOS) to undo the last action
     (remove, select, or resize). You can use it multiple times to go
     back through the history (up to 50 actions back).
   - Press `Ctrl+Y` (or `Cmd+Y` on macOS) to redo, or `Ctrl+Shift+Z`
     (`Cmd+Shift+Z` on macOS) on browsers that support it.
   - The history is lost when you reload the page.
4. To return to the original state completely, reload the page (F5).

Press `Esc` at any time to exit marking mode —or
cancel an in-progress resize drag in "Resize"— without making any changes.

### Resizing Without Hiding Content

Many blocks on real pages (carousels, chord charts, horizontal-scroll widgets)
have `overflow:hidden` or `flex-wrap:nowrap` designed
for a fixed size. If you only changed `width`/`height`, the content
would still be clipped even if the block grew. That's why, when you start
dragging an edge, PrintPruna also:

- Forces `overflow: visible` on the element, its descendants, and its
  ancestors (up to `<body>`) that were clipping content.
- Forces `flex-wrap: wrap` on flex containers in a single row (typical of
  carousels with a "next" button), so elements reflow within the new space instead of overlapping the rest of the page.

All of this is undone if you cancel the drag with `Esc`; if you
complete it, the changes stick just like the rest of the extension's mutations.

### Ignoring the Page's `print` CSS

Many pages define their own `print` stylesheet (or
`@media print` blocks within a normal stylesheet) to change how content looks
when printed, and often this design doesn't match what you've been
editing on screen with "Select"/"Remove"/"Resize". To
avoid this mismatch, when you press "Print" (or `Ctrl+P`/`Cmd+P`)
the extension:

- Temporarily disables any stylesheet or `<link>`/`<style>` with
  `media="print"`.
- Neutralizes `@media print { ... }` blocks within stylesheets that
  aren't themselves `print`-only.
- Automatically restores all of this when the print dialog closes
  (via the `afterprint` event), whether you printed or canceled.

Because this applies broadly, on some pages that use their `@media print`
to fix rendering issues specific to the print engine (for example, CSS techniques
like `mask-image` that some browsers don't render well when generating a PDF),
the printed result might lose some of those targeted fixes. It's a
consciously accepted tradeoff: we prioritize that printing is faithful to
what you've edited on screen over compatibility tweaks specific to
each website.

### About `Ctrl+P` Blocking

When you activate any menu option, the extension also installs a
`keydown` listener at the window level (capture phase) that tries
to get ahead of any listeners the page attached to `document` to
block the print shortcut. Since the capture phase traverses
`window → document → ...`, our listener runs first and
stops propagation without calling `preventDefault()`, letting the
browser do its default action. It's a "best effort" mitigation:
if the page attaches its listener directly to `window` before the
extension injects, this method can't overcome it — in that case,
use the "Print" option from the menu.

## Privacy

PrintPruna doesn't collect or transmit any data: all processing happens
locally, inside your browser. See the full [privacy policy](docs/PRIVACY.md).

## Developer Mode Installation

### Chrome / Edge / Brave

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right corner).
3. Click "Load unpacked" and select this folder.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on" and select the
   `manifest.json` file from this folder.

> Note: loading in Firefox is temporary and lost when you close the browser.
> For a permanent installation you would need to sign the extension through
> [addons.mozilla.org](https://addons.mozilla.org).

## Structure

```
manifest.json     Manifest V3, shared between Chrome and Firefox
src/popup.html    Menu with options "Select", "Remove", "Resize", "Remove Ads", and "Print"
src/popup.js      Injects the content script (if needed) and sends the chosen mode
src/content.js    Hover logic, block selection/removal/resizing, and ad detection heuristics
src/content.css   Styles for hover highlights, cursors per mode, and drag overlay
icons/            Extension icons (icon48.png, icon128.png)
docs/logo.png     Large logo for README / store listing
```
