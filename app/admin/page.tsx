"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ControlMode = "lucky_draw" | "auction";

export default function AdminPage() {
  const [mode, setMode] = useState<ControlMode>("lucky_draw");
  const [eventId, setEventId] = useState("");
  const [prizeCategoryId, setPrizeCategoryId] = useState("");
  const [drawSessionId, setDrawSessionId] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [lotId, setLotId] = useState("");
  const [bid, setBid] = useState("");
  const [status, setStatus] = useState("Idle");

  const canReveal = useMemo(() => Boolean(eventId && prizeCategoryId && drawSessionId && ticketNumber), [eventId, prizeCategoryId, drawSessionId, ticketNumber]);
  const canBid = useMemo(() => Boolean(eventId && lotId && bid), [eventId, lotId, bid]);

  const reveal = useCallback(async () => {
    if (!canReveal) return;
    setStatus("Publishing reveal...");
    const response = await fetch("/api/lucky-draw/reveal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, prizeCategoryId, drawSessionId, ticketNumber }),
    });

    if (!response.ok) {
      setStatus("Reveal failed");
      return;
    }

    setTicketNumber("");
    setStatus("Winner revealed");
  }, [canReveal, drawSessionId, eventId, prizeCategoryId, ticketNumber]);

  const submitBid = useCallback(async () => {
    if (!canBid) return;
    setStatus("Publishing bid...");
    const response = await fetch("/api/auction/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, lotId, amount: Number(bid) }),
    });

    if (!response.ok) {
      setStatus("Bid failed");
      return;
    }

    setBid("");
    setStatus("Bid broadcasted");
  }, [bid, canBid, eventId, lotId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (mode === "lucky_draw") {
        if (event.key === "Enter") {
          event.preventDefault();
          void reveal();
        }
      } else {
        if (event.key === "Enter") {
          event.preventDefault();
          void submitBid();
        }
        if (key === "s") setStatus("Sold action can be wired here");
        if (key === "p") setStatus("Passed action can be wired here");
      }

      if ((event.metaKey || event.ctrlKey) && key === "z") {
        setStatus("Undo action can be wired here");
      }

      if (event.key === "Escape") {
        setTicketNumber("");
        setBid("");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, reveal, submitBid]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-8">
      <header className="card">
        <h1 className="text-3xl font-semibold">Live Event Operator Dashboard</h1>
        <p className="text-sm text-slate-400">Keyboard-first control panel for stage operations and real-time output sync.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <label className="card">
          <span className="mb-2 block text-sm text-slate-400">Control mode</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as ControlMode)} className="w-full rounded-lg bg-slate-800 p-2">
            <option value="lucky_draw">Lucky Draw</option>
            <option value="auction">Auction</option>
          </select>
        </label>
        <label className="card">
          <span className="mb-2 block text-sm text-slate-400">Event ID</span>
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full rounded-lg bg-slate-800 p-2" placeholder="cuid" />
        </label>
        <div className="card text-sm text-cyan-300">Status: {status}</div>
      </section>

      {mode === "lucky_draw" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <label className="card"><span>Prize Category ID</span><input value={prizeCategoryId} onChange={(e) => setPrizeCategoryId(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-800 p-2" /></label>
          <label className="card"><span>Draw Session ID</span><input value={drawSessionId} onChange={(e) => setDrawSessionId(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-800 p-2" /></label>
          <label className="card md:col-span-2"><span>Winning Number (manual stage-driven)</span><input value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-800 p-2 text-2xl font-semibold" /></label>
          <button onClick={() => void reveal()} className="rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={!canReveal}>Reveal Winner (Enter)</button>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <label className="card"><span>Auction Lot ID</span><input value={lotId} onChange={(e) => setLotId(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-800 p-2" /></label>
          <label className="card"><span>New Bid Amount</span><input value={bid} onChange={(e) => setBid(e.target.value)} className="mt-2 w-full rounded-lg bg-slate-800 p-2 text-2xl font-semibold" inputMode="numeric" /></label>
          <button onClick={() => void submitBid()} className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50" disabled={!canBid}>Confirm Bid (Enter)</button>
        </section>
      )}
    </main>
  );
}
