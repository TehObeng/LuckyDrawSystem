"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LuckyDrawDisplayContent } from "@/modules/lucky-draw/components/lucky-draw-display-content";
import { DisplayFrame } from "@/modules/shared/components/display-frame";
import { defaultPrizeBoardSettings, type LuckyDrawDisplayEnvelope, type ThemeConfig } from "@/modules/shared/types/contracts";

type AssetOption = {
  id: string;
  publicUrl: string;
  metadata: unknown;
};

type EditableThemeValue = {
  name: string;
  backgroundType: ThemeConfig["backgroundType"];
  backgroundImageUrl?: string;
  logoUrl?: string;
  backgroundColorStart: string;
  backgroundColorEnd: string;
  backgroundColorMode: ThemeConfig["backgroundColorMode"];
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  surfaceTint: string;
  overlayMode: boolean;
  displayStyle: ThemeConfig["displayStyle"];
  motionProfile: ThemeConfig["motionProfile"];
  backgroundFit: ThemeConfig["backgroundFit"];
  backgroundPosition: ThemeConfig["backgroundPosition"];
  overlayOpacity: number;
  logoScale: number;
  logoPosition: ThemeConfig["logoPosition"];
  contentAlignment: ThemeConfig["contentAlignment"];
  showMetaPanel: boolean;
  showSceneLabel: boolean;
  panelStyle: ThemeConfig["panelStyle"];
  heroImageBehavior: ThemeConfig["heroImageBehavior"];
};

type ThemeEditorLiveProps = {
  prefix: string;
  assets: {
    backgrounds: AssetOption[];
    logos: AssetOption[];
  };
  initialValue: EditableThemeValue;
};

function assetLabel(asset: AssetOption) {
  return String((asset.metadata as { title?: string } | null)?.title ?? asset.publicUrl);
}

function ColorField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-3 py-3">
        <input
          id={id}
          name={name}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-0"
        />
        <span className="text-sm text-slate-300">{value}</span>
      </div>
    </div>
  );
}

function ThemeLiveDisplayPreview({ theme }: { theme: EditableThemeValue }) {
  const { name, ...themeSettings } = theme;
  const previewTheme = useMemo<ThemeConfig>(() => themeSettings, [themeSettings]);
  const previewState = useMemo<LuckyDrawDisplayEnvelope>(() => {
    const winners: LuckyDrawDisplayEnvelope["winners"] = ["001325", "003251", "000987", "946168", "000000", "312464", "121222", "369852"].map((ticketNumber, index, list) => ({
      id: `winner-${index + 1}`,
      ticketNumber,
      emphasis: index === list.length - 1 ? "latest" : "standard",
    }));
    const allPrizeWinners: LuckyDrawDisplayEnvelope["allPrizeWinners"] = [
      "001325",
      "003251",
      "000987",
      "946168",
      "000000",
      "312464",
      "121222",
      "123456",
      "213645",
      "123654",
      "369852",
    ].map((ticketNumber, index, list) => ({
      id: `full-winner-${index + 1}`,
      ticketNumber,
      emphasis: index === list.length - 1 ? "latest" : "standard",
    }));

    return {
      eventId: "theme-preview",
      eventSlug: "theme-preview",
      screenKey: "theme-preview-lucky-draw",
      moduleType: "lucky_draw",
      revision: 1,
      displayMode: "fullscreen",
      theme: previewTheme,
      publishedAt: new Date(0).toISOString(),
      scene: "revealed",
      prizeCategoryId: "preview-prize",
      drawSessionId: "preview-session",
      prizeName: name || "Lucky Draw Preview",
      prizeImageUrl: undefined,
      latestWinningNumber: winners.at(-1)?.ticketNumber,
      winners,
      allPrizeWinners,
      layoutMode: "grid",
      animationPreset: "fade_pop",
      animationSpeed: 1,
      grid: {
        itemCount: 12,
        rows: 3,
        cols: 4,
      },
      progress: {
        planned: 11,
        actual: winners.length,
      },
      prizeProgress: {
        planned: 33,
        actual: allPrizeWinners.length,
      },
      prizeBoardSettings: defaultPrizeBoardSettings,
      cue: "Preview uses the actual lucky draw display renderer.",
      replayToken: 1,
    };
  }, [name, previewTheme]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Real display preview</p>
          <p className="mt-1 text-sm text-slate-400">This uses the same lucky draw display frame and content components as the live overlay.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
          Session overlay
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950" style={{ height: 420 }}>
        <div
          className="pointer-events-none"
          style={{
            width: "285.714%",
            transform: "scale(0.35)",
            transformOrigin: "top left",
          }}
        >
          <DisplayFrame
            moduleLabel="Lucky Draw"
            title={previewState.prizeName ?? "Lucky Draw Preview"}
            subtitle={previewState.cue ?? "Preview uses the actual lucky draw display renderer."}
            sceneLabel={previewState.scene}
            displayMode={previewState.displayMode}
            theme={previewState.theme}
            meta={
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex items-center justify-between gap-4">
                  <span className="uppercase tracking-[0.26em] text-white/58">Mode</span>
                  <span className="font-semibold capitalize text-white">{previewState.layoutMode}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="uppercase tracking-[0.26em] text-white/58">Progress</span>
                  <span className="font-semibold text-white">{previewState.progress.actual} / {previewState.progress.planned} revealed</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="uppercase tracking-[0.26em] text-white/58">Animation</span>
                  <span className="font-semibold text-white">fade pop</span>
                </div>
              </div>
            }
          >
            <LuckyDrawDisplayContent state={previewState} variant="session" />
          </DisplayFrame>
        </div>
      </div>
    </div>
  );
}

export function ThemeEditorLive({ prefix, assets, initialValue }: ThemeEditorLiveProps) {
  const [theme, setTheme] = useState(initialValue);
  const fieldId = (name: string) => `${prefix}-${name}`;

  const update = <K extends keyof typeof theme>(key: K, value: (typeof theme)[K]) => {
    setTheme((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={fieldId("name")}>Theme name</Label>
        <Input id={fieldId("name")} name="name" value={theme.name} onChange={(event) => update("name", event.target.value)} placeholder="Main Stage Night One" required />
      </div>

      <ThemeLiveDisplayPreview theme={theme} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">1. Background</p>
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor={fieldId("backgroundType")}>Background mode</Label>
              <Select id={fieldId("backgroundType")} name="backgroundType" value={theme.backgroundType} onChange={(event) => update("backgroundType", event.target.value as ThemeConfig["backgroundType"])}>
                <option value="color">Color background</option>
                <option value="image">Background image</option>
                <option value="overlay_safe">Overlay safe</option>
                <option value="video_placeholder">Video-ready placeholder</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("backgroundColorMode")}>Color style</Label>
              <Select id={fieldId("backgroundColorMode")} name="backgroundColorMode" value={theme.backgroundColorMode} onChange={(event) => update("backgroundColorMode", event.target.value as ThemeConfig["backgroundColorMode"])}>
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField id={fieldId("backgroundColorStart")} name="backgroundColorStart" label="Background start" value={theme.backgroundColorStart} onChange={(next) => update("backgroundColorStart", next)} />
              <ColorField id={fieldId("backgroundColorEnd")} name="backgroundColorEnd" label={theme.backgroundColorMode === "solid" ? "Optional second color" : "Background end"} value={theme.backgroundColorEnd} onChange={(next) => update("backgroundColorEnd", next)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("backgroundAssetUrl")}>Library background</Label>
              <Select id={fieldId("backgroundAssetUrl")} name="backgroundAssetUrl" value={theme.backgroundImageUrl ?? ""} onChange={(event) => update("backgroundImageUrl", event.target.value || undefined)}>
                <option value="">Choose from uploaded assets</option>
                {assets.backgrounds.map((asset) => (
                  <option key={asset.id} value={asset.publicUrl}>
                    {assetLabel(asset)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("backgroundImageUrl")}>Manual background URL</Label>
              <Input id={fieldId("backgroundImageUrl")} name="backgroundImageUrl" value={theme.backgroundImageUrl ?? ""} onChange={(event) => update("backgroundImageUrl", event.target.value || undefined)} placeholder="/uploads/backgrounds/main-stage.jpg" />
              <p className="text-xs text-slate-500">For solid color mode, leave the image empty and use the first color picker. Use the second color only when you want a gradient.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">2. Brand</p>
          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor={fieldId("logoAssetUrl")}>Library logo</Label>
              <Select id={fieldId("logoAssetUrl")} name="logoAssetUrl" value={theme.logoUrl ?? ""} onChange={(event) => update("logoUrl", event.target.value || undefined)}>
                <option value="">Choose from uploaded assets</option>
                {assets.logos.map((asset) => (
                  <option key={asset.id} value={asset.publicUrl}>
                    {assetLabel(asset)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId("logoUrl")}>Manual logo URL</Label>
              <Input id={fieldId("logoUrl")} name="logoUrl" value={theme.logoUrl ?? ""} onChange={(event) => update("logoUrl", event.target.value || undefined)} placeholder="/uploads/logos/brand-mark.png" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">3. Core colors</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <ColorField id={fieldId("accentColor")} name="accentColor" label="Accent" value={theme.accentColor} onChange={(next) => update("accentColor", next)} />
          <ColorField id={fieldId("textColor")} name="textColor" label="Primary text" value={theme.textColor} onChange={(next) => update("textColor", next)} />
          <ColorField id={fieldId("mutedTextColor")} name="mutedTextColor" label="Muted text" value={theme.mutedTextColor} onChange={(next) => update("mutedTextColor", next)} />
          <div className="space-y-2">
            <Label htmlFor={fieldId("surfaceTint")}>Panel tint</Label>
            <Input id={fieldId("surfaceTint")} name="surfaceTint" value={theme.surfaceTint} onChange={(event) => update("surfaceTint", event.target.value)} />
          </div>
        </div>
      </div>

      <details className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
          Advanced layout, motion, and visibility
        </summary>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={fieldId("displayStyle")}>Display style</Label>
            <Select id={fieldId("displayStyle")} name="displayStyle" value={theme.displayStyle} onChange={(event) => update("displayStyle", event.target.value as ThemeConfig["displayStyle"])}>
              <option value="broadcast">Broadcast</option>
              <option value="cinematic">Cinematic</option>
              <option value="minimal">Minimal</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("motionProfile")}>Motion profile</Label>
            <Select id={fieldId("motionProfile")} name="motionProfile" value={theme.motionProfile} onChange={(event) => update("motionProfile", event.target.value as ThemeConfig["motionProfile"])}>
              <option value="dynamic">Dynamic</option>
              <option value="calm">Calm</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("panelStyle")}>Panel style</Label>
            <Select id={fieldId("panelStyle")} name="panelStyle" value={theme.panelStyle} onChange={(event) => update("panelStyle", event.target.value as ThemeConfig["panelStyle"])}>
              <option value="glass">Glass</option>
              <option value="solid">Solid</option>
              <option value="minimal">Minimal</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("backgroundFit")}>Background fit</Label>
            <Select id={fieldId("backgroundFit")} name="backgroundFit" value={theme.backgroundFit} onChange={(event) => update("backgroundFit", event.target.value as ThemeConfig["backgroundFit"])}>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="auto">Auto</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("backgroundPosition")}>Background position</Label>
            <Select id={fieldId("backgroundPosition")} name="backgroundPosition" value={theme.backgroundPosition} onChange={(event) => update("backgroundPosition", event.target.value as ThemeConfig["backgroundPosition"])}>
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("heroImageBehavior")}>Hero image behavior</Label>
            <Select id={fieldId("heroImageBehavior")} name="heroImageBehavior" value={theme.heroImageBehavior} onChange={(event) => update("heroImageBehavior", event.target.value as ThemeConfig["heroImageBehavior"])}>
              <option value="poster">Poster</option>
              <option value="spotlight">Spotlight</option>
              <option value="background">Background</option>
              <option value="none">None</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("overlayOpacity")}>Overlay opacity</Label>
            <Input id={fieldId("overlayOpacity")} name="overlayOpacity" type="number" min={0} max={1} step="0.05" value={theme.overlayOpacity} onChange={(event) => update("overlayOpacity", Number(event.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("logoScale")}>Logo scale</Label>
            <Input id={fieldId("logoScale")} name="logoScale" type="number" min={0.5} max={2} step="0.05" value={theme.logoScale} onChange={(event) => update("logoScale", Number(event.target.value) || 1)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("logoPosition")}>Logo position</Label>
            <Select id={fieldId("logoPosition")} name="logoPosition" value={theme.logoPosition} onChange={(event) => update("logoPosition", event.target.value as ThemeConfig["logoPosition"])}>
              <option value="top_left">Top left</option>
              <option value="top_right">Top right</option>
              <option value="top_center">Top center</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={fieldId("contentAlignment")}>Content alignment</Label>
            <Select id={fieldId("contentAlignment")} name="contentAlignment" value={theme.contentAlignment} onChange={(event) => update("contentAlignment", event.target.value as ThemeConfig["contentAlignment"])}>
              <option value="left">Left</option>
              <option value="center">Center</option>
            </Select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-black/10 px-3 py-3 text-sm text-slate-300">
            <input type="checkbox" name="overlayMode" checked={theme.overlayMode} onChange={(event) => update("overlayMode", event.target.checked)} className="size-4 rounded border-white/10 bg-transparent" />
            Overlay-safe mode
          </label>
          <label className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-black/10 px-3 py-3 text-sm text-slate-300">
            <input type="checkbox" name="showMetaPanel" checked={theme.showMetaPanel} onChange={(event) => update("showMetaPanel", event.target.checked)} className="size-4 rounded border-white/10 bg-transparent" />
            Show meta panel
          </label>
          <label className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-black/10 px-3 py-3 text-sm text-slate-300">
            <input type="checkbox" name="showSceneLabel" checked={theme.showSceneLabel} onChange={(event) => update("showSceneLabel", event.target.checked)} className="size-4 rounded border-white/10 bg-transparent" />
            Show scene label
          </label>
        </div>
      </details>
    </div>
  );
}
