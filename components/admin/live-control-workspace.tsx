"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import type { EventSettings } from "@/modules/shared/types/contracts";

interface PrizeSessionOption {
  id: string;
  name: string;
  prizeCategoryId: string;
  prizeName: string;
  revealMode: "manual" | "digital_random";
}

interface AuctionLotOption {
  id: string;
  title: string;
  lotNumber: string;
  status: string;
}

interface DisplayStateSummary {
  moduleType: "lucky_draw" | "auction" | "master";
  scene: string;
  screenKey: string;
  displayMode: "fullscreen" | "overlay";
  revision: number;
  syncedAt: string;
}

interface LiveActionResult {
  ok: boolean;
  message: string;
}

interface LiveControlWorkspaceProps {
  eventId: string;
  eventSlug: string;
  eventSettings: EventSettings;
  masterSource: "blank" | "lucky_draw" | "auction";
  masterDisplayMode: "fullscreen" | "overlay";
  displayStates: DisplayStateSummary[];
  luckySessions: PrizeSessionOption[];
  auctionLots: AuctionLotOption[];
  revealAction: (formData: FormData) => Promise<LiveActionResult>;
  randomAction: (formData: FormData) => Promise<LiveActionResult>;
  undoRevealAction: (formData: FormData) => Promise<LiveActionResult>;
  replayAction: (formData: FormData) => Promise<LiveActionResult>;
  clearLuckyDrawAction: (formData: FormData) => Promise<LiveActionResult>;
  cueAuctionLotAction: (formData: FormData) => Promise<LiveActionResult>;
  bidAction: (formData: FormData) => Promise<LiveActionResult>;
  undoBidAction: (formData: FormData) => Promise<LiveActionResult>;
  soldAction: (formData: FormData) => Promise<LiveActionResult>;
  passedAction: (formData: FormData) => Promise<LiveActionResult>;
  clearAuctionAction: (formData: FormData) => Promise<LiveActionResult>;
  updateMasterAction: (formData: FormData) => Promise<LiveActionResult>;
}

function formatSceneLabel(scene: string) {
  return scene.replace(/_/g, " ");
}

function routeFor(moduleType: "lucky_draw" | "auction" | "master", eventSlug: string) {
  if (moduleType === "lucky_draw") {
    return `/display/lucky-draw/${eventSlug}`;
  }

  if (moduleType === "auction") {
    return `/display/auction/${eventSlug}`;
  }

  return `/display/master/${eventSlug}`;
}

export function LiveControlWorkspace({
  eventId,
  eventSlug,
  eventSettings,
  masterSource,
  masterDisplayMode,
  displayStates,
  luckySessions,
  auctionLots,
  revealAction,
  randomAction,
  undoRevealAction,
  replayAction,
  clearLuckyDrawAction,
  cueAuctionLotAction,
  bidAction,
  undoBidAction,
  soldAction,
  passedAction,
  clearAuctionAction,
  updateMasterAction,
}: LiveControlWorkspaceProps) {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<"lucky_draw" | "auction">("lucky_draw");
  const [selectedSessionId, setSelectedSessionId] = useState(luckySessions[0]?.id ?? "");
  const [selectedLotId, setSelectedLotId] = useState(auctionLots[0]?.id ?? "");
  const [ticketNumber, setTicketNumber] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidderLabel, setBidderLabel] = useState("");
  const [winnerLabel, setWinnerLabel] = useState("");
  const [masterScene, setMasterScene] = useState<"blank" | "lucky_draw" | "auction">(masterSource);
  const [masterMode, setMasterMode] = useState<"fullscreen" | "overlay">(masterDisplayMode);
  const [masterNote, setMasterNote] = useState("");
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const revealFormRef = useRef<HTMLFormElement>(null);
  const randomFormRef = useRef<HTMLFormElement>(null);
  const undoRevealFormRef = useRef<HTMLFormElement>(null);
  const replayFormRef = useRef<HTMLFormElement>(null);
  const clearLuckyFormRef = useRef<HTMLFormElement>(null);
  const cueLotFormRef = useRef<HTMLFormElement>(null);
  const bidFormRef = useRef<HTMLFormElement>(null);
  const undoBidFormRef = useRef<HTMLFormElement>(null);
  const soldFormRef = useRef<HTMLFormElement>(null);
  const passedFormRef = useRef<HTMLFormElement>(null);
  const clearAuctionFormRef = useRef<HTMLFormElement>(null);
  const masterFormRef = useRef<HTMLFormElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);
  const bidAmountInputRef = useRef<HTMLInputElement>(null);

  const selectedSession = useMemo(() => luckySessions.find((session) => session.id === selectedSessionId), [luckySessions, selectedSessionId]);
  const selectedLot = useMemo(() => auctionLots.find((lot) => lot.id === selectedLotId), [auctionLots, selectedLotId]);
  const liveStateMap = useMemo(
    () => Object.fromEntries(displayStates.map((state) => [state.moduleType, state])),
    [displayStates],
  );
  const routeGroups = [
    { key: "lucky_draw" as const, label: "Lucky Draw", href: routeFor("lucky_draw", eventSlug) },
    { key: "lucky_draw_all" as const, label: "Lucky Draw Full Board", href: `/display/lucky-draw-all/${eventSlug}` },
    { key: "auction" as const, label: "Auction", href: routeFor("auction", eventSlug) },
    { key: "master" as const, label: "Master Overlay", href: routeFor("master", eventSlug) },
  ];

  useEffect(() => {
    if (!eventSettings.persistLiveSelections || typeof window === "undefined") {
      return;
    }

    const savedSessionId = window.localStorage.getItem(`live:${eventId}:session`);
    const savedLotId = window.localStorage.getItem(`live:${eventId}:lot`);

    if (savedSessionId && luckySessions.some((session) => session.id === savedSessionId)) {
      setSelectedSessionId(savedSessionId);
    }

    if (savedLotId && auctionLots.some((lot) => lot.id === savedLotId)) {
      setSelectedLotId(savedLotId);
    }
  }, [auctionLots, eventId, eventSettings.persistLiveSelections, luckySessions]);

  useEffect(() => {
    if (!eventSettings.persistLiveSelections || typeof window === "undefined") {
      return;
    }

    if (selectedSessionId) {
      window.localStorage.setItem(`live:${eventId}:session`, selectedSessionId);
    }
  }, [eventId, eventSettings.persistLiveSelections, selectedSessionId]);

  useEffect(() => {
    if (!eventSettings.persistLiveSelections || typeof window === "undefined") {
      return;
    }

    if (selectedLotId) {
      window.localStorage.setItem(`live:${eventId}:lot`, selectedLotId);
    }
  }, [eventId, eventSettings.persistLiveSelections, selectedLotId]);

  const requestSubmit = useCallback((form: HTMLFormElement | null, confirmationMessage?: string) => {
    if (!form) {
      return;
    }

    if (eventSettings.requireActionConfirmations && confirmationMessage && !window.confirm(confirmationMessage)) {
      return;
    }

    form.requestSubmit();
  }, [eventSettings.requireActionConfirmations]);

  const focusTarget = useCallback((target?: "ticket" | "bid") => {
    if (!target) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (target === "ticket") {
        ticketInputRef.current?.focus();
        return;
      }

      bidAmountInputRef.current?.focus();
    });
  }, []);

  const submitAction = useCallback(
    async (
      event: FormEvent<HTMLFormElement>,
      options: {
        key: string;
        action: (formData: FormData) => Promise<LiveActionResult>;
        focusAfter?: "ticket" | "bid";
        refreshPage?: boolean;
        onSuccess?: () => void;
      },
    ) => {
      event.preventDefault();
      setSubmittingKey(options.key);
      setStatus((current) => (current.type === "idle" ? current : { type: "idle", message: "" }));

      try {
        const result = await options.action(new FormData(event.currentTarget));

        setStatus({
          type: result.ok ? "success" : "error",
          message: result.message,
        });

        if (result.ok) {
          options.onSuccess?.();

          if (options.refreshPage) {
            router.refresh();
          }
        }
      } catch (error) {
        setStatus({
          type: "error",
          message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        });
      } finally {
        setSubmittingKey(null);
        focusTarget(options.focusAfter);
      }
    },
    [focusTarget, router],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.key === "Escape") {
        setTicketNumber("");
        setBidAmount("");
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (activeModule === "lucky_draw") {
          requestSubmit(undoRevealFormRef.current, "Undo the last lucky draw reveal?");
        } else {
          requestSubmit(undoBidFormRef.current, "Undo the last accepted auction bid?");
        }
        return;
      }

      if (activeModule === "lucky_draw") {
        if (event.key === "Enter" && ticketNumber.trim()) {
          event.preventDefault();
          requestSubmit(revealFormRef.current);
        }
      } else {
        const key = event.key.toLowerCase();
        if (event.key === "Enter" && bidAmount.trim()) {
          event.preventDefault();
          requestSubmit(bidFormRef.current);
        }
        if (key === "s") {
          event.preventDefault();
          requestSubmit(soldFormRef.current, "Mark this lot sold?");
        }
        if (key === "p") {
          event.preventDefault();
          requestSubmit(passedFormRef.current, "Mark this lot passed?");
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModule, bidAmount, requestSubmit, ticketNumber]);

  async function copyRoute(href: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`);
    } catch {
      window.prompt("Copy route", `${window.location.origin}${href}`);
    }
  }

  return (
    <div className="space-y-6">
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

      <Surface className="space-y-5 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <SurfaceTitle>Master Overlay</SurfaceTitle>
            <SurfaceCopy>Choose what the room sees on the shared master output. The master route mirrors whichever module you select here.</SurfaceCopy>
          </div>
          <div className="flex flex-wrap gap-3">
            {routeGroups.map((route) => (
              <div key={route.key} className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                <div className="font-medium text-slate-100">{route.label}</div>
                <div className="mt-1 text-slate-500">{route.href}</div>
                <div className="mt-3 flex gap-2">
                  <a href={route.href} target="_blank" rel="noreferrer" className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Open
                  </a>
                  {eventSettings.showRouteCopyButtons ? (
                    <button type="button" onClick={() => copyRoute(route.href)} className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Copy
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form
          ref={masterFormRef}
          className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_auto]"
          onSubmit={(event) =>
            void submitAction(event, {
              key: "master-update",
              action: updateMasterAction,
              refreshPage: true,
              onSuccess: () => setMasterNote(""),
            })
          }
        >
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-2">
            <Label htmlFor="masterSource">Master source</Label>
            <Select
              id="masterSource"
              name="source"
              value={masterScene}
              onChange={(event) => setMasterScene(event.target.value as "blank" | "lucky_draw" | "auction")}
            >
              <option value="blank">Blank</option>
              <option value="lucky_draw">Lucky Draw</option>
              <option value="auction">Auction</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="masterMode">Display mode</Label>
            <Select id="masterMode" name="displayMode" value={masterMode} onChange={(event) => setMasterMode(event.target.value as "fullscreen" | "overlay")}>
              <option value="overlay">Overlay</option>
              <option value="fullscreen">Fullscreen</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="masterNote">Operator note</Label>
            <Input id="masterNote" name="note" value={masterNote} onChange={(event) => setMasterNote(event.target.value)} placeholder="Optional MC or stage note" />
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={() => requestSubmit(masterFormRef.current, "Publish the selected master output now?")}>
              {submittingKey === "master-update" ? "Publishing..." : "Publish Master"}
            </Button>
          </div>
        </form>

        <div className="grid gap-4 md:grid-cols-3">
          {(["master", "lucky_draw", "auction"] as const).map((moduleType) => {
            const state = liveStateMap[moduleType];
            return (
              <div key={moduleType} className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{moduleType.replace("_", " ")}</p>
                <p className="mt-3 text-lg font-semibold capitalize text-slate-50">{state ? formatSceneLabel(state.scene) : "Not published"}</p>
                <p className="mt-1 text-sm text-slate-400">{state ? `${state.displayMode} • rev ${state.revision}` : "Awaiting first publish"}</p>
              </div>
            );
          })}
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Surface className="space-y-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SurfaceTitle>Lucky Draw Console</SurfaceTitle>
              <SurfaceCopy>Manual reveal is the default. Enter submits the winning ticket, Ctrl/Cmd+Z undoes, and Escape clears the entry field.</SurfaceCopy>
            </div>
            <Badge variant={activeModule === "lucky_draw" ? "success" : "neutral"}>Enter</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Session</Label>
              <Select
                value={selectedSessionId}
                onChange={(event) => {
                  setActiveModule("lucky_draw");
                  setSelectedSessionId(event.target.value);
                }}
              >
                {luckySessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.prizeName} • {session.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Selected prize</Label>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                {selectedSession ? `${selectedSession.prizeName} • ${selectedSession.name}` : "Create a session first"}
              </div>
            </div>
          </div>

          <form
            ref={revealFormRef}
            className="space-y-4"
            onSubmit={(event) =>
              void submitAction(event, {
                key: "reveal",
                action: revealAction,
                focusAfter: "ticket",
                onSuccess: () => setTicketNumber(""),
              })
            }
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="drawSessionId" value={selectedSessionId} />
            <input type="hidden" name="prizeCategoryId" value={selectedSession?.prizeCategoryId ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="ticketNumber">Winning ticket</Label>
              <Input
                ref={ticketInputRef}
                id="ticketNumber"
                name="ticketNumber"
                value={ticketNumber}
                onChange={(event) => {
                  setActiveModule("lucky_draw");
                  setTicketNumber(event.target.value);
                }}
                className="h-16 text-3xl font-semibold tracking-[0.3em]"
                placeholder="000123"
                inputMode="numeric"
              />
            </div>
            <Button type="button" size="lg" className="w-full" disabled={!selectedSessionId || !ticketNumber.trim()} onClick={() => requestSubmit(revealFormRef.current)}>
              {submittingKey === "reveal" ? "Revealing..." : "Reveal Winner"}
            </Button>
          </form>

          <form
            ref={randomFormRef}
            onSubmit={(event) =>
              void submitAction(event, {
                key: "random",
                action: randomAction,
                focusAfter: "ticket",
              })
            }
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="drawSessionId" value={selectedSessionId} />
            <input type="hidden" name="prizeCategoryId" value={selectedSession?.prizeCategoryId ?? ""} />
            <Button type="button" size="lg" variant="secondary" className="w-full" disabled={!selectedSessionId} onClick={() => requestSubmit(randomFormRef.current)}>
              {submittingKey === "random" ? "Running..." : "Digital Random"}
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-3">
            <form
              ref={undoRevealFormRef}
              onSubmit={(event) =>
                void submitAction(event, {
                  key: "undo-reveal",
                  action: undoRevealAction,
                  focusAfter: "ticket",
                })
              }
            >
              <input type="hidden" name="drawSessionId" value={selectedSessionId} />
              <Button type="button" variant="secondary" className="w-full" disabled={!selectedSessionId} onClick={() => requestSubmit(undoRevealFormRef.current, "Undo the last lucky draw reveal?")}>
                Undo Reveal
              </Button>
            </form>
            <form
              ref={replayFormRef}
              onSubmit={(event) =>
                void submitAction(event, {
                  key: "replay",
                  action: replayAction,
                  focusAfter: "ticket",
                })
              }
            >
              <input type="hidden" name="drawSessionId" value={selectedSessionId} />
              <Button type="button" variant="secondary" className="w-full" disabled={!selectedSessionId} onClick={() => requestSubmit(replayFormRef.current)}>
                Replay Animation
              </Button>
            </form>
            <form
              ref={clearLuckyFormRef}
              onSubmit={(event) =>
                void submitAction(event, {
                  key: "clear-lucky",
                  action: clearLuckyDrawAction,
                  focusAfter: "ticket",
                })
              }
            >
              <input type="hidden" name="eventId" value={eventId} />
              <Button type="button" variant="ghost" className="w-full" onClick={() => requestSubmit(clearLuckyFormRef.current, "Clear the public lucky draw screen?")}>
                Clear Screen
              </Button>
            </form>
          </div>

          <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/5 px-4 py-3 text-sm text-emerald-100/90">
            Hotkeys: Enter to reveal • Ctrl/Cmd+Z to undo • Escape to clear typed ticket
          </div>
        </Surface>

        <Surface className="space-y-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SurfaceTitle>Auction Console</SurfaceTitle>
              <SurfaceCopy>Enter confirms a bid. S marks sold, P marks passed, and Ctrl/Cmd+Z rolls back the last live bid.</SurfaceCopy>
            </div>
            <Badge variant={activeModule === "auction" ? "warning" : "neutral"}>S / P</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Lot</Label>
              <Select
                value={selectedLotId}
                onChange={(event) => {
                  setActiveModule("auction");
                  setSelectedLotId(event.target.value);
                }}
              >
                {auctionLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    Lot {lot.lotNumber} • {lot.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lot status</Label>
              <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                {selectedLot ? `${selectedLot.lotNumber} • ${selectedLot.status}` : "Create a lot first"}
              </div>
            </div>
          </div>

          <form
            ref={cueLotFormRef}
            onSubmit={(event) =>
              void submitAction(event, {
                key: "cue-lot",
                action: cueAuctionLotAction,
                refreshPage: true,
                focusAfter: "bid",
              })
            }
          >
            <input type="hidden" name="lotId" value={selectedLotId} />
            <Button type="button" variant="secondary" className="w-full" disabled={!selectedLotId} onClick={() => requestSubmit(cueLotFormRef.current)}>
              Cue Lot Intro
            </Button>
          </form>

          <form
            ref={bidFormRef}
            className="space-y-4"
            onSubmit={(event) =>
              void submitAction(event, {
                key: "bid",
                action: bidAction,
                focusAfter: "bid",
                onSuccess: () => setBidAmount(""),
              })
            }
          >
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="lotId" value={selectedLotId} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Bid amount</Label>
                <Input
                  ref={bidAmountInputRef}
                  id="amount"
                  name="amount"
                  value={bidAmount}
                  onChange={(event) => {
                    setActiveModule("auction");
                    setBidAmount(event.target.value);
                  }}
                  className="h-16 text-3xl font-semibold tracking-[0.2em]"
                  placeholder="15000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bidderLabel">Bidder label</Label>
                <Input
                  id="bidderLabel"
                  name="bidderLabel"
                  value={bidderLabel}
                  onChange={(event) => {
                    setActiveModule("auction");
                    setBidderLabel(event.target.value);
                  }}
                  placeholder="Paddle 12 / VIP table"
                />
              </div>
            </div>
            <Button type="button" size="lg" className="w-full" disabled={!selectedLotId || !bidAmount.trim()} onClick={() => requestSubmit(bidFormRef.current)}>
              {submittingKey === "bid" ? "Publishing..." : "Confirm Bid"}
            </Button>
          </form>

          <div className="grid gap-3 md:grid-cols-2">
            <form
              ref={undoBidFormRef}
              onSubmit={(event) =>
                void submitAction(event, {
                  key: "undo-bid",
                  action: undoBidAction,
                  refreshPage: true,
                  focusAfter: "bid",
                })
              }
            >
              <input type="hidden" name="lotId" value={selectedLotId} />
              <Button type="button" variant="secondary" className="w-full" disabled={!selectedLotId} onClick={() => requestSubmit(undoBidFormRef.current, "Undo the last accepted bid?")}>
                Undo Bid
              </Button>
            </form>
            <form
              ref={passedFormRef}
              onSubmit={(event) =>
                void submitAction(event, {
                  key: "passed",
                  action: passedAction,
                  refreshPage: true,
                  focusAfter: "bid",
                })
              }
            >
              <input type="hidden" name="lotId" value={selectedLotId} />
              <Button type="button" variant="ghost" className="w-full" disabled={!selectedLotId} onClick={() => requestSubmit(passedFormRef.current, "Mark this lot passed?")}>
                Mark Passed
              </Button>
            </form>
          </div>

          <form
            ref={soldFormRef}
            className="space-y-3"
            onSubmit={(event) =>
              void submitAction(event, {
                key: "sold",
                action: soldAction,
                refreshPage: true,
                focusAfter: "bid",
                onSuccess: () => {
                  setBidAmount("");
                  setWinnerLabel("");
                },
              })
            }
          >
            <input type="hidden" name="lotId" value={selectedLotId} />
            <div className="space-y-2">
              <Label htmlFor="winnerLabel">Winner label</Label>
              <Input id="winnerLabel" name="winnerLabel" value={winnerLabel} onChange={(event) => setWinnerLabel(event.target.value)} placeholder="Table 8 / Paddle 27" />
            </div>
            <Button type="button" size="lg" variant="primary" className="w-full bg-amber-300 text-slate-950 hover:bg-amber-200" disabled={!selectedLotId} onClick={() => requestSubmit(soldFormRef.current, "Mark this lot sold?")}>
              Mark Sold
            </Button>
          </form>

          <form
            ref={clearAuctionFormRef}
            onSubmit={(event) =>
              void submitAction(event, {
                key: "clear-auction",
                action: clearAuctionAction,
                refreshPage: true,
                focusAfter: "bid",
              })
            }
          >
            <input type="hidden" name="eventId" value={eventId} />
            <Button type="button" variant="ghost" className="w-full" onClick={() => requestSubmit(clearAuctionFormRef.current, "Clear the public auction screen?")}>
              Clear Auction Screen
            </Button>
          </form>

          <div className="rounded-3xl border border-amber-300/10 bg-amber-300/5 px-4 py-3 text-sm text-amber-100/90">
            Hotkeys: Enter to accept bid • S to mark sold • P to mark passed • Ctrl/Cmd+Z to undo
          </div>
        </Surface>
      </div>
    </div>
  );
}
