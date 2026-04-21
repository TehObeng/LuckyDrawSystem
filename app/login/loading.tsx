export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="panel-strong max-w-xl space-y-3 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Loading sign-in</p>
        <h1 className="text-3xl font-semibold text-slate-50">Preparing operator access</h1>
        <p className="text-slate-400">Checking auth configuration and preview access fallback.</p>
      </div>
    </main>
  );
}
