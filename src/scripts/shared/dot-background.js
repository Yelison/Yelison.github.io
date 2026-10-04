/* global InteractiveDotGrid -- provided by src/vendor/interactive-dot-grid/dot-grid.js */

/**
 * Cyan dot grid behind the launcher and the portfolio. Dots light up under the
 * pointer and travel with the page on scroll. It only animates while something
 * moves, and stops when hidden, paused or with reduced motion.
 */
export function initDotBackground() {
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const mobile = matchMedia('(max-width:700px)');
  for (const surface of document.querySelectorAll(
    '#launch-screen,body:not(:has(#launch-screen))',
  )) {
    const grid = InteractiveDotGrid.createDotGrid({
      ...(surface === document.body ? {} : { container: surface }),
      spacing: mobile.matches ? 22 : 16,
      dotMin: 0.5,
      dotMax: 1.8,
      radiusEffect: 125,
      baseAlpha: 0.08,
      maxAlpha: 0.42,
      color: '8,232,222',
      smoothing: 0.09,
      autoStart: false,
    });
    grid.canvas.className = 'interactive-dots';
    grid.canvas.setAttribute('aria-hidden', 'true');
    let visible = true;
    let animateUntil = 0;
    const canAnimate = () =>
      visible &&
      !surface.hidden &&
      !document.hidden &&
      !reduced.matches &&
      !document.documentElement.classList.contains('motion-paused');
    const originalTick = grid.tick;
    grid.tick = () => {
      originalTick();
      if (!canAnimate() || performance.now() >= animateUntil) grid.stop();
    };
    const wake = () => {
      if (!canAnimate()) return;
      animateUntil = performance.now() + 1100;
      grid.start();
    };
    window.addEventListener('mousemove', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
    window.addEventListener('blur', wake);
    mobile.addEventListener('change', () => {
      grid.setOptions({ spacing: mobile.matches ? 22 : 16 });
      wake();
    });

    if (surface === document.body) {
      let previousScroll = window.scrollY;
      window.addEventListener(
        'scroll',
        () => {
          const delta = window.scrollY - previousScroll;
          previousScroll = window.scrollY;
          if (
            reduced.matches ||
            document.documentElement.classList.contains('motion-paused') ||
            !delta
          )
            return;
          // Carry each dot and its fading highlight with the document. The fixed
          // pointer lights fresh dots as they pass underneath, just like mouse movement.
          const spacing = grid.opts.spacing;
          const span = Math.max(spacing, Math.floor(innerHeight / spacing) * spacing);
          wake();
          for (const dot of grid.dots) {
            dot.y -= delta;
            if (dot.y < 0 || dot.y >= span) {
              dot.y = ((dot.y % span) + span) % span;
              dot.alpha = grid.opts.baseAlpha;
              dot.size = grid.opts.dotMin;
            }
          }
        },
        { passive: true },
      );
    }

    // mouseout bubbles from every child; clear only when leaving the window.
    window.removeEventListener('mouseout', grid.onMouseOut);
    window.addEventListener(
      'mouseout',
      (event) => {
        if (!event.relatedTarget) {
          grid.onMouseOut();
          wake();
        }
      },
      { passive: true },
    );
    surface.addEventListener(
      'mouseleave',
      () => {
        if (surface !== document.body) {
          grid.onMouseOut();
          wake();
        }
      },
      { passive: true },
    );
    const sync = () => {
      const paused =
        reduced.matches || document.documentElement.classList.contains('motion-paused');
      const light = document.documentElement.dataset.theme === 'light';
      grid.setOptions({ color: light ? '0,123,118' : '8,232,222' });
      if (!visible || surface.hidden || document.hidden || paused) {
        grid.stop();
        grid.onMouseOut();
        if (visible && !surface.hidden) {
          grid.tick();
          grid.stop();
        }
      } else wake();
    };
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      sync();
    }).observe(surface);
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    new MutationObserver(sync).observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    new MutationObserver(sync).observe(surface, { attributes: true, attributeFilter: ['hidden'] });
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
  }
}

initDotBackground();
