/** CSS-only effects that React Native's style types do not describe. Unistyles web emits them. */
interface WebEffectStyle {
  backdropFilter?: string;
  WebkitMaskImage?: string;
}

const NO_EFFECT: WebEffectStyle = {};

/** Frosts what is behind an element. A radius of 0 (every non-Mono theme) adds nothing. */
export function backdropBlur(radius: number): WebEffectStyle {
  if (radius <= 0) return NO_EFFECT;
  return { backdropFilter: `blur(${radius}px)` };
}

/** Fades an element's own pixels out towards `edge` over `length` px, so it works over glass. */
export function edgeMask(
  edge: "top" | "bottom" | "left" | "right",
  length: number,
): WebEffectStyle {
  const direction = { top: "to top", bottom: "to bottom", left: "to left", right: "to right" }[
    edge
  ];
  return {
    WebkitMaskImage: `linear-gradient(${direction}, #000, #000 calc(100% - ${length}px), transparent)`,
  };
}

/** Hides the last `width` px of an element, fading in over the first `fade` px of that span. */
export function trailingMask(width: number, fade: number): WebEffectStyle {
  return {
    WebkitMaskImage: `linear-gradient(to right, #000 calc(100% - ${width}px), transparent calc(100% - ${width - fade}px))`,
  };
}

/** Fades both ends of a scrolling axis. */
export function axisMask(
  axis: "vertical" | "horizontal",
  start: number,
  end: number,
): WebEffectStyle {
  const direction = axis === "vertical" ? "to bottom" : "to right";
  return {
    WebkitMaskImage: `linear-gradient(${direction}, transparent, #000 ${start}px, #000 calc(100% - ${end}px), transparent)`,
  };
}

export function feedbackTransition(durationMs: number) {
  if (durationMs <= 0) return {};
  return {
    transitionProperty: "background-color, color, opacity",
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}
