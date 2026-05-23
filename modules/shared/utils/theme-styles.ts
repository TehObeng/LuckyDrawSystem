import type { CSSProperties } from "react";
import { withBasePath } from "@/lib/public-path";
import type { ThemeConfig } from "@/modules/shared/types/contracts";

export function buildDisplayBackgroundStyle(theme: ThemeConfig, overlayMode: boolean): CSSProperties {
  const overlayAlpha = Math.max(0, Math.min(1, theme.overlayOpacity ?? 0.72));
  const useImage = theme.backgroundType === "image" && theme.backgroundImageUrl;
  const imageUrl = useImage ? withBasePath(theme.backgroundImageUrl ?? "") : "";
  const imageLayer = useImage ? `, url("${imageUrl}")` : "";
  const gradientStart = theme.backgroundColorStart ?? "#0f172a";
  const gradientEnd = theme.backgroundColorEnd ?? "#020617";
  const baseGradient = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
  const solidColor = gradientStart;
  const accentGlow = `radial-gradient(circle at top left, ${theme.accentColor}33, transparent 32%)`;
  const ambientGlow = "radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 28%)";
  const overlayLayer = `linear-gradient(180deg, rgba(2,6,23,${Math.max(0.28, overlayAlpha - 0.18)}), rgba(2,6,23,${Math.max(0.56, overlayAlpha + 0.12)}))`;
  const useSolid = !useImage && theme.backgroundColorMode === "solid";

  return {
    backgroundColor: overlayMode ? "transparent" : useSolid ? solidColor : gradientEnd,
    backgroundImage: useImage
      ? `${accentGlow}, ${ambientGlow}, ${overlayLayer}, ${baseGradient}${imageLayer}`
      : useSolid
        ? overlayLayer
        : `${accentGlow}, ${ambientGlow}, ${overlayLayer}, ${baseGradient}`,
    backgroundBlendMode: useImage ? "screen, screen, multiply, normal, normal" : useSolid ? "normal" : "screen, screen, multiply, normal",
    backgroundPosition: useImage ? `top left, top right, center, center, ${theme.backgroundPosition}` : useSolid ? "center" : "top left, top right, center, center",
    backgroundSize: useImage ? `auto, auto, auto, auto, ${theme.backgroundFit}` : useSolid ? "auto" : "auto, auto, auto, auto",
  };
}
