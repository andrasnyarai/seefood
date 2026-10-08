"use client";

import { useEffect, useRef, useState } from "react";
import { Images, X } from "lucide-react";
import { PendingDots } from "@/components/pending-dots";
import { cn } from "@/lib/utils";
import { readScanIds, replaceScanIds } from "@/lib/scan-history";
import type { Scan } from "@/lib/types";
import { formatConfidence, formatFoodLabel, verdictHeadline } from "@/lib/verdict";

const CLOSE_MS = 280;
const FADE_MS = 120;

export function HistorySheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [scans, setScans] = useState<Scan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const visible = open || closing;
  const shown = open && !closing;

  function requestClose() {
    if (!open || closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => {
      closingRef.current = false;
      setClosing(false);
      onOpenChange(false);
    }, CLOSE_MS);
  }

  function requestOpen() {
    if (open || closingRef.current) return;
    onOpenChange(true);
  }

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();

    async function load() {
      setScans(null);
      setError(null);
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
  }, [open]);

  return (
    <>
      {visible ? (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-pointer bg-black/60 touch-manipulation"
          style={{
            animation: closing
              ? `seefood-fade-out ${FADE_MS}ms ease-in forwards`
              : `seefood-fade ${FADE_MS}ms ease-out`,
          }}
          aria-label="Close history"
          onClick={requestClose}
        />
      ) : null}

      <div
        className="pointer-events-none fixed inset-y-0 left-0 z-50 w-[min(100%,22rem)] transition-transform ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          transitionDuration: `${CLOSE_MS}ms`,
          // Leave the trailing control fully visible when the drawer is closed.
          transform: shown ? "translateX(0)" : "translateX(calc(-100% + 4.75rem))",
        }}
      >
        <section
          className={cn(
            "flex h-full flex-col overflow-hidden transition-[background-color,border-color,box-shadow,opacity]",
            shown
              ? "border-r border-white/10 bg-background opacity-100 shadow-2xl"
              : "border-transparent bg-transparent opacity-0 shadow-none",
            shown ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{
            transitionDuration: shown ? `${CLOSE_MS}ms` : `${FADE_MS}ms`,
          }}
          aria-hidden={!shown}
        >
          <div className="flex h-16 shrink-0 items-center px-4 pr-16">
            <h2 className="text-sm font-medium">History</h2>
          </div>
          <div className="seefood-scroll flex-1 overflow-y-auto px-4 py-4 pr-2">
            {scans === null ? (
              <PendingDots label="Loading history" className="text-muted-foreground" />
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {scans?.length === 0 && !error ? (
              <p className="text-sm text-muted-foreground">No photos yet.</p>
            ) : null}
            <div className="flex flex-col gap-3">
              {scans?.map((scan) => (
                <article
                  key={scan.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
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
        </section>

        <button
          type="button"
          className={cn(
            "pointer-events-auto absolute top-4 right-4 flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-full border border-white/15 bg-card text-foreground select-none transition-[right,transform] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            shown && "min-[22.01rem]:right-0 min-[22.01rem]:translate-x-1/2",
          )}
          style={{ transitionDuration: `${CLOSE_MS}ms` }}
          aria-label={shown ? "Close history" : "Open history"}
          aria-expanded={shown}
          onClick={shown ? requestClose : requestOpen}
        >
          {shown ? <X className="size-4" /> : <Images className="size-4" />}
        </button>
      </div>
    </>
  );
}
