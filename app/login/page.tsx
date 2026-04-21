import { redirect } from "next/navigation";
import { KeyRound, MonitorPlay, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryNotice } from "@/components/ui/query-notice";
import { Surface, SurfaceCopy, SurfaceTitle } from "@/components/ui/surface";
import { getCurrentOperator } from "@/lib/auth/operator";
import { loginWithPasswordAction, previewAccessAction } from "@/app/login/actions";

export default async function LoginPage() {
  const operator = await getCurrentOperator();
  if (operator) {
    redirect("/admin");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0 grid-glow opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.18),transparent_46%)]" />

      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="panel-strong relative overflow-hidden px-8 py-10 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(52,211,153,0.08),transparent_35%,rgba(56,189,248,0.06))]" />
          <div className="relative space-y-10">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">Live Event Presentation Platform</p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-slate-50 md:text-6xl">
                Run the stage from one control surface. Keep every screen in sync.
              </h1>
              <p className="max-w-2xl text-base text-slate-300 md:text-lg">
                Offline-friendly operator workspace, presentation-safe public display routes, persistent local state, and recovery-ready logs for lucky draw and auction workflows.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Surface className="bg-white/[0.03]">
                <ShieldCheck className="mb-4 size-5 text-emerald-300" />
                <SurfaceTitle className="text-lg">Local Access</SurfaceTitle>
                <SurfaceCopy>Operator identity stays on this machine through a local session cookie.</SurfaceCopy>
              </Surface>
              <Surface className="bg-white/[0.03]">
                <MonitorPlay className="mb-4 size-5 text-sky-300" />
                <SurfaceTitle className="text-lg">Screen Routing</SurfaceTitle>
                <SurfaceCopy>Lucky draw and auction outputs stay clean for projector, LED wall, and OBS browser-source capture.</SurfaceCopy>
              </Surface>
              <Surface className="bg-white/[0.03]">
                <KeyRound className="mb-4 size-5 text-amber-300" />
                <SurfaceTitle className="text-lg">Keyboard First</SurfaceTitle>
                <SurfaceCopy>The live control workspace is built for fast operator hands, numpads, and low-friction corrections.</SurfaceCopy>
              </Surface>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <QueryNotice />
          <Surface className="space-y-5 p-7">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Local Login</p>
              <SurfaceTitle>Start an offline operator session</SurfaceTitle>
              <SurfaceCopy>Everything runs on this machine, so sign-in just creates a local operator session for the admin workspace.</SurfaceCopy>
            </div>
            <form action={loginWithPasswordAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Operator name</Label>
                <Input id="displayName" name="displayName" placeholder="Local Operator" defaultValue="Local Operator" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Operator email</Label>
                <Input id="email" name="email" type="email" placeholder="operator@local.dev" defaultValue="operator@local.dev" required />
              </div>
              <Button type="submit" className="w-full">
                Enter Workspace
              </Button>
            </form>
          </Surface>

          <Surface className="space-y-5 p-7">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Preview Access</p>
              <SurfaceTitle>Start a local operator session</SurfaceTitle>
              <SurfaceCopy>This quick-start path uses the same local cookie flow and is handy for resetting into a clean operator identity.</SurfaceCopy>
            </div>
            <form action={previewAccessAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="previewDisplayName">Operator name</Label>
                <Input id="previewDisplayName" name="displayName" defaultValue="Preview Operator" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previewEmail">Operator email</Label>
                <Input id="previewEmail" name="email" type="email" defaultValue="preview@local.dev" />
              </div>
              <Button type="submit" variant="secondary" className="w-full">
                Launch Preview Workspace
              </Button>
            </form>
          </Surface>
        </section>
      </div>
    </main>
  );
}
