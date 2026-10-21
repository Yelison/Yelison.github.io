/**
 * Live previews render their site at twice the card size and scale it to half. Some sites
 * show a "use a wider window" notice below a given width (Draftroom does below 1280 px), so
 * a preview with `data-preview-min-width` scales down further to keep the site at least that wide.
 */
export function initPreviewScale() {
  const screens = [...document.querySelectorAll('.silabin-screen')].filter((screen) =>
    screen.querySelector('iframe[data-preview-min-width]'),
  );
  if (!screens.length || !('ResizeObserver' in window)) return;

  const observer = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const minWidth = Number(target.querySelector('iframe').dataset.previewMinWidth);
      const scale = Math.min(0.5, target.clientWidth / minWidth);
      if (scale > 0) target.style.setProperty('--preview-scale', String(scale));
    }
  });
  screens.forEach((screen) => observer.observe(screen));
}
