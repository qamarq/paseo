import { useId } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { knockoutColor, type SurfaceBackdrop } from "@/styles/surface-backdrop";
import type { Theme } from "@/styles/theme";
import { backdropBlur, trailingMask } from "@/styles/web-effects";

export const SCRIM_WIDTH = 48;
// The fade is a fixed length so a wider scrim only adds solid surface under its actions.
const SCRIM_FADE_WIDTH = SCRIM_WIDTH * 0.55;
const GLASS_SCRIM_BLUR = 6;

function TrailingActionScrimSvg({
  gradientId,
  color,
  solidOffset,
}: {
  gradientId: string;
  color: string;
  solidOffset: string;
}) {
  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          {/* Vary opacity rather than interpolating toward `transparent`, which crosses black in
              some engines and leaves a grey fringe. */}
          <Stop offset="0%" stopColor={color} stopOpacity={0} />
          <Stop offset={solidOffset} stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={color} stopOpacity={1} />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
    </Svg>
  );
}

const ThemedTrailingActionScrimSvg = withUnistyles(TrailingActionScrimSvg);

const backdropColorMappings: Record<SurfaceBackdrop, (theme: Theme) => { color: string }> = {
  surface0: (theme) => ({ color: knockoutColor(theme, "surface0") }),
  surface1: (theme) => ({ color: knockoutColor(theme, "surface1") }),
  surface2: (theme) => ({ color: knockoutColor(theme, "surface2") }),
  surfaceSidebar: (theme) => ({ color: knockoutColor(theme, "surfaceSidebar") }),
  surfaceSidebarHover: (theme) => ({ color: knockoutColor(theme, "surfaceSidebarHover") }),
  surfaceSidebarSelected: (theme) => ({ color: knockoutColor(theme, "surfaceSidebarSelected") }),
};

/**
 * Fades trailing content into the surface beneath an absolutely overlaid action. Under desktop glass
 * the surface cannot be painted, so it frosts what it covers instead; content that can mask its own
 * tail takes `trailingActionMask` as well.
 */
export function TrailingActionScrim({
  backdrop,
  width = SCRIM_WIDTH,
  testID,
}: {
  backdrop: SurfaceBackdrop;
  /** Covers more than one trailing action; the fade keeps its length. */
  width?: number;
  testID?: string;
}) {
  // React-generated ids contain characters that are invalid inside SVG fragment references.
  const gradientId = `trailing-action-scrim-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const solidOffset = `${Math.round((SCRIM_FADE_WIDTH / width) * 100)}%`;
  return (
    <View style={styles.scrim(width)} pointerEvents="none" testID={testID}>
      <ThemedTrailingActionScrimSvg
        gradientId={gradientId}
        solidOffset={solidOffset}
        uniProps={backdropColorMappings[backdrop]}
      />
    </View>
  );
}

/**
 * The scrim's fade as a mask on the covered content, for desktop glass where the scrim cannot
 * paint. The masked box must end where the scrim does.
 */
export function trailingActionMask(theme: Theme, width: number = SCRIM_WIDTH) {
  if (!theme.chrome.glass) return {};
  return trailingMask(width, SCRIM_FADE_WIDTH);
}

const styles = StyleSheet.create((theme) => ({
  scrim: (width: number) => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width,
    ...(theme.chrome.glass
      ? {
          ...backdropBlur(GLASS_SCRIM_BLUR),
          WebkitMaskImage: `linear-gradient(to right, transparent, #000 ${SCRIM_FADE_WIDTH}px)`,
        }
      : {}),
  }),
}));
