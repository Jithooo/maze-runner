const tintColorLight = "#00FF88";

export default {
  light: {
    text: "#FFFFFF",
    background: "#0A0E1A",
    backgroundSecondary: "#111827",
    tint: tintColorLight,
    tabIconDefault: "#4A5568",
    tabIconSelected: tintColorLight,
  },
};

export const THEMES = {
  default: {
    primary: "#00FF88",
    accent: "#00DDFF",
    wallV: [30, 58, 95] as [number, number, number],
    wallH: [22, 45, 74] as [number, number, number],
    fog: [10, 14, 26] as [number, number, number],
    sky: "#080C14",
    floor: "#0D1520",
    bg: "#0A0E1A",
    glow: "0,255,136",
    hudBg: "rgba(0,0,0,0.65)",
    hudBorder: "rgba(0,255,136,0.25)",
    hudText: "#00FF88",
    levelFlashBg: "rgba(0,0,0,0.5)",
    scoreColor: "#00DDFF",
  },
  fire: {
    primary: "#FF6A00",
    accent: "#FF00AA",
    wallV: [90, 22, 10] as [number, number, number],
    wallH: [68, 15, 6] as [number, number, number],
    fog: [15, 6, 4] as [number, number, number],
    sky: "#110404",
    floor: "#1A0808",
    bg: "#0F0303",
    glow: "255,106,0",
    hudBg: "rgba(20,0,0,0.7)",
    hudBorder: "rgba(255,106,0,0.3)",
    hudText: "#FF6A00",
    levelFlashBg: "rgba(30,0,0,0.6)",
    scoreColor: "#FF00AA",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;
