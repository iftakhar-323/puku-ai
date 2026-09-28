"use client";

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";

/**
 * Sidebar — Claude Code-style app navigation.
 *
 * The DOM mirrors the Claude Code desktop app's `AppShell` sidebar markup 1:1
 * (see https://claude.com/product/claude-code). Every block has a primitive
 * named after the Claude CSS class it corresponds to so the mapping is obvious:
 *
 *   Sidebar                              <aside data-appshell-pane="sidebar">
 *     ├─ Sidebar.ModeRow                 horizontal segmented at the top
 *     │    └─ Sidebar.ModeTab            one segment — `active` or `disabled`
 *     ├─ Sidebar.NavTop                  primary actions block
 *     │    └─ Sidebar.NavItem            full-width button: icon + label
 *     ├─ Sidebar.Sessions                scrollable region (the only scroller)
 *     │    └─ Sidebar.SessionGroup       one labelled group
 *     │         ├─ Sidebar.SessionRow    click target (rowSelect)
 *     │         │    ├─ Sidebar.RowIcon  diff · dots · circle · custom
 *     │         │    └─ Sidebar.RowLabel
 *     │         └─ Sidebar.RowMore       trailing ⋯ menu (always rendered)
 *     └─ Sidebar.Footer                  avatar + name + trailing actions
 *
 * The Sidebar fills its parent (`h-full w-full`). Consumers control the outer
 * chrome — they're responsible for the titlebar above and the main pane to the
 * right, matching the Claude app shell exactly.
 *
 * No hard-coded colors. Every visual resolves to a `var(--color-…)` token.
 */

type SidebarRootProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

function SidebarRoot({ children, className, ...rest }: SidebarRootProps) {
  return (
    <aside
      // data-ui scopes the Inter font-family rule from globals.css — see
      // src/components/ui/button.tsx for the rationale. The `data-appshell-pane`
      // attribute is the Claude-Code style hook (left untouched).
      data-appshell-pane="sidebar"
      data-ui=""
      className={`flex h-full w-full flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)] ${className ?? ""}`}
      {...rest}
    >
      {children}
    </aside>
  );
}

/* ── Mode row ───────────────────────────────────────────────────────────── */

/**
 * `ModeRow` — horizontal segmented control at the very top of the sidebar.
 * Holds a pair of `ModeTab` buttons (e.g. Home / Code) that switch the
 * sidebar's overall mode. Visually it has no background of its own — the
 * `ModeTab` itself carries the active treatment.
 */
function ModeRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={`flex items-center gap-1 px-3 py-2 ${className ?? ""}`}>
      {children}
    </div>
  );
}

type ModeTabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Visible label (e.g. "Home", "Code"). */
  label: ReactNode;
  /** Optional leading icon (16×16). */
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
};

/**
 * `ModeTab` — one segment in a `ModeRow`. Two states (Claude's actual app
 * uses `aria-pressed`):
 *  - `active` — solid fill on `--color-card`, `--color-fg` text
 *  - otherwise — transparent, `--color-muted` text, hover to `--color-fg`
 *  - `disabled` (overrides both) — `aria-disabled`, no hover, muted color
 */
const ModeTab = forwardRef<HTMLButtonElement, ModeTabProps>(function ModeTab(
  { active, disabled, label, icon, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      role="tab"
      aria-pressed={active ? true : false}
      disabled={disabled}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] ${
        active
          ? "bg-[var(--color-card)] font-medium text-[var(--color-fg)]"
          : disabled
            ? "cursor-not-allowed text-[var(--color-muted)] opacity-50"
            : "text-[var(--color-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-fg)]"
      } ${className ?? ""}`}
      {...rest}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
});

/* ── Top nav ────────────────────────────────────────────────────────────── */

/**
 * `NavTop` — the block of full-width primary action buttons under the mode
 * row (Claude uses this for "New session", "Routines", "Customize", "More").
 * Holds any number of `NavItem` children.
 */
function NavTop({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <nav className={`flex flex-col gap-0.5 px-2 pb-2 ${className ?? ""}`} aria-label="Primary">
      {children}
    </nav>
  );
}

type NavItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  children: ReactNode;
  /** Disabled — `aria-disabled`, no hover, lower opacity. */
  disabled?: boolean;
  /** Dim — same hover behavior but visibly less prominent (Claude's "More"). */
  dim?: boolean;
};

/**
 * `NavItem` — a single full-width button with a 16×16 leading icon and a
 * text label. Mirrors Claude's `.navItem` styles:
 *   - active/hovered → `--color-card` background
 *   - disabled      → `opacity-50`, no pointer
 *   - dim           → same as default but `--color-muted` text in resting state
 */
const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(function NavItem(
  { icon, disabled, dim, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled}
      className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : dim
            ? "text-[var(--color-muted)] hover:bg-[var(--color-card)] hover:text-[var(--color-fg)]"
            : "text-[var(--color-fg)] hover:bg-[var(--color-card)]"
      } ${className ?? ""}`}
      {...rest}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-current">
        {icon}
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
});

/* ── Sessions ───────────────────────────────────────────────────────────── */

/**
 * `Sessions` — the scrollable region that holds every `SessionGroup`. The
 * whole sidebar scrolls inside this element (`min-h-0` so flexbox lets it
 * shrink; `flex-1` so it takes the leftover space between top nav and
 * footer).
 */
function Sessions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pb-2 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * `SessionGroup` — one labelled cluster inside `Sessions`. Renders a small
 * uppercase section header (Claude's `.sectionHeader`) followed by a stack of
 * `SessionRow` children.
 */
function SessionGroup({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      <div className="px-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      {children}
    </section>
  );
}

type SessionRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Visible label — the only required field. */
  label: ReactNode;
  /**
   * Optional icon. If omitted, the row defaults to `Sidebar.RowIcon` with
   * `variant="diff"` (Claude's session thread icon).
   */
  icon?: ReactNode;
  /**
   * Force a specific row icon variant. If `icon` is provided it's wrapped in
   * `<Sidebar.RowIcon variant="custom">` automatically.
   */
  iconVariant?: "diff" | "dots" | "circle" | "custom";
  /** If `iconVariant="circle"`, fill the dot to indicate an unread session. */
  unread?: boolean;
  active?: boolean;
  /** Optional click handler for `Row.More` (trailing ⋯ menu). */
  onMoreClick?: () => void;
};

/**
 * `SessionRow` — the click target inside a `SessionGroup`. Mirrors Claude's
 * `.row` + `.rowSelect` + `.rowMore` structure:
 *
 *   <button.row>           ← the whole row
 *     <button.rowSelect>   ← the icon + label click target
 *     <button.rowMore>     ← trailing ⋯ menu (always rendered)
 *   </button>
 *
 * Pass `label` (required), optional `icon` / `iconVariant` / `unread`, and
 * `active` to mark the row as the current session. `onMoreClick` attaches a
 * handler to the trailing ⋯ button.
 */
const SessionRow = forwardRef<HTMLButtonElement, SessionRowProps>(function SessionRow(
  { label, icon, iconVariant, unread, active, className, onMoreClick, type, ...rest },
  ref,
) {
  const computedVariant: "diff" | "dots" | "circle" | "custom" =
    iconVariant ?? (icon ? "custom" : "diff");
  return (
    <div
      className={`group/row flex items-center gap-1 rounded-md transition-colors ${
        active
          ? "bg-[var(--color-card)] text-[var(--color-fg)]"
          : "text-[var(--color-fg)] hover:bg-[var(--color-card)]"
      } ${className ?? ""}`}
    >
      <button
        ref={ref}
        type={type ?? "button"}
        aria-current={active ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)]"
        {...rest}
      >
        <Sidebar.RowIcon variant={computedVariant} unread={unread}>
          {icon}
        </Sidebar.RowIcon>
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
      <RowMore
        label={typeof label === "string" ? `Options for ${label}` : "Row options"}
        onClick={onMoreClick}
      />
    </div>
  );
});

/**
 * `RowIcon` — the leading icon on a `SessionRow`. Four built-in variants:
 *  - `"diff"`   (default) — two circles with crossing arrows (session thread)
 *  - `"dots"`             — three stacked dots
 *  - `"circle"`           — single ring; fill it with `unread`
 *  - `"custom"`           — render `children` verbatim (your own `<svg>` etc.)
 */
type RowIconVariant = "diff" | "dots" | "circle" | "custom";

function RowIcon({
  variant = "diff",
  unread,
  children,
  className,
}: {
  variant?: RowIconVariant;
  unread?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const base = "inline-flex h-4 w-4 shrink-0 items-center justify-center text-[var(--color-muted)]";
  if (variant === "custom") {
    return <span className={`${base} ${className ?? ""}`}>{children}</span>;
  }
  if (variant === "dots") {
    return (
      <span className={`${base} flex-col gap-[2px] ${className ?? ""}`}>
        <span className="block h-[3px] w-[3px] rounded-full bg-current" />
        <span className="block h-[3px] w-[3px] rounded-full bg-current" />
        <span className="block h-[3px] w-[3px] rounded-full bg-current" />
      </span>
    );
  }
  if (variant === "circle") {
    return (
      <span className={`${base} ${className ?? ""}`}>
        <span
          className={`h-2 w-2 rounded-full border ${
            unread
              ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
              : "border-[var(--color-muted)]"
          }`}
          aria-hidden
        />
      </span>
    );
  }
  // diff — two circles with crossing arrows (SVG matches Claude's rowIconDiff)
  return (
    <span className={`${base} ${className ?? ""}`} aria-hidden>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="4.75" cy="4.25" r="1.9" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="11.25" cy="11.75" r="1.9" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M4.75 6.15v6.1M3 10.5l1.75 1.75L6.5 10.5M11.25 9.85v-6.1M13 5.5l-1.75-1.75L9.5 5.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function RowMore({
  label,
  onClick,
  className,
}: {
  /** Required for accessibility — describes what the menu applies to. */
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={false}
      onClick={onClick}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted)] opacity-0 transition-opacity hover:bg-[var(--color-border)] hover:text-[var(--color-fg)] focus-visible:opacity-100 group-hover/row:opacity-100 ${className ?? ""}`}
    >
      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <circle cx="10" cy="4.5" r="1.5" />
        <circle cx="10" cy="10" r="1.5" />
        <circle cx="10" cy="15.5" r="1.5" />
      </svg>
    </button>
  );
}

/* ── Footer ─────────────────────────────────────────────────────────────── */

function Footer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-2.5 text-xs text-[var(--color-fg)] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function FooterLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`truncate ${className ?? ""}`}>{children}</span>;
}

/**
 * `FooterSpacer` — pushes trailing actions to the right edge of the footer.
 * Same trick as `.footerSpacer` in the Claude markup: a `flex-1` element.
 */
function FooterSpacer() {
  return <span className="flex-1" aria-hidden />;
}

type FooterActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Required for accessibility — describes what the button does. */
  label: string;
  children: ReactNode;
};

const FooterAction = forwardRef<HTMLButtonElement, FooterActionProps>(function FooterAction(
  { label, className, type, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg)] ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ── Public API ─────────────────────────────────────────────────────────── */

export const Sidebar = Object.assign(SidebarRoot, {
  ModeRow,
  ModeTab,
  NavTop,
  NavItem,
  Sessions,
  SessionGroup,
  SessionRow,
  RowIcon,
  RowMore,
  Footer: Object.assign(Footer, {
    Label: FooterLabel,
    Spacer: FooterSpacer,
    Action: FooterAction,
  }),
});

/** Re-exports for consumers that prefer named imports. */
export const {
  ModeRow: SidebarModeRow,
  ModeTab: SidebarModeTab,
  NavTop: SidebarNavTop,
  NavItem: SidebarNavItem,
  Sessions: SidebarSessions,
  SessionGroup: SidebarSessionGroup,
  SessionRow: SidebarSessionRow,
  RowIcon: SidebarRowIcon,
  RowMore: SidebarRowMore,
  Footer: SidebarFooter,
} = {
  ModeRow,
  ModeTab,
  NavTop,
  NavItem,
  Sessions,
  SessionGroup,
  SessionRow,
  RowIcon,
  RowMore,
  Footer: Object.assign(Footer, {
    Label: FooterLabel,
    Spacer: FooterSpacer,
    Action: FooterAction,
  }),
};

/** Public alias for the icon variants — useful in JSX. */
export type SidebarRowIconVariant = RowIconVariant;
