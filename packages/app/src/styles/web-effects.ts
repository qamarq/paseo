interface WebEffectStyle {
  backdropFilter?: string;
  WebkitMaskImage?: string;
}

const NO_EFFECT: WebEffectStyle = {};

export function backdropBlur(radius: number): WebEffectStyle {
  if (radius <= 0) return NO_EFFECT;
  return { backdropFilter: `blur(${radius}px)` };
}

export function trailingMask(width: number, fade: number): WebEffectStyle {
  return {
    WebkitMaskImage: `linear-gradient(to right, #000 calc(100% - ${width}px), transparent calc(100% - ${width - fade}px))`,
  };
}

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
