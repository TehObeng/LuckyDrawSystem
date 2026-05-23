"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Pause, Play, RefreshCw, RotateCcw, StepForward, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
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
  prizes: SimplePrize[];
  sessions: SimpleSession[];
  initialDesignWidth: number;
  initialDesignHeight: number;
  createSessionAction: (formData: FormData) => Promise<void>;
  rollAction: (formData: FormData) => Promise<InlineActionResult>;
  updateBoardSettingsAction: (formData: FormData) => Promise<InlineActionResult>;
  revealNextAction: (formData: FormData) => Promise<InlineActionResult>;
  resetDrawAction: (formData: FormData) => Promise<InlineActionResult>;
  validateAction: (formData: FormData) => Promise<InlineActionResult>;
  deleteAction: (formData: FormData) => Promise<InlineActionResult>;
  invalidateAction: (formData: FormData) => Promise<InlineActionResult>;
  redrawAction: (formData: FormData) => Promise<InlineActionResult>;
  cancelPendingAction: (formData: FormData) => Promise<InlineActionResult>;
}

const screenPresets = [
  { value: "1920x1080", label: "1920 x 1080", width: 1920, height: 1080 },
  { value: "1080x1920", label: "1080 x 1920", width: 1080, height: 1920 },
  { value: "custom", label: "Custom", width: 0, height: 0 },
] as const;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function statusVariant(status: WinnerStatus) {
  if (status === "confirmed") {
    return "success" as const;
  }

  if (status === "draft") {
    return "warning" as const;
  }

  if (status === "revealed") {
    return "accent" as const;
  }

  return "neutral" as const;
}

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
  prizes,
  sessions,
  initialDesignWidth,
  initialDesignHeight,
  createSessionAction,
  rollAction,
  updateBoardSettingsAction,
  revealNextAction,
  resetDrawAction,
  validateAction,
  deleteAction,
  invalidateAction,
  redrawAction,
  cancelPendingAction,
}: SimpleLuckyDrawWorkspaceProps) {
  const router = useRouter();
  const [selectedPrizeId, setSelectedPrizeId] = useState(prizes[0]?.id ?? "");
  const selectedPrizeSessions = useMemo(
    () => sessions.filter((session) => session.prizeCategoryId === selectedPrizeId),
    [selectedPrizeId, sessions],
  );
  const [selectedSessionId, setSelectedSessionId] = useState(selectedPrizeSessions[0]?.id ?? sessions[0]?.id ?? "");
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId),
    [selectedSessionId, sessions],
  );
  const selectedPrize = useMemo(() => prizes.find((prize) => prize.id === selectedPrizeId), [prizes, selectedPrizeId]);
  const [screenPreset, setScreenPreset] = useState(() => {
    if (initialDesignWidth === 1080 && initialDesignHeight === 1920) {
      return "1080x1920";
    }

    if (initialDesignWidth === 1920 && initialDesignHeight === 1080) {
      return "1920x1080";
    }

    return "custom";
  });
  const [designWidth, setDesignWidth] = useState(initialDesignWidth);
  const [designHeight, setDesignHeight] = useState(initialDesignHeight);
  const [displayAmount, setDisplayAmount] = useState(selectedSession?.gridItemCount ?? 12);
  const initialBoardShape = calculateBoardShape(selectedSession?.gridItemCount ?? 12, initialDesignWidth, initialDesignHeight);
  const [gridColumns, setGridColumns] = useState(selectedSession?.gridCols ?? initialBoardShape.columns);
  const [gridRows, setGridRows] = useState(selectedSession?.gridRows ?? initialBoardShape.rows);
  const [drawAmount, setDrawAmount] = useState(5);
  const [revealIntervalMs, setRevealIntervalMs] = useState(900);
  const [animationPreset, setAnimationPreset] = useState<LuckyDrawAnimationPreset>(selectedPrize?.animationPreset ?? "fade_pop");
  const [animationSpeed, setAnimationSpeed] = useState(selectedPrize?.animationSpeed ?? 1);
  const [boardSettings, setBoardSettings] = useState<PrizeBoardSettings>(selectedPrize?.boardSettings ?? prizes[0]?.boardSettings ?? defaultPrizeBoardSettings);
  const [sessionName, setSessionName] = useState("");
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const autoPausedRef = useRef(false);

  const pendingDraftCount = selectedSession?.winners.filter((winner) => winner.status === "draft").length ?? 0;
  const visibleWinners = selectedSession?.winners ?? [];
  const cleanDisplayRoute = `/display/lucky-draw-clean/${eventSlug}`;
  const selectedSessionGridItemCount = selectedSession?.gridItemCount;
  const selectedSessionGridRows = selectedSession?.gridRows;
  const selectedSessionGridCols = selectedSession?.gridCols;
  const selectedSessionKey = selectedSession?.id;

  useEffect(() => {
    const nextSession = selectedPrizeSessions[0] ?? sessions.find((session) => session.prizeCategoryId === selectedPrizeId);
    setSelectedSessionId((current) => {
      if (selectedPrizeSessions.some((session) => session.id === current)) {
        return current;
      }

      return nextSession?.id ?? "";
    });
  }, [selectedPrizeId, selectedPrizeSessions, sessions]);

  useEffect(() => {
    if (selectedSessionGridItemCount) {
      setDisplayAmount(selectedSessionGridItemCount);
      const nextShape = calculateBoardShape(selectedSessionGridItemCount, designWidth, designHeight);
      setGridColumns(selectedSessionGridCols ?? nextShape.columns);
      setGridRows(selectedSessionGridRows ?? nextShape.rows);
    }
  }, [selectedSessionGridCols, selectedSessionGridItemCount, selectedSessionGridRows, selectedSessionKey]);

  useEffect(() => {
    if (selectedPrize) {
      setAnimationPreset(selectedPrize.animationPreset);
      setAnimationSpeed(selectedPrize.animationSpeed);
      setBoardSettings(selectedPrize.boardSettings);
    }
  }, [selectedPrize]);

  const setPreset = useCallback((value: string) => {
    setScreenPreset(value);
    const preset = screenPresets.find((item) => item.value === value);
    if (preset && preset.value !== "custom") {
      setDesignWidth(preset.width);
      setDesignHeight(preset.height);
    }
  }, []);

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
    [boardSettings],
  );

  const runInlineAction = useCallback(
    async (
      key: string,
      action: (formData: FormData) => Promise<InlineActionResult>,
      formData: FormData,
      options?: {
        refresh?: boolean;
      },
    ) => {
      setSubmittingKey(key);
      setStatus({ type: "idle", message: "" });

      try {
        const result = await action(formData);
        setStatus({
          type: result.ok ? "success" : "error",
          message: result.message,
        });

        if (result.ok && options?.refresh !== false) {
          router.refresh();
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        setStatus({
          type: "error",
          message,
        });

        return {
          ok: false,
          message,
        };
      } finally {
        setSubmittingKey(null);
      }
    },
    [router],
  );

  async function handleRoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSession || !selectedPrize) {
      return;
    }

    await runInlineAction(
      "roll",
      rollAction,
      createFormData({
        eventId,
        prizeCategoryId: selectedPrize.id,
        drawSessionId: selectedSession.id,
        drawAmount,
        ...boardFields(),
        displayAmount: Math.max(displayAmount, drawAmount),
      }),
    );
  }

  async function handleUpdateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSession || !selectedPrize) {
      return;
    }

    const formData = mergeFormData(
      createFormData({
        eventId,
        prizeCategoryId: selectedPrize.id,
        drawSessionId: selectedSession.id,
        animationPreset,
        animationSpeed,
        ...boardFields(),
        ...boardSettingsFields(),
      }),
      new FormData(event.currentTarget),
    );

    await runInlineAction(
      "update-board",
      updateBoardSettingsAction,
      formData,
      { refresh: false },
    );
  }

  function updateBoardSetting<K extends keyof PrizeBoardSettings>(key: K, value: PrizeBoardSettings[K]) {
    setBoardSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleRevealNext() {
    if (!selectedSession) {
      return;
    }

    await runInlineAction(
      "reveal-next",
      revealNextAction,
      createFormData({
        drawSessionId: selectedSession.id,
      }),
    );
  }

  async function handleAutoReveal() {
    if (!selectedSession || pendingDraftCount === 0 || autoRunning) {
      return;
    }

    autoPausedRef.current = false;
    setAutoRunning(true);
    setSubmittingKey("auto-reveal");

    for (let index = 0; index < pendingDraftCount; index += 1) {
      if (autoPausedRef.current) {
        break;
      }

      const result = await revealNextAction(
        createFormData({
          drawSessionId: selectedSession.id,
        }),
      );
      setStatus({
        type: result.ok ? "success" : "error",
        message: result.message,
      });

      if (!result.ok) {
        break;
      }

      await wait(revealIntervalMs);
    }

    setAutoRunning(false);
    setSubmittingKey(null);
    router.refresh();
  }

  async function handleCancelPending() {
    if (!selectedSession) {
      return;
    }

    await runInlineAction(
      "cancel-pending",
      cancelPendingAction,
      createFormData({
        drawSessionId: selectedSession.id,
      }),
    );
  }

  async function handleResetDraw() {
    if (!selectedSession) {
      return;
    }

    const confirmed = window.confirm("Clear all numbers from this draw session and reset the display board?");
    if (!confirmed) {
      return;
    }

    await runInlineAction(
      "reset-draw",
      resetDrawAction,
      createFormData({
        drawSessionId: selectedSession.id,
        ...boardFields(),
      }),
    );
  }

  async function handleWinnerAction(
    key: string,
    action: (formData: FormData) => Promise<InlineActionResult>,
    winnerId: string,
  ) {
    await runInlineAction(
      key,
      action,
      createFormData({
        winnerId,
        ...boardFields(),
      }),
    );
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
            <SurfaceCopy>{eventName} | digital random batch draw with clean main-screen cards.</SurfaceCopy>
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

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Prize</Label>
            <Select value={selectedPrizeId} onChange={(event) => setSelectedPrizeId(event.target.value)}>
              {prizes.map((prize) => (
                <option key={prize.id} value={prize.id}>
                  {prize.name} ({prize.quantity})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Session</Label>
            <Select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
              {selectedPrizeSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.actualWinnerCount}/{session.plannedWinnerCount})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex h-11 items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200">
              <span>{selectedSession?.status ?? "No session"}</span>
              <Badge variant={pendingDraftCount > 0 ? "warning" : "success"}>{pendingDraftCount} rolling</Badge>
            </div>
          </div>
        </div>
      </Surface>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-6">
          <Surface className="min-w-0 space-y-5 p-6">
            <SurfaceTitle>Screen And Draw</SurfaceTitle>
            <form className="space-y-5" onSubmit={handleRoll}>
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
                  <Label>Reveal interval</Label>
                  <Input
                    type="number"
                    min={250}
                    max={5000}
                    step={50}
                    value={revealIntervalMs}
                    onChange={(event) => setRevealIntervalMs(Number(event.target.value))}
                  />
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
                  <Label>Display amount</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={displayAmount}
                    onChange={(event) => setDisplayAmount(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cards per row</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={gridColumns}
                    onChange={(event) => setGridColumns(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cards per column</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={gridRows}
                    onChange={(event) => setGridRows(Number(event.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Draw amount</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={drawAmount}
                    onChange={(event) => setDrawAmount(Number(event.target.value))}
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={!selectedSession || submittingKey === "roll"}>
                <Play className="size-5" />
                {submittingKey === "roll" ? "Rolling..." : "Roll"}
              </Button>
            </form>

            <form className="space-y-5 border-t border-white/10 pt-5" onSubmit={handleUpdateBoard}>
              <div>
                <SurfaceTitle className="text-lg">Live Display Settings</SurfaceTitle>
                <SurfaceCopy>Apply changes to the clean display page without refreshing the display browser.</SurfaceCopy>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Grid amount</Label>
                  <Input type="number" min={1} max={120} value={displayAmount} onChange={(event) => setDisplayAmount(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Cards per row</Label>
                  <Input type="number" min={1} max={120} value={gridColumns} onChange={(event) => setGridColumns(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Cards per column</Label>
                  <Input type="number" min={1} max={120} value={gridRows} onChange={(event) => setGridRows(Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Grid gap</Label>
                  <Input type="number" min={0} max={96} value={boardSettings.cleanGridGap} onChange={(event) => updateBoardSetting("cleanGridGap", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Grid padding</Label>
                  <Input type="number" min={0} max={160} value={boardSettings.cleanGridPadding} onChange={(event) => updateBoardSetting("cleanGridPadding", Number(event.target.value))} />
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
                  <Input type="number" min={0.25} max={3} step={0.1} value={animationSpeed} onChange={(event) => setAnimationSpeed(Number(event.target.value))} />
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
                <ColorSettingField label="Rolling card" name="rollingCardBackgroundColor" value={boardSettings.rollingCardBackgroundColor} onCommit={(value) => updateBoardSetting("rollingCardBackgroundColor", value)} />
                <ColorSettingField label="Revealed card" name="revealedCardBackgroundColor" value={boardSettings.revealedCardBackgroundColor} onCommit={(value) => updateBoardSetting("revealedCardBackgroundColor", value)} />
                <ColorSettingField label="Confirmed card" name="confirmedCardBackgroundColor" value={boardSettings.confirmedCardBackgroundColor} onCommit={(value) => updateBoardSetting("confirmedCardBackgroundColor", value)} />
                <ColorSettingField label="Default border" name="cardBorderColor" value={boardSettings.cardBorderColor} onCommit={(value) => updateBoardSetting("cardBorderColor", value)} />
                <ColorSettingField label="Rolling border" name="rollingBorderColor" value={boardSettings.rollingBorderColor} onCommit={(value) => updateBoardSetting("rollingBorderColor", value)} />
                <ColorSettingField label="Revealed border" name="revealedBorderColor" value={boardSettings.revealedBorderColor} onCommit={(value) => updateBoardSetting("revealedBorderColor", value)} />
                <ColorSettingField label="Confirmed border" name="confirmedBorderColor" value={boardSettings.confirmedBorderColor} onCommit={(value) => updateBoardSetting("confirmedBorderColor", value)} />
                <ColorSettingField label="Number" name="numberColor" value={boardSettings.numberColor} onCommit={(value) => updateBoardSetting("numberColor", value)} />
                <ColorSettingField label="Confirmed number" name="confirmedNumberColor" value={boardSettings.confirmedNumberColor} onCommit={(value) => updateBoardSetting("confirmedNumberColor", value)} />
                <ColorSettingField label="Rolling number" name="rollingNumberColor" value={boardSettings.rollingNumberColor} onCommit={(value) => updateBoardSetting("rollingNumberColor", value)} />
                <ColorSettingField label="Waiting text" name="waitingTextColor" value={boardSettings.waitingTextColor} onCommit={(value) => updateBoardSetting("waitingTextColor", value)} />
              </div>

              <Button type="submit" variant="secondary" className="w-full" disabled={!selectedSession || submittingKey === "update-board"}>
                {submittingKey === "update-board" ? "Applying..." : "Apply Live Display Settings"}
              </Button>
            </form>
          </Surface>

          <Surface className="min-w-0 space-y-5 p-6">
            <SurfaceTitle>Create Session</SurfaceTitle>
            <form action={createSessionAction} className="space-y-4">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="prizeCategoryId" value={selectedPrizeId} />
              <input type="hidden" name="displayAmount" value={displayAmount} />
              <input type="hidden" name="gridRows" value={gridRows} />
              <input type="hidden" name="gridCols" value={gridColumns} />
              <div className="space-y-2">
                <Label>Session name</Label>
                <Input name="name" value={sessionName} onChange={(event) => setSessionName(event.target.value)} placeholder="Session A" required />
              </div>
              <div className="space-y-2">
                <Label>Planned winners</Label>
                <Input name="plannedWinnerCount" type="number" min={1} defaultValue={drawAmount} />
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={!selectedPrizeId}>
                Add Session
              </Button>
            </form>
          </Surface>
        </div>

        <div className="min-w-0 space-y-6">
          <Surface className="min-w-0 space-y-5 p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <SurfaceTitle>Reveal Control</SurfaceTitle>
                <SurfaceCopy>Cards roll together. Reveal one at a time or let the page reveal the pending cards automatically.</SurfaceCopy>
              </div>
              <Badge variant={pendingDraftCount > 0 ? "warning" : "success"}>{pendingDraftCount} pending</Badge>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-5">
              <Button type="button" variant="secondary" disabled={pendingDraftCount === 0 || submittingKey === "reveal-next"} onClick={handleRevealNext}>
                <StepForward className="size-4" />
                Reveal Next
              </Button>
              <Button type="button" variant="secondary" disabled={pendingDraftCount === 0 || autoRunning} onClick={() => void handleAutoReveal()}>
                <Play className="size-4" />
                Auto Reveal All
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!autoRunning}
                onClick={() => {
                  autoPausedRef.current = true;
                  setAutoRunning(false);
                }}
              >
                <Pause className="size-4" />
                Pause
              </Button>
              <Button type="button" variant="danger" disabled={pendingDraftCount === 0 || submittingKey === "cancel-pending"} onClick={handleCancelPending}>
                <X className="size-4" />
                Cancel Pending
              </Button>
              <Button type="button" variant="danger" disabled={!selectedSession || visibleWinners.length === 0 || submittingKey === "reset-draw"} onClick={() => void handleResetDraw()}>
                <RotateCcw className="size-4" />
                {submittingKey === "reset-draw" ? "Resetting..." : "Reset Draw"}
              </Button>
            </div>
          </Surface>

          <Surface className="min-w-0 space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SurfaceTitle>Winner Operations</SurfaceTitle>
                <SurfaceCopy>Validate, redraw, or soft-delete revealed and queued winners.</SurfaceCopy>
              </div>
              <Badge variant="accent">{visibleWinners.length} records</Badge>
            </div>

            {visibleWinners.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-slate-500">
                No winners in this session yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleWinners.map((winner) => (
                  <div key={winner.id} className="min-w-0 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                    <div className="grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] 2xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariant(winner.status)}>{winner.status}</Badge>
                          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">#{winner.revealOrder}</span>
                        </div>
                        <p className="mt-2 break-words text-2xl font-semibold tracking-[0.12em] text-slate-50">{winner.ticketNumber}</p>
                      </div>
                      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={winner.status !== "revealed"}
                          onClick={() => void handleWinnerAction(`validate-${winner.id}`, validateAction, winner.id)}
                        >
                          <Check className="size-4" />
                          Validate
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={winner.status === "deleted" || winner.status === "redrawn" || winner.status === "invalid"}
                          onClick={() => void handleWinnerAction(`invalidate-${winner.id}`, invalidateAction, winner.id)}
                        >
                          <X className="size-4" />
                          Invalidate
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={winner.status === "deleted" || winner.status === "redrawn"}
                          onClick={() => void handleWinnerAction(`redraw-${winner.id}`, redrawAction, winner.id)}
                        >
                          <RefreshCw className="size-4" />
                          Redraw
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={winner.status === "deleted"}
                          onClick={() => void handleWinnerAction(`delete-${winner.id}`, deleteAction, winner.id)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
