# Window glass

On macOS Electron the dark Mono look shows a blurred desktop through the window. A native backdrop sits under the web contents and the page paints the only tint, on `html`.

## Why a native addon

Electron's `vibrancy` gives AppKit's material as-is. Under our tint it adds a `colorSaturate` filter, two dark fill layers and a `CAChameleonLayer` tint, so the window comes out darker and greyer than MonoCode, and the blur radius is fixed at AppKit's 30.

`packages/desktop/native/mac-glass/glass.mm` inserts its own `NSVisualEffectView` subclass below the web contents and rewrites the private layers after every `updateLayer`: it removes the saturation filter, clears the fills, hides the chameleon layer and sets the backdrop's `gaussianBlur` radius. This is MonoCode's approach (MIT). AppKit rebuilds those layers on appearance changes, so patching once from JS does not hold.

- In fullscreen there is nothing behind the window. AppKit swaps in a material without a blur filter and the window shows the tint over black (`rgb(10, 10, 10)` by default). Leaving fullscreen restores the patched backdrop.
- Filters the addon does not recognise stay in place, and every layer's background is cleared. If glass turns dark or grey after a macOS update, dump the backdrop's layer tree before touching the tint.
- If the addon fails to load, `window/native-glass.ts` logs a warning and the glass controller uses Electron vibrancy.
- `build:main` compiles the addon with `xcrun clang++` as a universal binary against the running Node's Node-API headers, and skips it while the `.node` is newer than its sources. Without the Xcode Command Line Tools or the headers it warns and skips locally, so glass uses Electron vibrancy, and fails in CI. It is a no-op on other platforms. The packaged `.node` is unpacked from the asar.

## Transparent window

Every macOS window is created with `transparent: true`, glass or not (`getGlassWindowOptions` in `packages/desktop/src/window/window-glass.ts`). Electron makes the window's widget translucent only at creation, and only for `transparent` or a `vibrancy` option. The native backdrop passes neither, and an opaque widget never clears the regions it repaints: the translucent tint stacks frame after frame, so text leaves offset ghosts and busy areas such as the chat and the sidebar list turn opaque within seconds. Glass can turn on after launch, so the window cannot wait for it. With glass off the window gets an opaque background color.

## Tint

The tint is MonoCode's native tint: the dark background at `0.4 + 0.6 × sidebar opacity`, painted once on `html` (`monoWindowTint` in `packages/app/src/styles/mono-theme.ts`). Every glass layer token stays transparent; a second translucent fill compounds and darkens the window.

## Checking it visually

Window captures omit live backdrops: `screencapture -l` and ScreenCaptureKit window filters render the glass as flat grey. Only the framebuffer shows the blur. Put an opaque window of your own behind the glass window, make the glass window its child so it stays on top, and capture the glass window's rect with `screencapture -R` after checking that no other app's window overlaps it.

A plain window capture is enough to spot stale paint: stretch its contrast and look for doubled text or panes darker than the title bar.

To check a frosted surface (menu, popover, modal) without Screen Recording permission, take a CDP screenshot of the dev window. It keeps the page's alpha and includes CSS backdrop filters, so composite it over a dark image and look for page text showing through the surface.
