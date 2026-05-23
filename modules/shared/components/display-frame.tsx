import type { CSSProperties, ReactNode } from "react";
import type { ThemeConfig } from "@/modules/shared/types/contracts";
import { withBasePath } from "@/lib/public-path";
import { cn } from "@/lib/utils";
import { buildDisplayBackgroundStyle } from "@/modules/shared/utils/theme-styles";

interface DisplayFrameProps {
  moduleLabel: string;
  title: string;
  subtitle?: string;
  sceneLabel?: string;
  displayMode: "fullscreen" | "overlay";
  theme: ThemeConfig;
  meta?: ReactNode;
  children: ReactNode;
}

function formatSceneLabel(value?: string) {
  if (!value) {
    return undefined;
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DisplayFrame({
  moduleLabel,
  title,
  subtitle,
  sceneLabel,
  displayMode,
  theme,
  meta,
  children,
}: DisplayFrameProps) {
  const overlayMode = displayMode === "overlay" || theme.overlayMode;
  const surfaceStyle: CSSProperties = {
    backgroundColor:
      theme.panelStyle === "solid"
        ? "rgba(2, 6, 23, 0.92)"
        : theme.panelStyle === "minimal"
          ? "rgba(2, 6, 23, 0.16)"
          : overlayMode
            ? `rgba(2, 6, 23, ${Math.max(0.24, theme.overlayOpacity - 0.24)})`
            : theme.surfaceTint,
    color: theme.textColor,
    borderColor: `${theme.accentColor}22`,
  };
  const logoAlignment =
    theme.logoPosition === "top_left" ? "items-start" : theme.logoPosition === "top_center" ? "items-center" : "items-end";
  const logoJustification =
    theme.logoPosition === "top_left" ? "justify-start" : theme.logoPosition === "top_center" ? "justify-center" : "justify-end";

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden",
        overlayMode ? "bg-transparent" : "bg-slate-950",
      )}
      style={{
        color: theme.textColor,
        ...buildDisplayBackgroundStyle(theme, overlayMode),
      }}
    >
      <div className="pointer-events-none absolute inset-0 display-noise" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background: `linear-gradient(180deg, ${theme.accentColor}18 0%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-6 sm:px-10 sm:py-8 xl:px-14 xl:py-10">
        <header className={`flex flex-col gap-4 lg:flex-row lg:items-start ${theme.contentAlignment === "center" ? "lg:justify-center" : "lg:justify-between"}`}>
          <div className={`space-y-4 ${theme.contentAlignment === "center" ? "mx-auto max-w-5xl text-center" : "max-w-4xl"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.34em]"
                style={{
                  borderColor: `${theme.accentColor}55`,
                  backgroundColor: `${theme.accentColor}1a`,
                  color: theme.textColor,
                }}
              >
                {moduleLabel}
              </span>
              {sceneLabel && theme.showSceneLabel ? (
                <span className="text-xs font-medium uppercase tracking-[0.3em]" style={{ color: theme.mutedTextColor }}>
                  {formatSceneLabel(sceneLabel)}
                </span>
              ) : null}
            </div>

            <div className="space-y-3">
              <h1 className="max-w-5xl text-4xl font-semibold tracking-tight sm:text-5xl xl:text-6xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="max-w-3xl text-base sm:text-lg xl:text-xl" style={{ color: theme.mutedTextColor }}>{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className={`flex flex-col gap-3 ${logoAlignment} ${logoJustification} lg:w-[18rem]`}>
            {theme.logoUrl ? (
              <img
                alt="Event logo"
                className="max-h-16 max-w-[12rem] object-contain opacity-95 drop-shadow-[0_18px_36px_rgba(0,0,0,0.28)] lg:max-h-20"
                style={{
                  transform: `scale(${theme.logoScale})`,
                  transformOrigin: theme.logoPosition === "top_left" ? "top left" : theme.logoPosition === "top_center" ? "top center" : "top right",
                }}
                src={withBasePath(theme.logoUrl)}
              />
            ) : null}
            {meta && theme.showMetaPanel ? (
              <div className="w-full max-w-sm rounded-[1.4rem] border p-4 backdrop-blur-xl lg:w-auto" style={surfaceStyle}>
                {meta}
              </div>
            ) : null}
          </div>
        </header>

        <section className="relative flex flex-1 items-center py-8 sm:py-10">{children}</section>
      </div>
    </main>
  );
}
