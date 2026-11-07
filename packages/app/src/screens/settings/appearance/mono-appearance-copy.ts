export const MONO_APPEARANCE_COPY = {
  restoreDefaults: "Restore defaults",
  theme: {
    title: "Theme",
    description: "Dark and light share the same tint, so the color settings below apply to both.",
    scheme: {
      label: "Theme",
      hint: "System follows the OS appearance.",
      options: { system: "System", dark: "Dark", light: "Light" },
    },
    pluginTheme: {
      label: "Plugin theme",
      hint: "A theme from an installed plugin replaces the desktop look while it is selected.",
      none: "None",
    },
    accent: {
      label: "Accent color",
      hint: "Used for the composer send button and your message bubbles.",
      custom: "Custom color",
      swatches: {
        default: "Default",
        blue: "Blue",
        violet: "Violet",
        pink: "Pink",
        red: "Red",
        orange: "Orange",
        green: "Green",
      },
    },
    diff: {
      label: "Diff colors",
      hint: "Colors for added and removed lines. Colorblind and High contrast use blue and orange instead of green and red; High contrast adds stronger tints and text.",
      options: { default: "Default", colorblind: "Colorblind", highContrast: "High contrast" },
    },
  },
  color: {
    title: "Color",
    description: "Hue and saturation tint every surface. Lightness only moves the dark theme.",
    hue: { label: "Hue", hint: "Base hue for accents and tinted surfaces." },
    saturation: {
      label: "Saturation",
      hint: "How strongly the hue tints the interface. Zero keeps it neutral.",
    },
    darkLightness: {
      label: "Dark-mode lightness",
      hint: "Base brightness of the dark theme. Lower values are darker; zero is true black.",
    },
  },
  translucency: {
    title: "Translucency",
    description:
      "How much of the desktop shows through Paseo. Blur costs more to composite the higher it goes.",
    lightDescription:
      "Light mode always uses an opaque window, so these are off. Your dark-mode values are preserved.",
    sidebarOpacity: {
      label: "Sidebar opacity",
      hint: "Applies to the sidebars and the other glass panes.",
    },
    blurRadius: { label: "Blur radius" },
    mainPaneGlass: {
      label: "Main pane glass",
      hint: "Extend the translucent treatment to the main pane behind sessions and editors.",
    },
  },
  interface: {
    title: "Interface",
    scale: {
      label: "Interface scale",
      hint: "Zoom the whole interface. You can also use Cmd+=, Cmd+- and Cmd+0.",
    },
  },
} as const;
