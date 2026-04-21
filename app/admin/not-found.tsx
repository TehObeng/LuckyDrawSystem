import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="panel-strong space-y-4 p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Admin route not found</p>
      <h1 className="text-3xl font-semibold text-slate-50">That admin page does not exist.</h1>
      <p className="text-slate-400">Check the route, selected event, or go back to the overview workspace.</p>
      <Button asChild>
        <Link href="/admin">Back to Overview</Link>
      </Button>
    </div>
  );
}
