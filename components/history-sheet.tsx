"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PendingDots } from "@/components/pending-dots";
import { readScanIds, replaceScanIds } from "@/lib/scan-history";
import type { Scan } from "@/lib/types";
import { formatConfidence, formatFoodLabel, verdictHeadline } from "@/lib/verdict";

const CLOSE_MS = 280;

export function HistorySheet({ onClose }: { onClose: () => void }) {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, CLOSE_MS);
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const ids = readScanIds();
      if (ids.length === 0) {
        await Promise.resolve();
        if (!controller.signal.aborted) setScans([]);
        return;
      }

      try {
        const response = await fetch(`/api/history?ids=${encodeURIComponent(ids.join(","))}`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Could not load history.";
          throw new Error(message);
        }

        const records =
          payload &&
          typeof payload === "object" &&
          "scans" in payload &&
          Array.isArray(payload.scans)
            ? (payload.scans as Scan[])
            : [];
        const byId = new Map(records.map((scan) => [scan.id, scan]));
        const ordered = ids.flatMap((id) => {
          const scan = byId.get(id);
          return scan ? [scan] : [];
        });
        replaceScanIds(ordered.map((scan) => scan.id));
        if (!controller.signal.aborted) setScans(ordered);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Could not load history.");
          setScans([]);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  return (
    <div className="fixed inset-0 z-40">
      <button
        className="absolute inset-0 cursor-pointer bg-black/60 touch-manipulation"
        style={{
          animation: closing
            ? `seefood-fade-out ${CLOSE_MS}ms ease-in forwards`
            : "seefood-fade 200ms ease-out",
        }}
        aria-label="Close history"
        onClick={requestClose}
      />
      <section
        className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col overflow-hidden border-r border-white/10 bg-background shadow-2xl"
        style={{
          animation: closing
            ? `seefood-drawer-out ${CLOSE_MS}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`
            : "seefood-drawer 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h2 className="text-sm font-medium">History</h2>
          <button
            type="button"
            aria-label="Close"
            className="flex size-8 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-foreground select-none hover:bg-white/10"
            onClick={requestClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {scans === null ? <PendingDots label="Loading history" className="text-muted-foreground" /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {scans?.length === 0 && !error ? (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          ) : null}
          <div className="flex flex-col gap-3">
            {scans?.map((scan) => (
              <article
                key={scan.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors duration-200 hover:bg-white/10"
              >
                {/* Stored scans are public UUID URLs on the Supabase bucket. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={scan.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-1 p-3">
                  <p className="text-sm font-medium">{verdictHeadline(scan.verdict)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFoodLabel(scan.label)} · {formatConfidence(scan.confidence)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}
