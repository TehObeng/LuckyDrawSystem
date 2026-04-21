import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Live Event Ops Platform",
  description: "Production-ready modular live event presentation system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "border border-white/10 bg-slate-950/95 text-slate-50",
              title: "font-medium",
              description: "text-slate-300",
            },
          }}
        />
      </body>
    </html>
  );
}
