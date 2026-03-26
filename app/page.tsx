import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-4xl font-semibold">Live Event Control Platform</h1>
      <p className="text-slate-300">Modular control center for Lucky Draw and Auction presentations.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link className="card hover:border-cyan-400" href="/admin">Admin Dashboard</Link>
        <Link className="card hover:border-cyan-400" href="/display/lucky-draw/demo-event">Lucky Draw Display</Link>
        <Link className="card hover:border-cyan-400" href="/display/auction/demo-event">Auction Display</Link>
      </div>
    </main>
  );
}
