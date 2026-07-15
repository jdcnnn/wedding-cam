import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { cropTo43 } from "../lib/cropTo43";
import { MAX_SHOTS } from "../types";

interface ShotRecord {
  id: string;
  file_path: string;
  localUrl: string;
}

interface Props {
  sessionId: string;
  shotCount: number;
  onShot: () => void;
  onDelete: () => void;
  onFinished: () => void;
}

const CAMERA_ACQUIRE_TIMEOUT_MS = 6000;
const HARDWARE_RELEASE_DELAY_MS = 250;
const FINISH_TRANSITION_MS = 700;
const DIGITAL_ZOOM_MAX = 3;
const VIEWER_ZOOM_MAX = 4;

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 14,
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "rgba(251,248,244,0.1)",
    border: "1px solid rgba(251,248,244,0.18)",
    color: "#FBF8F4",
    fontSize: "1.6rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 5,
  } as React.CSSProperties;
}

export function CameraScreen({
  sessionId,
  shotCount,
  onShot,
  onDelete,
  onFinished,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shotCountRef = useRef(shotCount);
  const cameraRequestIdRef = useRef(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);
  const isPinchingRef = useRef(false);

  const [shots, setShots] = useState<ShotRecord[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [localShotCount, setLocalShotCount] = useState(shotCount);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorType, setCameraErrorType] = useState
    <"permission" | "other" | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<ShotRecord | null>(null);
  const [transitioningOut, setTransitioningOut] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{
    min: number;
    max: number;
    step: number;
  } | null>(null);
  const [entered, setEntered] = useState(false);

  // ---------- Photo viewer (zoom + prev/next) ----------
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerScale, setViewerScale] = useState(1);
  const [viewerPan, setViewerPan] = useState({ x: 0, y: 0 });
  const viewerPinchDistRef = useRef<number | null>(null);
  const viewerPinchScaleRef = useRef(1);
  const viewerPanStartRef = useRef<{ x: number; y: number } | null>(null);
  const viewerPanOriginRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);

  const viewingShot = viewerIndex !== null ? shots[viewerIndex] : null;

  function openViewer(index: number) {
    setViewerIndex(index);
    setViewerScale(1);
    setViewerPan({ x: 0, y: 0 });
  }
  function closeViewer() {
    setViewerIndex(null);
  }
  function showPrevShot() {
    setViewerScale(1);
    setViewerPan({ x: 0, y: 0 });
    setViewerIndex((i) =>
      i === null ? null : i > 0 ? i - 1 : shots.length - 1,
    );
  }
  function showNextShot() {
    setViewerScale(1);
    setViewerPan({ x: 0, y: 0 });
    setViewerIndex((i) =>
      i === null ? null : i < shots.length - 1 ? i + 1 : 0,
    );
  }

  function viewerTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      viewerPinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      viewerPinchScaleRef.current = viewerScale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        setViewerScale((s) => (s > 1 ? 1 : 2.5));
        setViewerPan({ x: 0, y: 0 });
      }
      lastTapRef.current = now;
      if (viewerScale > 1) {
        viewerPanStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        viewerPanOriginRef.current = viewerPan;
      }
    }
  }
  function viewerTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && viewerPinchDistRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scale = Math.min(
        VIEWER_ZOOM_MAX,
        Math.max(1, viewerPinchScaleRef.current * (dist / viewerPinchDistRef.current)),
      );
      setViewerScale(scale);
    } else if (
      e.touches.length === 1 &&
      viewerPanStartRef.current &&
      viewerScale > 1
    ) {
      e.preventDefault();
      const dx = e.touches[0].clientX - viewerPanStartRef.current.x;
      const dy = e.touches[0].clientY - viewerPanStartRef.current.y;
      setViewerPan({
        x: viewerPanOriginRef.current.x + dx,
        y: viewerPanOriginRef.current.y + dy,
      });
    }
  }
  function viewerTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) viewerPinchDistRef.current = null;
    if (e.touches.length < 1) viewerPanStartRef.current = null;
  }

  const usingDigitalZoom = !zoomCapabilities;

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    shotCountRef.current = localShotCount;
  }, [localShotCount]);

  useEffect(() => {
    setLocalShotCount(shotCount);
  }, [shotCount]);

  const shotsLeft = MAX_SHOTS - localShotCount;
  const currentShot = Math.min(localShotCount + 1, MAX_SHOTS);
  const rollFull = localShotCount >= MAX_SHOTS;

  const constraintsFor = (): MediaStreamConstraints => ({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 2560 },
      height: { ideal: 1440 },
    },
    audio: false,
  });

  const fallbackConstraintsFor = (): MediaStreamConstraints => ({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });

  const startCamera = useCallback(async () => {
    const requestId = cameraRequestIdRef.current + 1;
    cameraRequestIdRef.current = requestId;

    setCameraReady(false);
    setCameraError(null);
    setCameraErrorType(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      await new Promise((r) => setTimeout(r, HARDWARE_RELEASE_DELAY_MS));
    }

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      if (cameraRequestIdRef.current !== requestId) return;
      timedOut = true;
      setCameraError("Camera is taking too long to start. Try again.");
      setCameraErrorType("other");
    }, CAMERA_ACQUIRE_TIMEOUT_MS);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraintsFor());
      } catch {
        stream = await navigator.mediaDevices.getUserMedia(
          fallbackConstraintsFor(),
        );
      }

      clearTimeout(timeoutId);
      if (timedOut || cameraRequestIdRef.current !== requestId) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const [track] = stream.getVideoTracks();
      const caps = track.getCapabilities?.() as any;
      if (caps?.zoom) {
        setZoomCapabilities({
          min: caps.zoom.min,
          max: caps.zoom.max,
          step: caps.zoom.step || 0.1,
        });
        setZoomLevel(caps.zoom.min);
      } else {
        setZoomCapabilities(null);
        setZoomLevel(1);
      }

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      video.load();

      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) return resolve();
        video.addEventListener("loadedmetadata", () => resolve(), {
          once: true,
        });
      });

      await video.play().catch(() => {});
      if (cameraRequestIdRef.current === requestId) {
        setCameraReady(true);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (cameraRequestIdRef.current !== requestId) return;
      console.error("Camera failed:", err);

      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError(
          "Camera access was denied. Please allow camera access in your browser settings, then reload this page.",
        );
        setCameraErrorType("permission");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device.");
        setCameraErrorType("other");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setCameraError(
          "Camera is being used by another app. Close other apps and try again.",
        );
        setCameraErrorType("other");
      } else {
        setCameraError(
          "Change to a location with better lighting and try again.",
        );
        setCameraErrorType("other");
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      cameraRequestIdRef.current += 1;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryCamera = useCallback(() => {
    startCamera();
  }, [startCamera]);

  const applyZoom = useCallback(
    async (level: number) => {
      if (zoomCapabilities) {
        if (!streamRef.current) return;
        const [track] = streamRef.current.getVideoTracks();
        const clamped = Math.min(
          zoomCapabilities.max,
          Math.max(zoomCapabilities.min, level),
        );
        try {
          await track.applyConstraints({
            advanced: [{ zoom: clamped } as any],
          });
          setZoomLevel(clamped);
        } catch (err) {
          console.error("Zoom failed:", err);
        }
      } else {
        const clamped = Math.min(DIGITAL_ZOOM_MAX, Math.max(1, level));
        setZoomLevel(clamped);
      }
    },
    [zoomCapabilities],
  );

  function getTouchDistance(touches: React.TouchList): number {
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      pinchStartDistRef.current = getTouchDistance(e.touches);
      pinchStartZoomRef.current = zoomLevel;
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const currentDist = getTouchDistance(e.touches);
      const scale = currentDist / pinchStartDistRef.current;

      if (zoomCapabilities) {
        const range = zoomCapabilities.max - zoomCapabilities.min;
        const newZoom = pinchStartZoomRef.current + (scale - 1) * range * 0.6;
        applyZoom(newZoom);
      } else {
        const newZoom = pinchStartZoomRef.current * scale;
        applyZoom(newZoom);
      }
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
      isPinchingRef.current = false;
    }
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("shots")
        .select("id, file_path")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (!data) return;
      const records: ShotRecord[] = data.map((row) => {
        const { data: pub } = supabase.storage
          .from("wedding-shots")
          .getPublicUrl(row.file_path);
        return {
          id: row.id,
          file_path: row.file_path,
          localUrl: pub.publicUrl,
        };
      });
      setShots(records);
      setLocalShotCount(records.length);
    }
    load();
  }, [sessionId]);

  async function capture() {
    const current = shotCountRef.current;
    if (capturing || current >= MAX_SHOTS || !videoRef.current || !cameraReady)
      return;
    setCapturing(true);
    setFlashActive(true);
    await new Promise((r) => setTimeout(r, 80));
    setFlashActive(false);

    try {
      const video = videoRef.current;

      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          video.addEventListener("canplay", () => resolve(), { once: true });
        });
      }

      const rawBitmap = await createImageBitmap(video);

      let sourceBitmap = rawBitmap;
      if (usingDigitalZoom && zoomLevel > 1.001) {
        const cropW = rawBitmap.width / zoomLevel;
        const cropH = rawBitmap.height / zoomLevel;
        const sx = (rawBitmap.width - cropW) / 2;
        const sy = (rawBitmap.height - cropH) / 2;
        sourceBitmap = await createImageBitmap(
          rawBitmap,
          sx,
          sy,
          cropW,
          cropH,
        );
      }

      const blob = await cropTo43(sourceBitmap);
      const timestamp = Date.now();
      const filePath = `shots/${sessionId}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wedding-shots")
        .upload(filePath, blob, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;

      const { data: dbData, error: dbError } = await supabase
        .from("shots")
        .insert({ session_id: sessionId, file_path: filePath })
        .select("id, file_path")
        .single();
      if (dbError) throw dbError;

      const { data: pub } = supabase.storage
        .from("wedding-shots")
        .getPublicUrl(filePath);
      const newShot = {
        id: dbData.id,
        file_path: filePath,
        localUrl: pub.publicUrl,
      };

      setShots((prev) => [...prev, newShot]);
      const newCount = current + 1;
      setLocalShotCount(newCount);
      onShot();

      if (newCount >= MAX_SHOTS) {
        setShowPreview(true);
      }
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setCapturing(false);
    }
  }

  async function deleteShot(shot: ShotRecord) {
    const { error: storageError } = await supabase.storage
      .from("wedding-shots")
      .remove([shot.file_path]);

    if (storageError) {
      console.error("Storage delete failed:", storageError);
    }

    const { error: dbError } = await supabase
      .from("shots")
      .delete()
      .eq("id", shot.id);

    if (dbError) {
      console.error("DB delete failed:", dbError);
    }

    setShots((prev) => prev.filter((s) => s.id !== shot.id));
    setLocalShotCount((prev) => Math.max(0, prev - 1));
    onDelete();
  }

  async function confirmFinish() {
    setFinishing(true);
    setShowPreview(false);
    setTransitioningOut(true);
    await new Promise((r) => setTimeout(r, FINISH_TRANSITION_MS));
    onFinished();
  }

  const showZoomIndicator = zoomCapabilities
    ? zoomLevel > zoomCapabilities.min + zoomCapabilities.step
    : zoomLevel > 1.02;

  const zoomIndicatorValue = zoomCapabilities
    ? (zoomLevel / zoomCapabilities.min).toFixed(1)
    : zoomLevel.toFixed(1);

  return (
    <div
      className="h-full w-full flex flex-col"
      style={{
        background: "#15131c",
        opacity: transitioningOut ? 0 : entered ? 1 : 0,
        transform: entered ? "scale(1)" : "scale(1.04)",
        transition: transitioningOut
          ? `opacity ${FINISH_TRANSITION_MS}ms ease`
          : "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {flashActive && (
        <div
          className="absolute inset-0 z-50 pointer-events-none"
          style={{
            background: "rgba(255,255,255,0.9)",
            transition: "opacity 0.1s",
          }}
        />
      )}

      <div
        style={{
          background: "linear-gradient(135deg, #8FA3D9, #C99BA0)",
          padding: "12px 20px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: "1px solid rgba(251,248,244,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #C9C7EC, #F4CBD6)",
                opacity: 0.5,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <span
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 500,
              fontSize: "0.58rem",
              color: "rgba(251,248,244,0.65)",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
            }}
          >
            The Wedding Cam
          </span>
          <span
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "0.7rem",
              color: "rgba(251,248,244,0.4)",
              letterSpacing: "0.05em",
            }}
          >
            Jude & Desiree
          </span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #C9C7EC, #F4CBD6)",
                opacity: 0.5,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          flex: 1,
          background: "#000",
          overflow: "hidden",
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={(e) =>
            (e.target as HTMLVideoElement).play().catch(() => {})
          }
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: usingDigitalZoom ? `scale(${zoomLevel})` : "none",
            transition: isPinchingRef.current
              ? "none"
              : "transform 0.15s ease-out",
          }}
        />

        {!cameraReady && !cameraError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#000",
            }}
          >
            <span
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 300,
                fontSize: "0.75rem",
                color: "rgba(251,248,244,0.4)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Starting camera…
            </span>
          </div>
        )}

        {cameraError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#000",
              gap: 14,
              padding: "0 32px",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 300,
                fontSize: "0.78rem",
                color: "rgba(251,248,244,0.65)",
                letterSpacing: "0.05em",
              }}
            >
              {cameraError}
            </span>
            <button
              onClick={
                cameraErrorType === "permission"
                  ? () => window.location.reload()
                  : retryCamera
              }
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 500,
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                color: "#34304F",
                background: "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
                border: "none",
                borderRadius: 20,
                padding: "9px 22px",
                cursor: "pointer",
              }}
            >
              {cameraErrorType === "permission" ? "RELOAD PAGE" : "RETRY"}
            </button>
          </div>
        )}

        {[
          { top: 16, left: 16, borderTop: true, borderLeft: true },
          { top: 16, right: 16, borderTop: true, borderRight: true },
          { bottom: 16, left: 16, borderBottom: true, borderLeft: true },
          { bottom: 16, right: 16, borderBottom: true, borderRight: true },
        ].map((corner, i) => {
          const { borderTop, borderLeft, borderRight, borderBottom, ...pos } =
            corner;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                ...pos,
                width: 20,
                height: 20,
                borderTop: borderTop
                  ? "2px solid rgba(201,155,160,0.55)"
                  : "none",
                borderBottom: borderBottom
                  ? "2px solid rgba(201,155,160,0.55)"
                  : "none",
                borderLeft: borderLeft
                  ? "2px solid rgba(201,155,160,0.55)"
                  : "none",
                borderRight: borderRight
                  ? "2px solid rgba(201,155,160,0.55)"
                  : "none",
              }}
            />
          );
        })}

        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(52,48,79,0.45)",
            backdropFilter: "blur(10px)",
            borderRadius: 20,
            padding: "5px 14px",
            border: "1px solid rgba(251,248,244,0.12)",
          }}
        >
          <span
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "0.72rem",
              color: "#FBF8F4",
              letterSpacing: "0.12em",
            }}
          >
            {currentShot} <span style={{ opacity: 0.45 }}>/ {MAX_SHOTS}</span>
          </span>
        </div>

        {showZoomIndicator && (
          <div
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(52,48,79,0.45)",
              backdropFilter: "blur(10px)",
              borderRadius: 20,
              padding: "4px 12px",
              border: "1px solid rgba(251,248,244,0.12)",
            }}
          >
            <span
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 400,
                fontSize: "0.68rem",
                color: "#FBF8F4",
                letterSpacing: "0.05em",
              }}
            >
              {zoomIndicatorValue}×
            </span>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "0.68rem",
              color: "rgba(251,248,244,0.55)",
              letterSpacing: "0.1em",
            }}
          >
            {shotsLeft} shot{shotsLeft !== 1 ? "s" : ""} remaining
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          height: 4,
          background: "#1c1826",
          flexShrink: 0,
        }}
      >
        {Array.from({ length: MAX_SHOTS }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background:
                i < localShotCount
                  ? "linear-gradient(90deg, #8FA3D9, #C99BA0)"
                  : "transparent",
              borderRight: i < MAX_SHOTS - 1 ? "1px solid #15131c" : "none",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      <div
        style={{
          background: "linear-gradient(180deg, #1c1826 0%, #15131c 100%)",
          padding: "20px 36px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          flexShrink: 0,
          borderTop: "1px solid rgba(251,248,244,0.05)",
        }}
      >
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {Array.from({ length: MAX_SHOTS }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i < localShotCount ? 8 : i === localShotCount ? 6 : 4,
                height: i < localShotCount ? 8 : i === localShotCount ? 6 : 4,
                borderRadius: "50%",
                background:
                  i < localShotCount
                    ? "linear-gradient(135deg, #8FA3D9, #C99BA0)"
                    : i === localShotCount
                      ? "rgba(251,248,244,0.5)"
                      : "rgba(251,248,244,0.12)",
                transition: "all 0.3s ease",
                alignSelf: "center",
              }}
            />
          ))}
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ width: 50, height: 50 }} />

          <button
            onClick={rollFull ? () => setShowPreview(true) : capture}
            disabled={capturing || (shotsLeft <= 0 && !rollFull) || (!cameraReady && !rollFull)}
            style={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              background: capturing
                ? "rgba(251,248,244,0.3)"
                : "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
              border: "2px solid rgba(251,248,244,0.2)",
              outline: "7px solid rgba(143,163,217,0.15)",
              cursor:
                capturing || (shotsLeft <= 0 && !rollFull) || (!cameraReady && !rollFull)
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.15s ease",
              transform: capturing ? "scale(0.9)" : "scale(1)",
              boxShadow: "0 0 30px rgba(143,163,217,0.2)",
              flexShrink: 0,
              opacity: !cameraReady && !rollFull ? 0.5 : 1,
            }}
          />

          <button
            onClick={() => setShowPreview(true)}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              background: "rgba(251,248,244,0.06)",
              border: "1px solid rgba(251,248,244,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              padding: 0,
            }}
          >
            {shots.length > 0 ? (
              <img
                src={shots[shots.length - 1].localUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(251,248,244,0.45)"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {showPreview && (
        <div
          className="absolute inset-0 z-40 flex flex-col"
          style={{ background: "rgba(21,19,28,0.97)" }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "20px 20px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: rollFull ? 10 : 0,
              }}
            >
              <span
                style={{
                  color: "#FBF8F4",
                  fontFamily: "DM Sans",
                  fontWeight: 400,
                  fontSize: "0.9rem",
                }}
              >
                Your shots ({shots.length}/{MAX_SHOTS})
              </span>
              {!rollFull && (
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    color: "rgba(251,248,244,0.45)",
                    fontSize: "1.3rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {rollFull && (
              <p
                style={{
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  fontWeight: 300,
                  fontSize: "0.75rem",
                  color: "rgba(251,248,244,0.5)",
                  margin: 0,
                }}
              >
                That's all 10 — take a look, then confirm to finish.
              </p>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 32px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
              }}
            >
              {shots.map((shot, index) => (
                <div
                  key={shot.id}
                  style={{ position: "relative", aspectRatio: "3/4" }}
                >
                  <img
                    src={shot.localUrl}
                    alt=""
                    loading="lazy"
                    onClick={() => openViewer(index)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 6,
                      background: "#241f38",
                      cursor: "pointer",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.2";
                    }}
                  />
                  <button
                    onClick={() => setConfirmDelete(shot)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(52,48,79,0.75)",
                      color: "#FBF8F4",
                      border: "none",
                      fontSize: "0.65rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {rollFull && (
            <div
              style={{
                padding: "12px 20px 28px",
                flexShrink: 0,
              }}
            >
              <button
                onClick={confirmFinish}
                disabled={finishing}
                className="w-full rounded-full active:scale-95 transition-transform"
                style={{
                  padding: "15px 0",
                  background: "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
                  color: "#34304F",
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: finishing ? "not-allowed" : "pointer",
                  letterSpacing: "0.1em",
                  opacity: finishing ? 0.6 : 1,
                }}
              >
                {finishing ? "FINISHING…" : "CONFIRM & FINISH"}
              </button>
            </div>
          )}
        </div>
      )}

      {viewingShot && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,13,20,0.97)", overflow: "hidden" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onTouchStart={viewerTouchStart}
            onTouchMove={viewerTouchMove}
            onTouchEnd={viewerTouchEnd}
            onDoubleClick={() => {
              setViewerScale((s) => (s > 1 ? 1 : 2.5));
              setViewerPan({ x: 0, y: 0 });
            }}
          >
            <img
              src={viewingShot.localUrl}
              alt=""
              draggable={false}
              style={{
                maxWidth: "90%",
                maxHeight: "85%",
                objectFit: "contain",
                borderRadius: 8,
                transform: `translate(${viewerPan.x}px, ${viewerPan.y}px) scale(${viewerScale})`,
                transition: viewerPinchDistRef.current
                  ? "none"
                  : "transform 0.2s ease",
                touchAction: "none",
              }}
            />
          </div>

          {shots.length > 1 && (
            <>
              <button onClick={showPrevShot} style={navBtnStyle("left")}>
                ‹
              </button>
              <button onClick={showNextShot} style={navBtnStyle("right")}>
                ›
              </button>
            </>
          )}

          <button
            onClick={closeViewer}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              color: "#FBF8F4",
              fontSize: "1.4rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              zIndex: 5,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {confirmDelete && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(21,19,28,0.75)" }}
        >
          <div
            style={{
              background: "#241f38",
              borderRadius: 16,
              padding: "24px 24px 20px",
              width: "80%",
              maxWidth: 300,
              textAlign: "center",
              border: "1px solid rgba(251,248,244,0.06)",
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 300,
                fontSize: "0.85rem",
                color: "rgba(251,248,244,0.85)",
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Delete this shot? You'll get one shot back.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 20,
                  background: "rgba(251,248,244,0.08)",
                  border: "1px solid rgba(251,248,244,0.15)",
                  color: "rgba(251,248,244,0.75)",
                  fontFamily: "DM Sans",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteShot(confirmDelete);
                  setConfirmDelete(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 20,
                  background: "#d1698a",
                  border: "none",
                  color: "#fff",
                  fontFamily: "DM Sans",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}