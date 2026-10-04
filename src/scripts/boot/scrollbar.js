/**
 * The portfolio iframe's scrollbar can only change color, so whenever the launcher
 * needs to animate it (glide during the build, disintegrate during the destruction)
 * it hides the native one and draws a pixel-identical replica on top of it.
 */

/** Height of each arrow button of the native scrollbar. */
export const SCROLLBAR_ARROW = 12;

/**
 * Geometry and colors of the iframe's classic scrollbar, in launcher coordinates.
 * Returns null for overlay scrollbars (mobile), which take no space.
 */
export function measureScrollbar(frame) {
  const win = frame.contentWindow;
  const root = frame.contentDocument?.documentElement;
  if (!win || !root) return null;
  const width = win.innerWidth - root.clientWidth;
  if (width <= 0) return null;
  const [thumbColor, trackColor] =
    win.getComputedStyle(root).scrollbarColor?.match(/rgba?\([^)]*\)/g) ?? [];
  const box = frame.getBoundingClientRect();
  const height = root.clientHeight;
  const track = height - 2 * SCROLLBAR_ARROW;
  const thumbLength = Math.round((track * height) / root.scrollHeight);
  const maxScroll = root.scrollHeight - height;
  const thumbTop =
    SCROLLBAR_ARROW +
    Math.round((track - thumbLength) * (maxScroll > 0 ? win.scrollY / maxScroll : 0));
  return {
    left: box.left + root.clientWidth,
    top: box.top,
    width,
    height,
    track,
    thumbTop,
    thumbLength,
    thumbColor,
    trackColor,
  };
}

/** Hides the native scrollbar without changing its width, so nothing reflows. */
export function setNativeScrollbarHidden(frame, hidden) {
  const root = frame.contentDocument?.documentElement;
  if (root) root.style.scrollbarColor = hidden ? 'transparent transparent' : '';
}

/** A copy of the native scrollbar drawn in the launcher, above the iframe. */
export function createScrollbarReplica({ thumbColor, trackColor }) {
  const bar = document.createElement('div');
  bar.className = 'scrollbar-replica';
  bar.setAttribute('aria-hidden', 'true');
  bar.style.background = trackColor;
  bar.style.color = thumbColor;
  // Pixel-stepped arrows, like the native ones (a CSS triangle would be antialiased).
  const arrow = (direction, path) =>
    `<svg class="scrollbar-replica-arrow ${direction}" viewBox="0 0 6 3" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
  bar.innerHTML =
    arrow('up', 'M2 0H4V1H5V2H6V3H0V2H1V1H2Z') +
    '<i class="scrollbar-replica-thumb"></i>' +
    arrow('down', 'M0 0H6V1H5V2H4V3H2V2H1V1H0Z');
  const thumb = bar.querySelector('.scrollbar-replica-thumb');
  document.body.append(bar);
  return {
    el: bar,
    /** Positions the replica over the native scrollbar described by `geometry`. */
    place({ left, top, width, height }) {
      Object.assign(bar.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    },
    setThumb(top, length) {
      thumb.style.top = `${top}px`;
      thumb.style.height = `${length}px`;
    },
    remove() {
      bar.remove();
    },
  };
}

/** Time constant of the thumb's easing, in milliseconds. */
const GLIDE = 200;

/**
 * While the page is being written it grows in bursts, and the native thumb jumps up
 * and shrinks every time a section is added. During the build the replica's thumb
 * glides down with the build progress instead (0 → 1), easing any change of length.
 *
 * `handover(isSettled)` switches it to follow the native thumb (which moves as the
 * page scrolls back to the top); once `isSettled()` and both thumbs match, the native
 * scrollbar is shown again and the replica removed.
 */
export function createBuildScrollbar(frame, getProgress) {
  let replica = null;
  let top = 0;
  let length = 0;
  let lastTime = null;
  let isSettled = null;
  let animationFrame;

  const stop = () => {
    cancelAnimationFrame(animationFrame);
    setNativeScrollbarHidden(frame, false);
    replica?.remove();
    replica = null;
  };

  const tick = (now) => {
    const geometry = measureScrollbar(frame);
    if (geometry) {
      if (!replica) {
        replica = createScrollbarReplica(geometry);
        setNativeScrollbarHidden(frame, true);
        top = geometry.thumbTop;
        length = geometry.thumbLength;
      }
      replica.place(geometry);
      const ease = 1 - Math.exp(-(now - (lastTime ?? now)) / GLIDE);
      const targetTop = isSettled
        ? geometry.thumbTop
        : SCROLLBAR_ARROW + (geometry.track - length) * Math.min(1, getProgress());
      length += (geometry.thumbLength - length) * ease;
      top += (targetTop - top) * ease;
      const matches =
        Math.abs(top - geometry.thumbTop) < 0.5 && Math.abs(length - geometry.thumbLength) < 0.5;
      if (isSettled?.() && matches) {
        replica.setThumb(geometry.thumbTop, geometry.thumbLength);
        stop();
        return;
      }
      replica.setThumb(top, length);
    }
    lastTime = now;
    animationFrame = requestAnimationFrame(tick);
  };
  animationFrame = requestAnimationFrame(tick);

  return {
    handover(settled) {
      isSettled = settled;
    },
    stop,
  };
}
