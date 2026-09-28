import type { CSSProperties } from "react";

export const COLOR_LABELS = {
  main: "Background",
  sidebar: "Sidebar",
  panel: "Surface",
  hover: "Hover",
  selected: "Selected",
  border: "Border",
  text: "Text",
  muted: "Muted text",
  accent: "Accent",
  accentInk: "On accent",
  danger: "Danger",
  success: "Success",
  warning: "Warning",
} as const;
export type ColorToken = keyof typeof COLOR_LABELS;
export type OklchColor = { l: number; c: number; h: number };
export type TokenMode = "light" | "dark";
export type PukuTokens = {
  colors: Record<TokenMode, Record<ColorToken, OklchColor>>;
  metrics: {
    radius: number;
    panelRadius: number;
    controlHeight: number;
    spacing: number;
    fontSize: number;
    fontWeight: number;
    lineHeight: number;
    fontFamily: "tx02" | "system" | "mono";
    motion: number;
    shadow: number;
  };
  palettes: { name: string; base: OklchColor }[];
};
export const DEFAULT_TOKENS: PukuTokens = {
  colors: {
    dark: {
      main: {
        l: 0.198266,
        c: 0.00422,
        h: 128.6998,
      },
      sidebar: {
        l: 0.175658,
        c: 0.004348,
        h: 128.7392,
      },
      panel: {
        l: 0.22851,
        c: 0.005863,
        h: 121.9076,
      },
      hover: {
        l: 0.264374,
        c: 0.011263,
        h: 122.1851,
      },
      selected: {
        l: 0.264374,
        c: 0.011263,
        h: 122.1851,
      },
      border: {
        l: 0.328183,
        c: 0.014001,
        h: 118.5834,
      },
      text: {
        l: 0.946641,
        c: 0.011948,
        h: 106.6257,
      },
      muted: {
        l: 0.701673,
        c: 0.020463,
        h: 119.91,
      },
      accent: {
        l: 0.791293,
        c: 0.103344,
        h: 281.9417,
      },
      accentInk: {
        l: 0.28117,
        c: 0.066841,
        h: 281.2127,
      },
      danger: {
        l: 0.77549,
        c: 0.132703,
        h: 16.571,
      },
      success: {
        l: 0.783186,
        c: 0.076829,
        h: 151.5692,
      },
      warning: {
        l: 0.801071,
        c: 0.085223,
        h: 58.5293,
      },
    },
    light: {
      main: {
        l: 0.953976,
        c: 0.009355,
        h: 99.9864,
      },
      sidebar: {
        l: 0.931538,
        c: 0.011996,
        h: 106.6302,
      },
      panel: {
        l: 0.983725,
        c: 0.006587,
        h: 106.5201,
      },
      hover: {
        l: 0.918367,
        c: 0.013406,
        h: 111.2868,
      },
      selected: {
        l: 0.856494,
        c: 0.020812,
        h: 118.9912,
      },
      border: {
        l: 0.841544,
        c: 0.01826,
        h: 120.7381,
      },
      text: {
        l: 0.285693,
        c: 0.018593,
        h: 125.3027,
      },
      muted: {
        l: 0.505095,
        c: 0.022462,
        h: 123.2185,
      },
      accent: {
        l: 0.49836,
        c: 0.197713,
        h: 274.9088,
      },
      accentInk: {
        l: 0.986516,
        c: 0.006606,
        h: 286.2779,
      },
      danger: {
        l: 0.50939,
        c: 0.177517,
        h: 17.6575,
      },
      success: {
        l: 0.477119,
        c: 0.091624,
        h: 149.7422,
      },
      warning: {
        l: 0.479907,
        c: 0.107036,
        h: 53.5449,
      },
    },
  },
  metrics: {
    radius: 6,
    panelRadius: 12,
    controlHeight: 44,
    spacing: 4,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
    fontFamily: "tx02",
    motion: 160,
    shadow: 0.35,
  },
  palettes: [],
};
export const colorCss = ({ l, c, h }: OklchColor) => `oklch(${l} ${c} ${h})`;
export function tokenVariables(tokens: PukuTokens, mode: TokenMode): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [name, color] of Object.entries(tokens.colors[mode]))
    variables[`--dashboard-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] =
      colorCss(color);
  const m = tokens.metrics;
  Object.assign(variables, {
    "--puku-radius": `${m.radius}px`,
    "--puku-radius-panel": `${m.panelRadius}px`,
    "--puku-control-height": `${m.controlHeight}px`,
    "--puku-spacing": `${m.spacing}px`,
    "--puku-font-size": `${m.fontSize}px`,
    "--puku-font-weight": String(m.fontWeight),
    "--puku-line-height": String(m.lineHeight),
    "--puku-motion": `${m.motion}ms`,
    "--puku-shadow-opacity": String(m.shadow),
    "--puku-font-family":
      m.fontFamily === "tx02"
        ? "var(--font-tx02, ui-sans-serif), system-ui, sans-serif"
        : m.fontFamily === "mono"
          ? "ui-monospace, monospace"
          : "system-ui, sans-serif",
    "--background": "var(--dashboard-main)",
    "--foreground": "var(--dashboard-text)",
    "--color-bg": "var(--dashboard-main)",
    "--color-fg": "var(--dashboard-text)",
    "--color-muted": "var(--dashboard-muted)",
    "--color-border": "var(--dashboard-border)",
    "--color-card": "var(--dashboard-panel)",
    "--color-accent": "var(--dashboard-accent)",
    "--color-accent-fg": "var(--dashboard-accent-ink)",
  });
  return variables;
}
export function tokenStyle(tokens: PukuTokens, mode: TokenMode): CSSProperties {
  return tokenVariables(tokens, mode);
}
export function tokensCss(tokens: PukuTokens): string {
  return (["dark", "light"] as const)
    .map(
      (mode) =>
        `[data-puku-theme="${mode}"] {\n${Object.entries(tokenVariables(tokens, mode))
          .map(([name, value]) => `  ${name}: ${value};`)
          .join("\n")}\n}`,
    )
    .join("\n\n");
}
