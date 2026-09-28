"use client";

import {
  createContext,
  useContext,
  type ComponentProps,
  type CSSProperties,
  type ElementType,
} from "react";
import "./puku.css";
import { tokenStyle, type PukuTokens } from "./puku-tokens";

export type PukuTheme = "light" | "dark";
export type StyledProps<T extends ElementType> = Omit<ComponentProps<T>, "className"> & {
  className?: string;
};
const ThemeContext = createContext<PukuTheme>("dark");
const TokenStyleContext = createContext<CSSProperties | undefined>(undefined);
export const usePukuTokenStyle = () => useContext(TokenStyleContext);
type PukuNodeAttributes = {
  "data-puku-symbol"?: string;
  "data-puku-node"?: string;
  "data-puku-instance"?: string;
};
const NodeContext = createContext<PukuNodeAttributes>({});
export const PukuNodeProvider = NodeContext.Provider;
export const usePukuNode = () => useContext(NodeContext);

/** Explicit context carries the preview theme through React portals. */
export function PukuThemeProvider({
  theme = "dark",
  children,
  className,
  tokens,
  style,
  ...props
}: ComponentProps<"div"> & { theme?: PukuTheme; tokens?: PukuTokens }) {
  const variables = tokens ? tokenStyle(tokens, theme) : undefined;
  return (
    <ThemeContext value={theme}>
      <TokenStyleContext value={variables}>
        <div
          className={`puku-theme ${className ?? ""}`}
          data-puku-theme={theme}
          style={{ ...variables, ...style }}
          {...props}
        >
          {children}
        </div>
      </TokenStyleContext>
    </ThemeContext>
  );
}

export function usePukuTheme() {
  return useContext(ThemeContext);
}

export function mergeTokenStyle<State>(
  tokens: CSSProperties | undefined,
  style?: CSSProperties | ((state: State) => CSSProperties | undefined),
) {
  return typeof style === "function"
    ? (state: State) => ({ ...tokens, ...style(state) })
    : { ...tokens, ...style };
}
