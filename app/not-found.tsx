import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="panel-strong max-w-2xl space-y-5 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Not found</p>
        <h1 className="text-4xl font-semibold text-slate-50">That route does not exist.</h1>
        <p className="text-slate-400">The page may have moved, the event slug may be wrong, or the screen has not been created yet.</p>
        <div className="flex justify-center gap-3">
          <Button asChild>
            <Link href="/admin">Open Admin</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
