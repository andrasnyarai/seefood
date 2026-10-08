"use client";

import { useEffect, useRef, useState, type SyntheticEvent, type TouchEvent } from "react";
import { ImageUp, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resizeImageFile } from "@/lib/resize-image";
import { rememberScanId } from "@/lib/scan-history";
import type { Scan } from "@/lib/types";
import { formatConfidence, formatFoodLabel, verdictHeadline } from "@/lib/verdict";
import { PendingDots } from "@/components/pending-dots";

type Status = "idle" | "running" | "done" | "error";

export function ClassifyWorkspace() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [dragging, setDragging] = useState(false);
  const requestId = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraAttempt = useRef(0);
  const openingCamera = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPhase, setCameraPhase] = useState<"idle" | "requesting">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [secureContext, setSecureContext] = useState<boolean | null>(null);

  function closeCamera() {
    cameraAttempt.current += 1;
    openingCamera.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setCameraPhase("idle");
    setCameraError(null);
  }

  function startCamera() {
    if (openingCamera.current) return;
    const media = navigator.mediaDevices;
    if (!window.isSecureContext || !media?.getUserMedia) {
      setCameraError("Open this page with HTTPS to use the camera.");
      return;
    }

    openingCamera.current = true;
    const attempt = ++cameraAttempt.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const request = media.getUserMedia({
      audio: false,
      video: { facingMode: "environment" },
    });
    setCameraPhase("requesting");
    setCameraError(null);

    request
      .then((stream) => {
        if (cameraAttempt.current !== attempt) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setCameraReady(true);
        setCameraPhase("idle");
      })
      .catch((cause: unknown) => {
        if (cameraAttempt.current !== attempt) return;
        const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
        setCameraReady(false);
        setCameraPhase("idle");
        setCameraError(
          denied
            ? "Camera is blocked. Allow it for this site in Safari settings, then try again."
            : "The camera is unavailable on this connection.",
        );
      })
      .finally(() => {
        if (cameraAttempt.current === attempt) openingCamera.current = false;
      });
  }

  useEffect(() => {
    const secure = window.isSecureContext;
    void Promise.resolve().then(() => {
      setSecureContext(secure);
    });
  }, []);

  function markTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function openCameraFromGesture(event: SyntheticEvent) {
    if ("changedTouches" in event) {
      const touchEvent = event as TouchEvent;
      const touch = touchEvent.changedTouches[0];
      const start = touchStart.current;
      touchStart.current = null;
      if (!touch || !start) return;
      const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      if (moved > 12) return;
      event.preventDefault();
    }
    startCamera();
  }

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraReady || !video || !stream) return;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.controls = false;
    video.srcObject = stream;
    void video.play().catch(() => {
      setCameraError("Tap Capture after the live view appears.");
    });
  }, [cameraReady]);

  useEffect(() => {
    return () => {
      cameraAttempt.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) return;
    takeFile(new File([blob], "capture.jpg", { type: "image/jpeg" }));
  }

  function reset() {
    requestId.current += 1;
    setStatus("idle");
    setScan(null);
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (videoRef.current && streamRef.current) {
      void videoRef.current.play();
    }
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function classifyFile(file: File) {
    const id = ++requestId.current;
    setStatus("running");
    setError(null);
    setScan(null);

    try {
      const jpeg = await resizeImageFile(file);
      const body = new FormData();
      body.set("image", jpeg, "scan.jpg");
      const response = await fetch("/api/classify", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);
      if (requestId.current !== id) return;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Classification failed.";
        throw new Error(message);
      }

      const result = payload as Scan;
      rememberScanId(result.id);
      setScan(result);
      setStatus("done");
    } catch (cause) {
      if (requestId.current !== id) return;
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Classification failed.");
    }
  }

  function takeFile(next: File | null) {
    if (!next) return;
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
    void classifyFile(next);
  }

  const cameraPrompt =
    secureContext === false
      ? "Safari will not ask for the camera while the address bar says Not Secure. Open the https address instead."
      : cameraPhase === "requesting"
        ? "Requesting camera…"
        : (cameraError ?? "Tap to allow the camera");

  return (
    <section
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl transition-colors duration-200",
        dragging && "border-white/40",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        takeFile(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col bg-black">
        {cameraReady ? (
          <video
            ref={videoRef}
            className={cn(
              "pointer-events-none absolute inset-0 size-full object-cover",
              previewUrl && "invisible",
            )}
            autoPlay
            muted
            playsInline
            controls={false}
            disablePictureInPicture
          />
        ) : null}
        {previewUrl ? (
          // The preview is a local object URL created from the selected file.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected upload"
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        {!previewUrl && !cameraReady ? (
          <div className="relative mx-3 mt-3 min-h-0 flex-1">
            <button
              type="button"
              className="absolute inset-0 flex cursor-pointer touch-manipulation items-center justify-center px-8 text-center text-sm text-white select-none desktop:hidden"
              onClick={openCameraFromGesture}
              onTouchStart={markTouchStart}
              onTouchEnd={openCameraFromGesture}
            >
              {cameraPrompt}
            </button>
            <label
              className={cn(
                "absolute inset-0 hidden cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-8 text-center desktop:flex",
                dragging
                  ? "border-foreground bg-white/10"
                  : "border-white/25 bg-white/5 hover:border-white/50 hover:bg-white/10",
              )}
            >
              <input
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  takeFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
              <ImageUp className="mb-3 size-8 text-muted-foreground" />
              <span className="text-base font-medium">Drop a file here</span>
              <span className="mt-1 text-sm text-muted-foreground">JPEG, PNG, WebP, or GIF</span>
            </label>
          </div>
        ) : null}

        {cameraReady && !previewUrl ? (
          <button
            type="button"
            className="absolute top-3 right-3 z-30 flex size-11 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-black/60 text-white select-none"
            aria-label="Close camera"
            onClick={closeCamera}
          >
            <X className="size-5" />
          </button>
        ) : null}

        <div
          className={cn(
            "z-20 flex flex-col gap-3",
            cameraReady || previewUrl
              ? "pointer-events-none absolute inset-x-0 bottom-0 p-4"
              : "relative p-3",
          )}
        >
          {cameraReady || previewUrl ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"
            />
          ) : null}
          <div className="pointer-events-auto relative flex flex-col gap-3">
            {status === "running" ? (
              <PendingDots label="Classifying" className="text-white" />
            ) : null}

            {scan ? (
              <div className="text-center" aria-live="polite">
                <p className="text-3xl font-semibold tracking-tight text-white">
                  {verdictHeadline(scan.verdict)}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  {formatFoodLabel(scan.label)} · {formatConfidence(scan.confidence)}
                  {scan.lowConfidence ? " · Low confidence" : ""}
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="text-center text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            {!previewUrl ? (
              <div className="flex flex-col gap-2">
                {(secureContext === false || cameraError) && !cameraReady ? (
                  <p className="hidden text-center text-sm text-white/80 desktop:block">
                    {secureContext === false
                      ? "Safari will not ask for the camera while the address bar says Not Secure. Open the https address."
                      : cameraError}
                  </p>
                ) : null}
                {!cameraReady ? (
                  <button
                    type="button"
                    className="h-11 w-full cursor-pointer touch-manipulation rounded-lg bg-primary text-sm font-medium text-primary-foreground select-none active:bg-primary/80"
                    onClick={openCameraFromGesture}
                    onTouchStart={markTouchStart}
                    onTouchEnd={openCameraFromGesture}
                  >
                    {cameraPhase === "requesting" ? "Requesting camera…" : "Open camera"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-11 w-full cursor-pointer touch-manipulation rounded-lg bg-primary text-sm font-medium text-primary-foreground select-none active:bg-primary/80 disabled:opacity-50"
                    disabled={status === "running"}
                    onClick={() => void captureFrame()}
                  >
                    Capture
                  </button>
                )}
                <label
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "relative h-11 w-full touch-manipulation border-white/15 bg-black/40 text-white active:!translate-none hover:bg-white/15 hover:text-white",
                  )}
                >
                  Choose photo
                  <input
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                      takeFile(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            ) : (
              <button
                type="button"
                className="h-11 w-full cursor-pointer touch-manipulation rounded-lg bg-primary text-sm font-medium text-primary-foreground select-none active:bg-primary/80 disabled:opacity-50"
                disabled={status === "running"}
                onClick={reset}
              >
                Try another
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
