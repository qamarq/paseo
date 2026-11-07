# Window glass

On macOS Electron the dark Mono look shows a blurred desktop through the window. A native backdrop sits under the web contents and the page paints the only tint, on `html`.

## Why a native addon

Electron's `vibrancy` gives AppKit's material as-is. Under our tint it adds a `colorSaturate` filter, two dark fill layers and a `CAChameleonLayer` tint, so the window comes out darker and greyer than MonoCode, and the blur radius is fixed at AppKit's 30.

`packages/desktop/native/mac-glass/glass.mm` inserts its own `NSVisualEffectView` subclass below the web contents and rewrites the private layers after every `updateLayer`: it removes the saturation filter, clears the fills, hides the chameleon layer and sets the backdrop's `gaussianBlur` radius. This is MonoCode's approach (MIT). AppKit rebuilds those layers on appearance changes, so patching once from JS does not hold.

- In fullscreen there is nothing behind the window. AppKit swaps in a material without a blur filter and the window shows the tint over black (`rgb(10, 10, 10)` by default). Leaving fullscreen restores the patched backdrop.
- Unknown layers are left alone, which falls back to the stock material. If glass turns dark or grey after a macOS update, dump the backdrop's layer tree before touching the tint.
- If the addon fails to load, `window/native-glass.ts` logs a warning and the glass controller uses Electron vibrancy.
- `build:main` compiles the addon with `xcrun clang++` as a universal binary against the running Node's Node-API headers, so it needs the Xcode Command Line Tools. It is a no-op on other platforms. The packaged `.node` is unpacked from the asar.

## Tint

The tint is MonoCode's native tint: the dark background at `0.4 + 0.6 × sidebar opacity`, painted once on `html` (`monoWindowTint` in `packages/app/src/styles/mono-theme.ts`). Every glass layer token stays transparent; a second translucent fill compounds and darkens the window.

## Checking it visually

Window captures omit live backdrops: `screencapture -l` and ScreenCaptureKit window filters render the glass as flat grey. Only the framebuffer shows the blur. Put an opaque window of your own behind the glass window, make the glass window its child so it stays on top, and capture the glass window's rect with `screencapture -R` after checking that no other app's window overlaps it.
