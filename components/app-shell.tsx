"use client";

import { useState } from "react";
import { HistorySheet } from "@/components/history-sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-center">
        <p className="text-sm font-medium tracking-tight">SeeFood</p>
      </header>
      <div className="flex flex-1 flex-col px-4 pt-16 pb-6">{children}</div>
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
