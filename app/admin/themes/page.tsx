import { PageHeader } from "@/components/admin/page-header";
import { MediaAssetUploader } from "@/components/admin/media-asset-uploader";
import { ThemeEditorLive } from "@/components/admin/theme-editor-live";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { createMediaAssetAction, createThemeAction, updateMediaAssetAction, updateThemeAction } from "@/app/admin/actions";
import { getWorkspaceSnapshot } from "@/modules/shared/services/workspace-query-service";
import type { ThemeConfig } from "@/modules/shared/types/contracts";

type ThemeRecord = {
  id: string;
  name: string;
  backgroundType: string;
  backgroundImageUrl: string | null;
  logoUrl: string | null;
  accentColor: string;
  overlayMode: boolean;
  textColorSettings: unknown;
  layoutPreferences: unknown;
  updatedAt: Date;
};

type ThemeFieldDefaults = {
  backgroundColorStart: string;
  backgroundColorEnd: string;
  backgroundColorMode: ThemeConfig["backgroundColorMode"];
  textColor: string;
  mutedTextColor: string;
  surfaceTint: string;
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
  accentColor: string;
};

type CuratedThemePreset = ThemeFieldDefaults & {
  name: string;
  summary: string;
};

const CURATED_THEME_PRESETS: CuratedThemePreset[] = [
  {
    name: "Broadcast Emerald",
    summary: "High-contrast stage look with crisp panels and energetic accents.",
    backgroundColorStart: "#12304a",
    backgroundColorEnd: "#020617",
    backgroundColorMode: "gradient",
    accentColor: "#34d399",
    textColor: "#f8fafc",
    mutedTextColor: "#94a3b8",
    surfaceTint: "rgba(8, 15, 28, 0.72)",
    displayStyle: "broadcast",
    motionProfile: "dynamic",
    backgroundFit: "cover",
    backgroundPosition: "center",
    logoPosition: "top_right",
    contentAlignment: "left",
    panelStyle: "glass",
    heroImageBehavior: "poster",
    overlayOpacity: 0.72,
    logoScale: 1,
    showMetaPanel: true,
    showSceneLabel: true,
  },
  {
    name: "Velvet Gold",
    summary: "Warmer presentation style for premium prizes and sponsor moments.",
    backgroundColorStart: "#3b1f0f",
    backgroundColorEnd: "#06070f",
    backgroundColorMode: "gradient",
    accentColor: "#fbbf24",
    textColor: "#f8fafc",
    mutedTextColor: "#94a3b8",
    surfaceTint: "rgba(8, 15, 28, 0.72)",
    displayStyle: "cinematic",
    motionProfile: "calm",
    backgroundFit: "cover",
    backgroundPosition: "center",
    logoPosition: "top_left",
    contentAlignment: "left",
    panelStyle: "solid",
    heroImageBehavior: "spotlight",
    overlayOpacity: 0.78,
    logoScale: 0.94,
    showMetaPanel: true,
    showSceneLabel: true,
  },
  {
    name: "Glass Sunrise",
    summary: "Cleaner center-weighted look with lighter chrome and softer framing.",
    backgroundColorStart: "#10324a",
    backgroundColorEnd: "#08111f",
    backgroundColorMode: "gradient",
    accentColor: "#38bdf8",
    textColor: "#f8fafc",
    mutedTextColor: "#94a3b8",
    surfaceTint: "rgba(8, 15, 28, 0.72)",
    displayStyle: "minimal",
    motionProfile: "dynamic",
    backgroundFit: "cover",
    backgroundPosition: "center",
    logoPosition: "top_center",
    contentAlignment: "center",
    panelStyle: "minimal",
    heroImageBehavior: "background",
    overlayOpacity: 0.6,
    logoScale: 0.9,
    showMetaPanel: false,
    showSceneLabel: true,
  },
];

function getThemeDefaults(theme: ThemeRecord) {
  const text = (theme.textColorSettings as Record<string, string> | null) ?? {};
  const layout = (theme.layoutPreferences as Record<string, unknown> | null) ?? {};

  return {
    backgroundColorStart: (layout.backgroundColorStart as string | undefined) ?? "#0f172a",
    backgroundColorEnd: (layout.backgroundColorEnd as string | undefined) ?? "#020617",
    backgroundColorMode: (layout.backgroundColorMode as ThemeConfig["backgroundColorMode"] | undefined) ?? "gradient",
    accentColor: theme.accentColor,
    textColor: text.primary ?? "#f8fafc",
    mutedTextColor: text.muted ?? "#94a3b8",
    surfaceTint: text.surfaceTint ?? "rgba(8, 15, 28, 0.72)",
    displayStyle: (layout.displayStyle as ThemeConfig["displayStyle"] | undefined) ?? "broadcast",
    motionProfile: (layout.motionProfile as ThemeConfig["motionProfile"] | undefined) ?? "dynamic",
    backgroundFit: (layout.backgroundFit as ThemeConfig["backgroundFit"] | undefined) ?? "cover",
    backgroundPosition: (layout.backgroundPosition as ThemeConfig["backgroundPosition"] | undefined) ?? "center",
    overlayOpacity: typeof layout.overlayOpacity === "number" ? layout.overlayOpacity : 0.72,
    logoScale: typeof layout.logoScale === "number" ? layout.logoScale : 1,
    logoPosition: (layout.logoPosition as ThemeConfig["logoPosition"] | undefined) ?? "top_right",
    contentAlignment: (layout.contentAlignment as ThemeConfig["contentAlignment"] | undefined) ?? "left",
    showMetaPanel: typeof layout.showMetaPanel === "boolean" ? layout.showMetaPanel : true,
    showSceneLabel: typeof layout.showSceneLabel === "boolean" ? layout.showSceneLabel : true,
    panelStyle: (layout.panelStyle as ThemeConfig["panelStyle"] | undefined) ?? "glass",
    heroImageBehavior: (layout.heroImageBehavior as ThemeConfig["heroImageBehavior"] | undefined) ?? "poster",
  };
}

function ThemePreview({
  name,
  backgroundType,
  backgroundImageUrl,
  logoUrl,
  defaults,
}: {
  name: string;
  backgroundType: string;
  backgroundImageUrl?: string | null;
  logoUrl?: string | null;
  defaults: ThemeFieldDefaults;
}) {
  const backgroundLayer =
    backgroundType === "image" && backgroundImageUrl
      ? `linear-gradient(180deg, rgba(2,6,23,0.18), rgba(2,6,23,0.68)), url(${backgroundImageUrl}) center/${defaults.backgroundFit} no-repeat`
      : `linear-gradient(135deg, ${defaults.backgroundColorStart} 0%, ${defaults.backgroundColorEnd} 100%)`;

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10" style={{ background: backgroundLayer, minHeight: 240 }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,${defaults.overlayOpacity}))` }} />
      <div className="relative flex h-full min-h-[240px] flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/78">{defaults.displayStyle}</div>
          <div className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em]" style={{ borderColor: `${defaults.accentColor}55`, color: defaults.textColor, backgroundColor: `${defaults.accentColor}16` }}>
            {defaults.motionProfile}
          </div>
        </div>

        <div className={defaults.contentAlignment === "center" ? "text-center" : "text-left"}>
          <p className="text-xs uppercase tracking-[0.32em] text-white/58">Theme Preview</p>
          <h3 className="mt-2 text-3xl font-semibold" style={{ color: defaults.textColor }}>{name}</h3>
          <p className="mt-3 text-[2.4rem] font-semibold tracking-[0.16em]" style={{ color: defaults.textColor }}>830214</p>
          <p className="mt-2 max-w-sm text-sm" style={{ color: defaults.mutedTextColor }}>
            Hero image {defaults.heroImageBehavior} with {defaults.panelStyle} panels.
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="rounded-[1.1rem] border px-4 py-3" style={{ backgroundColor: defaults.surfaceTint, borderColor: "rgba(255,255,255,0.12)", color: defaults.textColor, opacity: defaults.showMetaPanel ? 1 : 0.55 }}>
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/55">Meta</p>
            <p className="mt-2 text-sm">Progress panel {defaults.showMetaPanel ? "on" : "hidden"}</p>
          </div>
          {logoUrl ? <div className="rounded-[1rem] border border-white/12 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.24em] text-white/72">Logo attached</div> : null}
        </div>
      </div>
    </div>
  );
}


function PresetCard({ eventId, preset }: { eventId: string; preset: CuratedThemePreset }) {
  return (
    <form action={createThemeAction} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="name" value={preset.name} />
      <input type="hidden" name="backgroundType" value="image" />
      <input type="hidden" name="backgroundColorStart" value={preset.backgroundColorStart} />
      <input type="hidden" name="backgroundColorEnd" value={preset.backgroundColorEnd} />
      <input type="hidden" name="backgroundColorMode" value={preset.backgroundColorMode} />
      <input type="hidden" name="accentColor" value={preset.accentColor} />
      <input type="hidden" name="textColor" value={preset.textColor} />
      <input type="hidden" name="mutedTextColor" value={preset.mutedTextColor} />
      <input type="hidden" name="surfaceTint" value={preset.surfaceTint} />
      <input type="hidden" name="displayStyle" value={preset.displayStyle} />
      <input type="hidden" name="motionProfile" value={preset.motionProfile} />
      <input type="hidden" name="backgroundFit" value={preset.backgroundFit} />
      <input type="hidden" name="backgroundPosition" value={preset.backgroundPosition} />
      <input type="hidden" name="overlayOpacity" value={String(preset.overlayOpacity)} />
      <input type="hidden" name="logoScale" value={String(preset.logoScale)} />
      <input type="hidden" name="logoPosition" value={preset.logoPosition} />
      <input type="hidden" name="contentAlignment" value={preset.contentAlignment} />
      <input type="hidden" name="panelStyle" value={preset.panelStyle} />
      <input type="hidden" name="heroImageBehavior" value={preset.heroImageBehavior} />
      <input type="hidden" name="showMetaPanel" value={String(preset.showMetaPanel)} />
      <input type="hidden" name="showSceneLabel" value={String(preset.showSceneLabel)} />
      {preset.name === "Glass Sunrise" ? <input type="hidden" name="overlayMode" value="true" /> : null}

      <ThemePreview name={preset.name} backgroundType="color" defaults={preset} />

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-50">{preset.name}</p>
          <p className="mt-1 text-sm text-slate-400">{preset.summary}</p>
        </div>
        <div className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{preset.accentColor}</div>
      </div>

      <Button type="submit" variant="secondary" className="mt-4 w-full">
        Clone Preset
      </Button>
    </form>
  );
}

export default async function ThemesPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const workspace = await getWorkspaceSnapshot(event);
  const selectedEvent = workspace.selectedEvent;

  if (!selectedEvent) {
    return (
      <Surface className="space-y-3">
        <SurfaceTitle>No event selected</SurfaceTitle>
        <SurfaceCopy>Choose an event from the sidebar switcher before editing themes and branding.</SurfaceCopy>
      </Surface>
    );
  }

  const backgrounds = selectedEvent.mediaAssets.filter((asset) => asset.kind === "background");
  const logos = selectedEvent.mediaAssets.filter((asset) => asset.kind === "logo");
  const routes = [
    { label: "Lucky Draw", href: `/display/lucky-draw/${selectedEvent.slug}` },
    { label: "Full Winners", href: `/display/lucky-draw-all/${selectedEvent.slug}` },
    { label: "Auction", href: `/display/auction/${selectedEvent.slug}` },
    { label: "Master", href: `/display/master/${selectedEvent.slug}` },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Themes & Media"
        title="Theme editor rebuilt around the actual live workflow"
        description="Pick a look, attach the background and logo, save, and the display polling picks it up live. Advanced controls are still here, but they no longer crowd the primary editing flow."
      />

      <Surface className="overflow-hidden p-0">
        <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">Applies live after save</Badge>
              <Badge>Event: {selectedEvent.name}</Badge>
              <Badge>{selectedEvent.themes.length} themes</Badge>
            </div>
            <div className="max-w-3xl space-y-2">
              <h2 className="text-2xl font-semibold text-slate-50">Editing order is now simple</h2>
              <p className="text-sm text-slate-400">
                Start from a preset if you want, choose the background, choose the logo, then fine-tune layout only if the screen still needs it.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Step 1</p>
                <p className="mt-2 font-medium text-slate-100">Pick the visual direction</p>
                <p className="mt-1 text-sm text-slate-400">Use a starter preset or build from scratch.</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Step 2</p>
                <p className="mt-2 font-medium text-slate-100">Attach real assets</p>
                <p className="mt-1 text-sm text-slate-400">Choose one background and one logo from the library or a manual path.</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Step 3</p>
                <p className="mt-2 font-medium text-slate-100">Save and check the screen</p>
                <p className="mt-1 text-sm text-slate-400">Open any live route below to confirm the change right away.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/10 p-6 xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live routes</p>
            <div className="mt-4 grid gap-3">
              {routes.map((route) => (
                <div key={route.href} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="font-medium text-slate-100">{route.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{route.href}</p>
                  <div className="mt-3">
                    <a href={route.href} target="_blank" rel="noreferrer" className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                      Open display
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Starter looks</h2>
          <p className="mt-2 text-sm text-slate-400">Clone one of these if you want a strong base before making event-specific adjustments.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {CURATED_THEME_PRESETS.map((preset) => (
            <PresetCard key={preset.name} eventId={selectedEvent.id} preset={preset} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <Surface className="space-y-5">
          <div className="space-y-2">
            <SurfaceTitle>Create theme</SurfaceTitle>
            <SurfaceCopy>
              This is the guided editor for new themes. The top fields cover the decisions you make most often. Everything else is tucked under Advanced.
            </SurfaceCopy>
          </div>

          <form action={createThemeAction} className="space-y-5">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <ThemeEditorLive
              prefix="create-theme"
              assets={{ backgrounds, logos }}
              initialValue={{
                ...CURATED_THEME_PRESETS[0],
                name: "New Theme",
                backgroundType: "color",
                backgroundImageUrl: undefined,
                logoUrl: undefined,
                backgroundColorMode: CURATED_THEME_PRESETS[0].backgroundColorMode,
                overlayMode: false,
              }}
            />

            <label className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
              <input type="checkbox" name="setAsDefault" className="size-4 rounded border-white/10 bg-transparent" />
              Make this the event default theme
            </label>

            <Button type="submit" className="w-full">
              Save Theme
            </Button>
          </form>
        </Surface>

        <Surface className="space-y-5">
          <div className="space-y-2">
            <SurfaceTitle>Asset library</SurfaceTitle>
            <SurfaceCopy>Upload once, then reuse the same media across themes, prize screens, and overlays.</SurfaceCopy>
          </div>

          <MediaAssetUploader eventId={selectedEvent.id} />

          <form action={createMediaAssetAction} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
            <input type="hidden" name="eventId" value={selectedEvent.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assetKindManual">Kind</Label>
                <Select id="assetKindManual" name="kind" defaultValue="supporting">
                  <option value="supporting">Supporting or doorprize</option>
                  <option value="background">Theme background</option>
                  <option value="logo">Logo mark</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assetTitleManual">Title</Label>
                <Input id="assetTitleManual" name="title" placeholder="Sponsor hero image" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="assetPublicUrlManual">Public URL</Label>
                <Input id="assetPublicUrlManual" name="publicUrl" placeholder="/uploads/event-assets/doorprize.jpg" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="assetTagsManual">Tags</Label>
                <Input id="assetTagsManual" name="tags" placeholder="doorprize, lucky draw, sponsor" />
              </div>
            </div>
            <Button type="submit" variant="secondary" className="w-full">
              Add URL Asset
            </Button>
          </form>
        </Surface>
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Saved themes</h2>
          <p className="mt-2 text-sm text-slate-400">Each saved theme shows its visual summary first, then the editor underneath. Default themes are clearly marked.</p>
        </div>

        {selectedEvent.themes.map((theme) => {
          const defaults = getThemeDefaults(theme as ThemeRecord);

          return (
            <Surface key={theme.id} className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <SurfaceTitle>{theme.name}</SurfaceTitle>
                      <SurfaceCopy>{theme.backgroundType.replace(/_/g, " ")} | updated {theme.updatedAt.toLocaleDateString()}</SurfaceCopy>
                    </div>
                    {selectedEvent.defaultThemeId === theme.id ? <Badge variant="success">default</Badge> : <Badge>preset</Badge>}
                  </div>

                  <ThemePreview
                    name={theme.name}
                    backgroundType={theme.backgroundType}
                    backgroundImageUrl={theme.backgroundImageUrl}
                    logoUrl={theme.logoUrl}
                    defaults={defaults}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Style</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {defaults.displayStyle}, {defaults.panelStyle}, {defaults.motionProfile}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Layout</p>
                      <p className="mt-2 text-sm text-slate-200">
                        {defaults.contentAlignment} aligned, logo {defaults.logoPosition.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                <form action={updateThemeAction} className="space-y-5">
                  <input type="hidden" name="themeId" value={theme.id} />
                  <input type="hidden" name="eventId" value={selectedEvent.id} />

                  <ThemeEditorLive
                    prefix={`theme-${theme.id}`}
                    assets={{ backgrounds, logos }}
                    initialValue={{
                      name: theme.name,
                      ...defaults,
                      backgroundType: theme.backgroundType,
                      backgroundImageUrl: theme.backgroundImageUrl ?? undefined,
                      logoUrl: theme.logoUrl ?? undefined,
                      overlayMode: theme.overlayMode,
                    }}
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                      <input type="checkbox" name="setAsDefault" defaultChecked={selectedEvent.defaultThemeId === theme.id} className="size-4 rounded border-white/10 bg-transparent" />
                      Event default
                    </label>
                    <Button type="submit" variant="secondary">
                      Update Theme
                    </Button>
                  </div>
                </form>
              </div>
            </Surface>
          );
        })}
      </div>

      <Surface className="space-y-5">
        <div className="space-y-2">
          <SurfaceTitle>Registered media assets</SurfaceTitle>
          <SurfaceCopy>Keep titles and tags clean here so the theme picker stays easier to scan.</SurfaceCopy>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {selectedEvent.mediaAssets.map((asset) => {
            const metadata = (asset.metadata as { title?: string; altText?: string; tags?: string[] } | null) ?? {};
            return (
              <div key={asset.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="aspect-[4/3] overflow-hidden rounded-[1rem] border border-white/10 bg-slate-950/60">
                  <img src={asset.publicUrl} alt={metadata.altText ?? metadata.title ?? "Media asset"} className="h-full w-full object-cover" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-50">{metadata.title ?? asset.kind}</p>
                    <p className="text-sm text-slate-500">{asset.kind}</p>
                  </div>
                  <Badge>{asset.kind}</Badge>
                </div>

                <form action={updateMediaAssetAction} className="mt-4 space-y-3">
                  <input type="hidden" name="mediaAssetId" value={asset.id} />
                  <input type="hidden" name="eventId" value={selectedEvent.id} />
                  <input type="hidden" name="kind" value={asset.kind} />
                  <input type="hidden" name="publicUrl" value={asset.publicUrl} />
                  <input type="hidden" name="bucket" value={asset.bucket ?? ""} />
                  <input type="hidden" name="path" value={asset.path ?? ""} />
                  <input type="hidden" name="mimeType" value={asset.mimeType ?? ""} />

                  <div className="space-y-2">
                    <Label htmlFor={`media-title-${asset.id}`}>Title</Label>
                    <Input id={`media-title-${asset.id}`} name="title" defaultValue={metadata.title ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`media-alt-${asset.id}`}>Alt text</Label>
                    <Input id={`media-alt-${asset.id}`} name="altText" defaultValue={metadata.altText ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`media-tags-${asset.id}`}>Tags</Label>
                    <Input id={`media-tags-${asset.id}`} name="tags" defaultValue={(metadata.tags ?? []).join(", ")} />
                  </div>

                  <Button type="submit" variant="secondary" className="w-full">
                    Update Asset
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      </Surface>
    </div>
  );
}
