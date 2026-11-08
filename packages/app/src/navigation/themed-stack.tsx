import { Stack, ThemeProvider, useTheme } from "expo-router";
import {
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { withUnistyles } from "react-native-unistyles";
import { AppearanceStyleBoundary } from "@/components/appearance-style-boundary";
import { getIsElectron } from "@/constants/platform";

type NativeStackNavigationOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack>["screenOptions"]>,
  (...args: never[]) => unknown
>;

interface ThemedStackBaseProps {
  backgroundColor: string;
  children?: ReactNode;
  screenOptions?: NativeStackNavigationOptions;
  // Screens whose content is another navigator. That navigator owns its own screens' appearance
  // boundary; wrapping it here would remount it.
  nestedNavigatorScreens?: readonly string[];
  /** Screens with retained lifetime owners update appearance at their own leaves. */
  screenOwnedAppearance?: readonly string[];
  /** Screens that follow colour-only changes in place instead of remounting. */
  inPlaceColorScreens?: readonly string[];
}

interface ScreenContent {
  route: { name: string };
  children: ReactNode;
}

function ThemedStackBase({
  backgroundColor,
  children,
  screenOptions,
  nestedNavigatorScreens,
  screenOwnedAppearance,
  inPlaceColorScreens,
}: ThemedStackBaseProps) {
  const themedScreenOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      ...screenOptions,
      contentStyle: [{ backgroundColor }, screenOptions?.contentStyle],
    }),
    [backgroundColor, screenOptions],
  );
  // Appearance changes remount each screen's content below the native stack, so the navigator
  // and its screen containers keep their identity. See docs/unistyles.md.
  const screenLayout = useCallback(
    ({ route, children: content }: ScreenContent): ReactElement => {
      if (
        (nestedNavigatorScreens?.includes(route.name) ||
          screenOwnedAppearance?.includes(route.name)) &&
        isValidElement(content)
      )
        return content;
      return (
        <AppearanceStyleBoundary
          colorChanges={inPlaceColorScreens?.includes(route.name) ? "inPlace" : "remount"}
        >
          {content}
        </AppearanceStyleBoundary>
      );
    },
    [inPlaceColorScreens, nestedNavigatorScreens, screenOwnedAppearance],
  );
  const navigationTheme = useTheme();
  const desktopNavigationTheme = useMemo(
    () => ({
      ...navigationTheme,
      colors: { ...navigationTheme.colors, background: backgroundColor },
    }),
    [navigationTheme, backgroundColor],
  );

  const stack = (
    <Stack screenOptions={themedScreenOptions} screenLayout={screenLayout}>
      {children}
    </Stack>
  );
  // On desktop the stack's screen container paints the navigation theme's background under content.
  return getIsElectron() ? (
    <ThemeProvider value={desktopNavigationTheme}>{stack}</ThemeProvider>
  ) : (
    stack
  );
}

export const ThemedStack = withUnistyles(ThemedStackBase, (theme) => ({
  backgroundColor: theme.colors.surfacePaneGlass,
}));
