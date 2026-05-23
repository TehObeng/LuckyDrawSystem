"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { withBasePath } from "@/lib/public-path";
import { defaultPrizeBoardSettings, type LuckyDrawAnimationPreset, type PrizeBoardSettings } from "@/modules/shared/types/contracts";

type WinnerStatus = "draft" | "revealed" | "confirmed" | "invalid" | "redrawn" | "deleted";

interface SimpleWinner {
  id: string;
  ticketNumber: string;
  revealOrder: number;
  status: WinnerStatus;
  notes?: string | null;
}

interface SimpleSession {
  id: string;
  name: string;
  prizeCategoryId: string;
  prizeName: string;
  plannedWinnerCount: number;
  actualWinnerCount: number;
  gridItemCount: number;
  gridRows: number | null;
  gridCols: number | null;
  status: string;
  winners: SimpleWinner[];
}

interface SimplePrize {
  id: string;
  name: string;
  quantity: number;
  animationPreset: LuckyDrawAnimationPreset;
  animationSpeed: number;
  boardSettings: PrizeBoardSettings;
}

interface InlineActionResult {
  ok: boolean;
  message: string;
}

interface SimpleLuckyDrawWorkspaceProps {
  eventId: string;
  eventSlug: string;
  eventName: string;
  prize: SimplePrize;
  session: SimpleSession;
  initialDesignWidth: number;
  initialDesignHeight: number;
  addWinnerAction: (formData: FormData) => Promise<InlineActionResult>;
  editWinnerAction: (formData: FormData) => Promise<InlineActionResult>;
  updateBoardSettingsAction: (formData: FormData) => Promise<InlineActionResult>;
  resetDrawAction: (formData: FormData) => Promise<InlineActionResult>;
  deleteAction: (formData: FormData) => Promise<InlineActionResult>;
}

const screenPresets = [
  { value: "1920x1080", label: "1920 x 1080", width: 1920, height: 1080 },
  { value: "1080x1920", label: "1080 x 1920", width: 1080, height: 1920 },
  { value: "1366x768", label: "1366 x 768", width: 1366, height: 768 },
  { value: "custom", label: "Custom", width: 0, height: 0 },
] as const;

function createFormData(values: Record<string, string | number | undefined>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      formData.set(key, String(value));
    }
  }

  return formData;
}

function calculateBoardShape(displayAmount: number, designWidth: number, designHeight: number) {
  const safeDisplayAmount = Math.max(1, Math.trunc(displayAmount) || 1);
  const safeDesignWidth = Math.max(1, designWidth || 1920);
  const safeDesignHeight = Math.max(1, designHeight || 1080);
  const columns = Math.max(1, Math.ceil(Math.sqrt(safeDisplayAmount * (safeDesignWidth / safeDesignHeight))));

  return {
    columns,
    rows: Math.max(1, Math.ceil(safeDisplayAmount / columns)),
  };
}

function mergeFormData(base: FormData, actualForm: FormData) {
  actualForm.forEach((value, key) => {
    base.set(key, value);
  });

  return base;
}

function ColorSettingField({
  label,
  name,
  value,
  onCommit,
}: {
  label: string;
  name: keyof PrizeBoardSettings;
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          className="h-11 w-16 shrink-0 cursor-pointer p-1"
          name={String(name)}
          type="color"
          value={draftValue}
          onBlur={() => onCommit(draftValue)}
          onChange={(event) => setDraftValue(event.target.value)}
        />
        <span className="min-w-0 truncate rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          {draftValue}
        </span>
      </div>
    </div>
  );
}

export function SimpleLuckyDrawWorkspace({
  eventId,
  eventSlug,
  eventName,
  prize,
  session,
  initialDesignWidth,
  initialDesignHeight,
  addWinnerAction,
  editWinnerAction,
  updateBoardSettingsAction,
  resetDrawAction,
  deleteAction,
}: SimpleLuckyDrawWorkspaceProps) {
  const router = useRouter();
  const [screenPreset, setScreenPreset] = useState(() => {
    if (initialDesignWidth === 1080 && initialDesignHeight === 1920) return "1080x1920";
    if (initialDesignWidth === 1366 && initialDesignHeight === 768) return "1366x768";
    if (initialDesignWidth === 1920 && initialDesignHeight === 1080) return "1920x1080";
    return "custom";
  });
  const [designWidth, setDesignWidth] = useState(initialDesignWidth);
  const [designHeight, setDesignHeight] = useState(initialDesignHeight);
  const [displayAmount, setDisplayAmount] = useState(session.gridItemCount ?? 12);
  const initialBoardShape = calculateBoardShape(session.gridItemCount ?? 12, initialDesignWidth, initialDesignHeight);
  const [gridColumns, setGridColumns] = useState(session.gridCols ?? initialBoardShape.columns);
  const [gridRows, setGridRows] = useState(session.gridRows ?? initialBoardShape.rows);
  const [animationPreset, setAnimationPreset] = useState<LuckyDrawAnimationPreset>(prize.animationPreset ?? "fade_pop");
  const [animationSpeed, setAnimationSpeed] = useState(prize.animationSpeed ?? 1);
  const [boardSettings, setBoardSettings] = useState<PrizeBoardSettings>(prize.boardSettings ?? defaultPrizeBoardSettings);
  const [numberPrefix, setNumberPrefix] = useState(boardSettings.numberPrefix ?? "");
  const [rangeStart, setRangeStart] = useState(boardSettings.numberRangeStart ?? 1);
  const [rangeEnd, setRangeEnd] = useState(boardSettings.numberRangeEnd ?? 999);
  const [rangePadLength, setRangePadLength] = useState(boardSettings.numberPadLength ?? 3);
  const [editingWinnerId, setEditingWinnerId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState("");
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });

  const visibleWinners = useMemo(
    () => session.winners.filter((winner) => winner.status !== "deleted" && winner.status !== "redrawn" && winner.status !== "invalid"),
    [session.winners],
  );
  const cleanDisplayRoute = withBasePath(`/display/lucky-draw-clean/${eventSlug}`);

  const setPreset = useCallback((value: string) => {
    setScreenPreset(value);
    const preset = screenPresets.find((item) => item.value === value);
    if (preset && preset.value !== "custom") {
      setDesignWidth(preset.width);
      setDesignHeight(preset.height);
      const nextShape = calculateBoardShape(displayAmount, preset.width, preset.height);
      setGridColumns(nextShape.columns);
      setGridRows(nextShape.rows);
    }
  }, [displayAmount]);

  const boardFields = useCallback(
    () => ({
      displayAmount,
      designWidth,
      designHeight,
      gridRows,
      gridCols: gridColumns,
    }),
    [designHeight, designWidth, displayAmount, gridColumns, gridRows],
  );

  const boardSettingsFields = useCallback(
    () => ({
      columns: boardSettings.columns,
      minItemWidth: boardSettings.minItemWidth,
      cardMinHeight: boardSettings.cardMinHeight,
      boardMaxWidth: boardSettings.boardMaxWidth,
      gap: boardSettings.gap,
      cleanGridGap: boardSettings.cleanGridGap,
      cleanGridPadding: boardSettings.cleanGridPadding,
      cardPadding: boardSettings.cardPadding,
      cleanCardWidth: boardSettings.cleanCardWidth,
      cleanCardHeight: boardSettings.cleanCardHeight,
      numberPrefix,
      numberRangeStart: rangeStart,
      numberRangeEnd: rangeEnd,
      numberPadLength: rangePadLength,
      fontFamily: boardSettings.fontFamily,
      winnerLabelFontSize: boardSettings.winnerLabelFontSize,
      fontSize: boardSettings.fontSize,
      numberFontSize: boardSettings.numberFontSize,
      fontWeight: boardSettings.fontWeight,
      pageBackgroundMode: boardSettings.pageBackgroundMode,
      pageBackgroundColor: boardSettings.pageBackgroundColor,
      gridBackgroundMode: boardSettings.gridBackgroundMode,
      gridBackgroundColor: boardSettings.gridBackgroundColor,
      emptyCardBackgroundColor: boardSettings.emptyCardBackgroundColor,
      rollingCardBackgroundColor: boardSettings.rollingCardBackgroundColor,
      revealedCardBackgroundColor: boardSettings.revealedCardBackgroundColor,
      confirmedCardBackgroundColor: boardSettings.confirmedCardBackgroundColor,
      cardBorderColor: boardSettings.cardBorderColor,
      rollingBorderColor: boardSettings.rollingBorderColor,
      revealedBorderColor: boardSettings.revealedBorderColor,
      confirmedBorderColor: boardSettings.confirmedBorderColor,
      numberColor: boardSettings.numberColor,
      confirmedNumberColor: boardSettings.confirmedNumberColor,
      rollingNumberColor: boardSettings.rollingNumberColor,
      waitingTextColor: boardSettings.waitingTextColor,
    }),
    [boardSettings, numberPrefix, rangeEnd, rangePadLength, rangeStart],
  );

  const runInlineAction = useCallback(
    async (
      key: string,
      action: (formData: FormData) => Promise<InlineActionResult>,
      formData: FormData,
      options?: { refresh?: boolean },
    ) => {
      setSubmittingKey(key);
      setStatus({ type: "idle", message: "" });

      try {
        const result = await action(formData);
        setStatus({ type: result.ok ? "success" : "error", message: result.message });
        if (result.ok && options?.refresh !== false) {
          router.refresh();
        }
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        setStatus({ type: "error", message });
        return { ok: false, message };
      } finally {
        setSubmittingKey(null);
      }
    },
    [router],
  );

  function updateBoardSetting<K extends keyof PrizeBoardSettings>(key: K, value: PrizeBoardSettings[K]) {
    setBoardSettings((current) => ({ ...current, [key]: value }));
  }

  function formatNumber(value: string | number) {
    const rawValue = String(value).trim();
    const paddedValue = /^\d+$/.test(rawValue) ? rawValue.padStart(Math.max(0, rangePadLength), "0") : rawValue;
    return `${numberPrefix.trim()}${paddedValue}`;
  }

  async function handleDrawRandom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = Math.trunc(rangeStart);
    const end = Math.trunc(rangeEnd);
    const total = end - start + 1;

    if (!Number.isFinite(start) || !Number.isFinite(end) || total < 1) {
      setStatus({ type: "error", message: "Drawable range must have an end value greater than or equal to the start value." });
      return;
    }

    if (total > 1_000_000) {
      setStatus({ type: "error", message: "Drawable range is too large. Use a range up to 1,000,000 numbers." });
      return;
    }

    const existingNumbers = new Set(visibleWinners.map((winner) => winner.ticketNumber.toUpperCase()));
    const availableNumbers: string[] = [];
    for (let value = start; value <= end; value += 1) {
      const candidate = formatNumber(value).toUpperCase();
      if (!existingNumbers.has(candidate)) {
        availableNumbers.push(candidate);
      }
    }

    if (availableNumbers.length === 0) {
      setStatus({ type: "error", message: "All numbers in this drawable range have already been drawn." });
      return;
    }

    const ticketNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    const saveSettingsResult = await updateBoardSettingsAction(
      createFormData({
        eventId,
        prizeCategoryId: prize.id,
        drawSessionId: session.id,
        animationPreset,
        animationSpeed,
        ...boardFields(),
        ...boardSettingsFields(),
      }),
    );

    if (!saveSettingsResult.ok) {
      setStatus({ type: "error", message: saveSettingsResult.message });
      return;
    }

    await runInlineAction(
      "draw-random",
      addWinnerAction,
      createFormData({
        drawSessionId: session.id,
        ticketNumber,
      }),
    );
  }

  async function handleUpdateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = mergeFormData(
      createFormData({
        eventId,
        prizeCategoryId: prize.id,
        drawSessionId: session.id,
        animationPreset,
        animationSpeed,
        ...boardFields(),
        ...boardSettingsFields(),
      }),
      new FormData(event.currentTarget),
    );

    await runInlineAction("update-board", updateBoardSettingsAction, formData, { refresh: false });
  }

  async function handleResetDraw() {
    const confirmed = window.confirm("Clear every winning number and reset the display screen?");
    if (!confirmed) return;

    await runInlineAction(
      "reset-draw",
      resetDrawAction,
      createFormData({
        drawSessionId: session.id,
        ...boardFields(),
      }),
    );
  }

  async function handleDeleteWinner(winnerId: string) {
    const confirmed = window.confirm("Delete this winning number from the simple draw list?");
    if (!confirmed) return;
    await runInlineAction("delete-winner", deleteAction, createFormData({ winnerId, ...boardFields() }));
  }

  async function handleEditWinner(winnerId: string) {
    const result = await runInlineAction(
      `edit-${winnerId}`,
      editWinnerAction,
      createFormData({
        winnerId,
        ticketNumber: editingNumber,
      }),
    );
    if (result.ok) {
      setEditingWinnerId(null);
      setEditingNumber("");
    }
  }

  async function copyDisplayRoute() {
    const url = `${window.location.origin}${cleanDisplayRoute}`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus({ type: "success", message: "Display route copied." });
    } catch {
      window.prompt("Copy display route", url);
    }
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      {status.type !== "idle" ? (
        <div
          className={`rounded-[1.3rem] border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-rose-300/25 bg-rose-400/10 text-rose-50"
              : "border-emerald-300/25 bg-emerald-300/10 text-emerald-50"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <Surface className="min-w-0 space-y-5 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <SurfaceTitle>Simple Lucky Draw</SurfaceTitle>
            <SurfaceCopy>{eventName} | fast moving draw, separated from Pools, Prizes, Sessions, and Status setup.</SurfaceCopy>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={copyDisplayRoute}>
              <Copy className="size-4" />
              Copy Display
            </Button>
            <Button asChild variant="secondary">
              <a href={cleanDisplayRoute} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Open Display
              </a>
            </Button>
          </div>
        </div>
      </Surface>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 space-y-6">
          <Surface className="min-w-0 space-y-5 p-6">
            <div>
              <SurfaceTitle>Screen, Margins & Colours</SurfaceTitle>
              <SurfaceCopy>Fast display controls only. Apply changes immediately to the clean display page.</SurfaceCopy>
            </div>

            <form className="space-y-5" onSubmit={handleUpdateBoard}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Screen size</Label>
                  <Select value={screenPreset} onChange={(event) => setPreset(event.target.value)}>
                    {screenPresets.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Numbers on screen</Label>
                  <Input type="number" min={1} max={200} value={displayAmount} onChange={(event) => setDisplayAmount(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Design width</Label>
                  <Input
                    type="number"
                    min={320}
                    max={7680}
                    value={designWidth}
                    onChange={(event) => {
                      setScreenPreset("custom");
                      setDesignWidth(Number(event.target.value));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Design height</Label>
                  <Input
                    type="number"
                    min={240}
                    max={4320}
                    value={designHeight}
                    onChange={(event) => {
                      setScreenPreset("custom");
                      setDesignHeight(Number(event.target.value));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Columns</Label>
                  <Input type="number" min={1} max={200} value={gridColumns} onChange={(event) => setGridColumns(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Rows</Label>
                  <Input type="number" min={1} max={200} value={gridRows} onChange={(event) => setGridRows(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Grid margin / padding</Label>
                  <Input type="number" min={0} max={160} value={boardSettings.cleanGridPadding} onChange={(event) => updateBoardSetting("cleanGridPadding", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Gap between numbers</Label>
                  <Input type="number" min={0} max={96} value={boardSettings.cleanGridGap} onChange={(event) => updateBoardSetting("cleanGridGap", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Card padding</Label>
                  <Input type="number" min={0} max={120} value={boardSettings.cardPadding} onChange={(event) => updateBoardSetting("cardPadding", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Card width (0=auto)</Label>
                  <Input type="number" min={0} max={1200} value={boardSettings.cleanCardWidth} onChange={(event) => updateBoardSetting("cleanCardWidth", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Card height (0=auto)</Label>
                  <Input type="number" min={0} max={900} value={boardSettings.cleanCardHeight} onChange={(event) => updateBoardSetting("cleanCardHeight", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Font family</Label>
                  <Input value={boardSettings.fontFamily} placeholder="inherit, Inter, Arial" onChange={(event) => updateBoardSetting("fontFamily", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Number font size</Label>
                  <Input type="number" min={16} max={200} value={boardSettings.numberFontSize} onChange={(event) => updateBoardSetting("numberFontSize", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Waiting font size</Label>
                  <Input type="number" min={16} max={160} value={boardSettings.fontSize} onChange={(event) => updateBoardSetting("fontSize", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Font weight</Label>
                  <Input type="number" min={400} max={900} step={100} value={boardSettings.fontWeight} onChange={(event) => updateBoardSetting("fontWeight", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Small label size</Label>
                  <Input type="number" min={8} max={72} value={boardSettings.winnerLabelFontSize} onChange={(event) => updateBoardSetting("winnerLabelFontSize", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Animation</Label>
                  <Select value={animationPreset} onChange={(event) => setAnimationPreset(event.target.value as LuckyDrawAnimationPreset)}>
                    <option value="scramble">Scramble</option>
                    <option value="rolling">Rolling</option>
                    <option value="slot">Slot</option>
                    <option value="flip">Flip</option>
                    <option value="zoom">Zoom</option>
                    <option value="fade_pop">Fade + pop</option>
                    <option value="celebration_burst">Celebration burst</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Animation speed</Label>
                  <Input type="number" min={0.25} max={3} step={0.05} value={animationSpeed} onChange={(event) => setAnimationSpeed(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Page background</Label>
                  <Select value={boardSettings.pageBackgroundMode} onChange={(event) => updateBoardSetting("pageBackgroundMode", event.target.value as PrizeBoardSettings["pageBackgroundMode"])}>
                    <option value="transparent">Transparent</option>
                    <option value="color">Color</option>
                  </Select>
                </div>
                <ColorSettingField label="Page color" name="pageBackgroundColor" value={boardSettings.pageBackgroundColor} onCommit={(value) => updateBoardSetting("pageBackgroundColor", value)} />
                <div className="space-y-2">
                  <Label>Grid background</Label>
                  <Select value={boardSettings.gridBackgroundMode} onChange={(event) => updateBoardSetting("gridBackgroundMode", event.target.value as PrizeBoardSettings["gridBackgroundMode"])}>
                    <option value="transparent">Transparent</option>
                    <option value="color">Color</option>
                  </Select>
                </div>
                <ColorSettingField label="Grid color" name="gridBackgroundColor" value={boardSettings.gridBackgroundColor} onCommit={(value) => updateBoardSetting("gridBackgroundColor", value)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ColorSettingField label="Empty card" name="emptyCardBackgroundColor" value={boardSettings.emptyCardBackgroundColor} onCommit={(value) => updateBoardSetting("emptyCardBackgroundColor", value)} />
                <ColorSettingField label="Number card" name="revealedCardBackgroundColor" value={boardSettings.revealedCardBackgroundColor} onCommit={(value) => updateBoardSetting("revealedCardBackgroundColor", value)} />
                <ColorSettingField label="Card border" name="revealedBorderColor" value={boardSettings.revealedBorderColor} onCommit={(value) => updateBoardSetting("revealedBorderColor", value)} />
                <ColorSettingField label="Number text" name="numberColor" value={boardSettings.numberColor} onCommit={(value) => updateBoardSetting("numberColor", value)} />
                <ColorSettingField label="Rolling card" name="rollingCardBackgroundColor" value={boardSettings.rollingCardBackgroundColor} onCommit={(value) => updateBoardSetting("rollingCardBackgroundColor", value)} />
                <ColorSettingField label="Rolling border" name="rollingBorderColor" value={boardSettings.rollingBorderColor} onCommit={(value) => updateBoardSetting("rollingBorderColor", value)} />
                <ColorSettingField label="Rolling text" name="rollingNumberColor" value={boardSettings.rollingNumberColor} onCommit={(value) => updateBoardSetting("rollingNumberColor", value)} />
                <ColorSettingField label="Waiting text" name="waitingTextColor" value={boardSettings.waitingTextColor} onCommit={(value) => updateBoardSetting("waitingTextColor", value)} />
              </div>

              <Button type="submit" variant="secondary" className="w-full" disabled={submittingKey === "update-board"}>
                {submittingKey === "update-board" ? "Applying..." : "Apply Display Controls"}
              </Button>
            </form>
          </Surface>
        </div>

        <div className="min-w-0 space-y-6">
          <Surface className="min-w-0 space-y-5 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <SurfaceTitle>Random Draw</SurfaceTitle>
                <SurfaceCopy>Set the drawable number range, then pull one random winning number. Existing winners are excluded automatically.</SurfaceCopy>
              </div>
              <Badge variant="accent">{visibleWinners.length} drawn</Badge>
            </div>

            <form className="space-y-4" onSubmit={handleDrawRandom}>
              <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Number format prefix</Label>
                  <Input value={numberPrefix} onChange={(event) => setNumberPrefix(event.target.value)} placeholder="Example: A-, VIP, SB" />
                </div>
                <div className="space-y-2">
                  <Label>Zero padding</Label>
                  <Input type="number" min={0} max={12} value={rangePadLength} onChange={(event) => setRangePadLength(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Drawable range start</Label>
                  <Input type="number" min={0} value={rangeStart} onChange={(event) => setRangeStart(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Drawable range end</Label>
                  <Input type="number" min={0} value={rangeEnd} onChange={(event) => setRangeEnd(Number(event.target.value))} />
                </div>
                <p className="md:col-span-2 text-xs text-slate-500">
                  Range preview: {formatNumber(rangeStart)} to {formatNumber(rangeEnd)}. These are drawable candidates, not pre-added winners.
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submittingKey === "draw-random"}>
                <Plus className="size-5" />
                {submittingKey === "draw-random" ? "Drawing..." : "Draw Random Winning Number"}
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
              <Button type="button" variant="danger" disabled={visibleWinners.length === 0 || submittingKey === "reset-draw"} onClick={() => void handleResetDraw()}>
                <RotateCcw className="size-4" />
                {submittingKey === "reset-draw" ? "Resetting..." : "Reset Draw Screen"}
              </Button>
            </div>
          </Surface>

          <Surface className="min-w-0 space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SurfaceTitle>Winning Numbers</SurfaceTitle>
                <SurfaceCopy>Newest numbers appear first. Edits sync back to the display.</SurfaceCopy>
              </div>
            </div>

            {visibleWinners.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500">
                No winning numbers yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleWinners.map((winner) => {
                  const isEditing = editingWinnerId === winner.id;
                  return (
                    <div key={winner.id} className="min-w-0 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs uppercase tracking-[0.22em] text-slate-500">#{winner.revealOrder}</span>
                          </div>
                          {isEditing ? (
                            <Input className="mt-2" value={editingNumber} onChange={(event) => setEditingNumber(event.target.value)} autoFocus />
                          ) : (
                            <p className="mt-2 break-words text-2xl font-semibold tracking-[0.12em] text-slate-50">{winner.ticketNumber}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button type="button" variant="secondary" size="sm" disabled={!editingNumber.trim() || submittingKey === `edit-${winner.id}`} onClick={() => void handleEditWinner(winner.id)}>
                                <Save className="size-4" />
                                Save
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingWinnerId(null); setEditingNumber(""); }}>
                                <X className="size-4" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingWinnerId(winner.id); setEditingNumber(winner.ticketNumber); }}>
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                          )}
                          <Button type="button" variant="danger" size="sm" disabled={submittingKey === "delete-winner"} onClick={() => void handleDeleteWinner(winner.id)}>
                            <Trash2 className="size-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
