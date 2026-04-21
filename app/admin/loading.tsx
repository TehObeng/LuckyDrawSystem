export default function AdminLoading() {
  return (
    <div className="panel-strong space-y-3 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Loading admin tools</p>
      <h1 className="text-3xl font-semibold text-slate-50">Preparing operator workspace</h1>
      <p className="text-slate-400">Pulling the latest event snapshot, display states, and module data.</p>
    </div>
  );
}
