export default function DisplayLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-center">
      <div className="panel-strong max-w-2xl space-y-3 p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Loading display</p>
        <h1 className="text-4xl font-semibold text-slate-50">Preparing live output</h1>
        <p className="text-slate-400">Waiting for the latest published state from the event workspace.</p>
      </div>
    </main>
  );
}
