import { getIsElectronMac } from "./platform";

export const DESKTOP_TITLE_BAR_HEIGHT: number | null = getIsElectronMac() ? 40 : null;
