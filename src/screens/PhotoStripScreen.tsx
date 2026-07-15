import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

interface ShotRecord {
  id: string;
  file_path: string;
  localUrl: string;
}

interface Props {
  sessionId: string;
  coupleNames?: string;
  eventDate?: string;
  hashtag?: string;
  onDone: () => void;
}

const STRIP_COUNT = 3;
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const HEADER_ZONE_HEIGHT = 280;
const FOOTER_ZONE_HEIGHT = 300;

const PHOTO_GAP = 56;
const PHOTO_HEIGHT = Math.floor(
  (CANVAS_HEIGHT - HEADER_ZONE_HEIGHT - FOOTER_ZONE_HEIGHT - PHOTO_GAP * (STRIP_COUNT - 1)) /
    STRIP_COUNT,
);
const PHOTO_WIDTH = Math.round(PHOTO_HEIGHT * 0.75); // 3:4
const PHOTO_MATTE = 16;

const TILT_SEQUENCE = [-2.4, 2.1, -2.2, 2.4, -2.1];

const EDGE_MARGIN = 50;

const STRIP_VIEWER_ZOOM_MAX = 4;

const LOGO_PATH_MAIN =
  "M5320 6583 c-252 -20 -506 -85 -720 -186 -488 -231 -854 -678 -955 -1171 -65 -312 -33 -612 98 -941 63 -157 246 -445 334 -525 33 -30 33 -30 33 -315 0 -221 -3 -285 -12 -285 -7 0 -62 21 -123 46 -60 25 -135 56 -165 68 -30 13 -71 30 -90 38 -262 117 -706 298 -850 348 -109 38 -298 85 -420 105 -312 50 -650 -24 -941 -208 -294 -185 -480 -379 -660 -686 -17 -30 -32 -60 -33 -65 -1 -6 -11 -29 -23 -51 -31 -61 -71 -172 -99 -276 -144 -528 -40 -1062 293 -1505 203 -271 501 -478 843 -586 377 -119 728 -123 1085 -11 84 26 265 104 265 115 0 5 4 7 8 4 4 -2 26 6 47 19 22 13 58 34 79 45 93 52 280 202 397 319 182 182 291 332 399 550 108 216 135 289 185 488 57 231 80 416 91 729 6 163 9 185 23 180 9 -2 57 -22 106 -42 50 -21 137 -54 195 -73 105 -36 105 -36 102 -141 -7 -202 -43 -302 -130 -360 -47 -31 -47 -31 503 -27 454 3 567 7 650 20 244 42 459 109 650 204 112 56 148 75 155 84 3 3 21 14 40 24 19 10 37 21 40 24 3 3 39 29 80 56 96 64 109 75 255 214 78 74 214 226 245 273 14 21 28 38 33 38 4 0 7 7 7 15 0 8 5 15 10 15 6 0 10 5 10 11 0 6 11 25 24 42 38 51 111 175 160 274 89 178 145 342 197 582 29 132 38 508 16 656 -49 322 -155 617 -317 875 -44 70 -129 190 -150 210 -3 3 -25 30 -50 60 -25 30 -56 64 -70 76 -14 12 -43 39 -66 60 -22 22 -55 50 -73 64 -17 14 -62 49 -99 78 -37 29 -80 60 -97 69 -16 9 -32 19 -35 22 -6 7 -39 25 -177 96 -181 94 -413 174 -625 215 -201 40 -486 58 -678 43z m489 -57 c302 -52 649 -200 831 -353 8 -7 49 -39 90 -72 181 -142 381 -394 499 -628 198 -393 281 -922 220 -1388 -20 -152 -82 -419 -127 -545 -26 -73 -103 -254 -111 -260 -3 -3 -19 -32 -35 -65 -17 -33 -48 -87 -70 -120 -23 -33 -46 -70 -53 -83 -57 -107 -353 -401 -482 -479 -14 -9 -39 -25 -54 -35 -50 -34 -219 -118 -297 -148 -272 -102 -567 -142 -940 -124 l-195 9 -5 160 c-3 88 -3 177 -1 197 3 38 3 38 105 32 201 -12 444 25 696 107 52 17 109 37 125 44 186 80 316 147 442 231 62 41 115 79 119 86 8 13 1 9 -76 -42 -207 -139 -344 -201 -590 -268 -152 -42 -192 -47 -395 -47 -205 0 -274 9 -452 55 -85 22 -364 122 -448 160 -33 15 -82 35 -108 44 -111 38 -104 24 -111 208 -10 288 -16 1800 -7 1893 14 151 72 259 159 296 17 8 32 16 32 19 0 3 -146 5 -325 6 -179 0 -325 -3 -325 -7 0 -3 13 -12 29 -18 37 -16 97 -78 112 -116 43 -112 43 -98 48 -828 3 -383 3 -697 0 -697 -22 0 -239 291 -239 320 0 5 -4 10 -8 10 -5 0 -17 19 -27 43 -10 23 -35 78 -56 122 -78 171 -126 363 -138 558 -22 348 59 660 252 966 45 72 51 78 148 190 264 304 657 508 1099 570 41 6 86 13 100 15 62 11 479 -3 569 -18z m-3568 -2881 c222 -31 394 -88 884 -290 88 -36 183 -74 210 -85 28 -10 111 -44 185 -75 74 -31 180 -75 235 -96 55 -22 109 -44 120 -49 68 -31 137 -60 183 -76 52 -19 52 -19 52 -239 -1 -822 -108 -1307 -378 -1710 -99 -147 -288 -334 -448 -443 -527 -357 -1269 -345 -1873 31 -40 25 -87 58 -104 74 -18 15 -51 43 -74 61 -156 122 -325 350 -426 576 -58 130 -76 185 -114 343 -26 111 -27 132 -28 348 0 260 11 339 71 528 38 117 149 357 206 442 235 355 568 605 883 664 79 14 302 12 416 -4z";

const LOGO_PATH_STEM =
  "M4640 5563 c0 -5 15 -17 34 -27 74 -40 113 -113 135 -252 7 -50 9 -368 5 -1070 -3 -549 -3 -1032 1 -1071 5 -59 10 -73 23 -73 10 0 43 -9 75 -20 57 -19 155 -37 159 -29 2 2 5 531 8 1174 5 1170 5 1170 37 1231 30 57 96 124 122 124 6 0 11 4 11 9 0 6 -126 10 -305 11 -168 0 -305 -3 -305 -7z";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  top: number,
  width: number,
  fill: string | CanvasGradient,
) {
  const scale = width / 900;
  ctx.save();
  ctx.translate(centerX - width / 2, top);
  ctx.scale(scale, scale);
  ctx.translate(0, 720);
  ctx.scale(0.1, -0.1);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(LOGO_PATH_MAIN));
  ctx.fill(new Path2D(LOGO_PATH_STEM));
  ctx.restore();
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  spacing: number,
) {
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = centerX - totalWidth / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
}

function drawAccentRule(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  halfSpan: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(centerX - halfSpan, y);
  ctx.lineTo(centerX + halfSpan, y);
  ctx.stroke();

  ctx.fillStyle = color;
  [centerX - halfSpan, centerX + halfSpan].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 3.5);
    ctx.lineTo(x + 3.5, y);
    ctx.lineTo(x, y + 3.5);
    ctx.lineTo(x - 3.5, y);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

export function PhotoStripScreen({
  sessionId,
  coupleNames = "Jude & Des",
  eventDate,
  hashtag = "#JUDEfoundhisDEStiny",
  onDone,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shots, setShots] = useState<ShotRecord[]>([]);
  const [loadingShots, setLoadingShots] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);
  const [confirmingShare, setConfirmingShare] = useState(false);

  // ---------- Scroll-down tooltip ----------
  const [showScrollTip, setShowScrollTip] = useState(false);

  // ---------- Strip full-view modal (zoom + pan) ----------
  const [stripViewerOpen, setStripViewerOpen] = useState(false);
  const [stripViewerScale, setStripViewerScale] = useState(1);
  const [stripViewerPan, setStripViewerPan] = useState({ x: 0, y: 0 });
  const stripPinchDistRef = useRef<number | null>(null);
  const stripPinchScaleRef = useRef(1);
  const stripPanStartRef = useRef<{ x: number; y: number } | null>(null);
  const stripPanOriginRef = useRef({ x: 0, y: 0 });
  const stripLastTapRef = useRef(0);

  function openStripViewer() {
    if (!stripUrl) return;
    setStripViewerOpen(true);
    setStripViewerScale(1);
    setStripViewerPan({ x: 0, y: 0 });
  }
  function closeStripViewer() {
    setStripViewerOpen(false);
  }
  function stripViewerTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      stripPinchDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      stripPinchScaleRef.current = stripViewerScale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - stripLastTapRef.current < 280) {
        setStripViewerScale((s) => (s > 1 ? 1 : 2.5));
        setStripViewerPan({ x: 0, y: 0 });
      }
      stripLastTapRef.current = now;
      if (stripViewerScale > 1) {
        stripPanStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        stripPanOriginRef.current = stripViewerPan;
      }
    }
  }
  function stripViewerTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && stripPinchDistRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const scale = Math.min(
        STRIP_VIEWER_ZOOM_MAX,
        Math.max(1, stripPinchScaleRef.current * (dist / stripPinchDistRef.current)),
      );
      setStripViewerScale(scale);
    } else if (
      e.touches.length === 1 &&
      stripPanStartRef.current &&
      stripViewerScale > 1
    ) {
      e.preventDefault();
      const dx = e.touches[0].clientX - stripPanStartRef.current.x;
      const dy = e.touches[0].clientY - stripPanStartRef.current.y;
      setStripViewerPan({
        x: stripPanOriginRef.current.x + dx,
        y: stripPanOriginRef.current.y + dy,
      });
    }
  }
  function stripViewerTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) stripPinchDistRef.current = null;
    if (e.touches.length < 1) stripPanStartRef.current = null;
  }

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function load() {
      const [{ data: shotData }, { data: stripData }] = await Promise.all([
        supabase
          .from("shots")
          .select("id, file_path")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true }),
        supabase
          .from("photo_strips")
          .select("session_id")
          .eq("session_id", sessionId)
          .maybeSingle(),
      ]);

      if (stripData) {
        setHasCreated(true);
        setLoadingShots(false);
        return;
      }

      if (!shotData) {
        setLoadingShots(false);
        return;
      }

      const records: ShotRecord[] = shotData.map((row) => {
        const { data: pub } = supabase.storage
          .from("wedding-shots")
          .getPublicUrl(row.file_path);
        return { id: row.id, file_path: row.file_path, localUrl: pub.publicUrl };
      });

      setShots(records);
      setSelected(records.slice(0, STRIP_COUNT).map((s) => s.id));
      setLoadingShots(false);
    }
    load();
  }, [sessionId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= STRIP_COUNT) return [...prev.slice(1), id];
      return [...prev, id];
    });
    setStripUrl(null);
    setConfirmingShare(false);
  }

  async function generateStrip() {
    const canvas = canvasRef.current;
    if (!canvas || selected.length === 0) return;
    setGenerating(true);

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setGenerating(false);
      return;
    }

    const centerX = CANVAS_WIDTH / 2;

    const bg = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.addColorStop(0, "#8FA3D9");
    bg.addColorStop(1, "#C99BA0");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const sheen = ctx.createLinearGradient(
      CANVAS_WIDTH * 0.15,
      0,
      CANVAS_WIDTH * 0.85,
      CANVAS_HEIGHT,
    );
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.3, "rgba(255,255,255,0.2)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0)");
    sheen.addColorStop(0.62, "rgba(255,255,255,0.12)");
    sheen.addColorStop(0.78, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const glow = ctx.createRadialGradient(centerX, 150, 0, centerX, 150, 400);
    glow.addColorStop(0, "rgba(255,255,255,0.32)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawAccentRule(ctx, centerX, EDGE_MARGIN, 130, "rgba(251,248,244,0.55)");
    drawAccentRule(
      ctx,
      centerX,
      CANVAS_HEIGHT - EDGE_MARGIN,
      130,
      "rgba(251,248,244,0.55)",
    );

    const logoWidth = 116;
    const logoTop = 96;
    drawLogo(ctx, centerX, logoTop, logoWidth, "#FBF8F4");

    const wordmarkY = logoTop + logoWidth * 0.8 + 44;
    ctx.font = "500 21px 'DM Sans', system-ui, sans-serif";
    ctx.fillStyle = "rgba(251,248,244,0.92)";
    ctx.textAlign = "center";
    drawTrackedText(ctx, "THE WEDDING CAM", centerX, wordmarkY, 4.5);

    const orderedShots = selected
      .map((id) => shots.find((s) => s.id === id))
      .filter((s): s is ShotRecord => !!s);

    let y = HEADER_ZONE_HEIGHT;

    for (let i = 0; i < orderedShots.length; i++) {
      const shot = orderedShots[i];
      const angleDeg = TILT_SEQUENCE[i % TILT_SEQUENCE.length];
      const angleRad = (angleDeg * Math.PI) / 180;
      const boxCenterY = y + PHOTO_HEIGHT / 2;

      ctx.save();
      ctx.translate(centerX, boxCenterY);
      ctx.rotate(angleRad);

      const photoX = -PHOTO_WIDTH / 2;
      const photoY = -PHOTO_HEIGHT / 2;

      try {
        const img = await loadImage(shot.localUrl);

        ctx.save();
        ctx.shadowColor = "rgba(52,48,79,0.32)";
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          photoX - PHOTO_MATTE,
          photoY - PHOTO_MATTE,
          PHOTO_WIDTH + PHOTO_MATTE * 2,
          PHOTO_HEIGHT + PHOTO_MATTE * 2,
        );
        ctx.restore();

        const imgRatio = img.width / img.height;
        const boxRatio = PHOTO_WIDTH / PHOTO_HEIGHT;
        let sx = 0,
          sy = 0,
          sw = img.width,
          sh = img.height;
        if (imgRatio > boxRatio) {
          sw = img.height * boxRatio;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / boxRatio;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, PHOTO_WIDTH, PHOTO_HEIGHT);

      } catch (err) {
        console.error("Failed to load shot for strip:", err);
      }

      ctx.restore();
      y += PHOTO_HEIGHT + PHOTO_GAP;
    }

    let footerY = y - PHOTO_GAP + 92;

    ctx.fillStyle = "#FBF8F4";
    ctx.font = "italic 500 56px 'Cormorant Garamond', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(coupleNames, centerX, footerY);

    footerY += 38;
    ctx.strokeStyle = "rgba(251,248,244,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 30, footerY);
    ctx.lineTo(centerX + 30, footerY);
    ctx.stroke();

    if (eventDate) {
      footerY += 42;
      ctx.font = "300 17px 'DM Sans', system-ui, sans-serif";
      ctx.fillStyle = "rgba(251,248,244,0.85)";
      ctx.fillText(eventDate, centerX, footerY);
    }

    footerY += 44;
    ctx.font = "500 21px 'DM Sans', system-ui, sans-serif";
    ctx.fillStyle = "rgba(251,248,244,0.85)";
    ctx.fillText(hashtag, centerX, footerY);

    const url = canvas.toDataURL("image/jpeg", 0.9);
    setStripUrl(url);
    setGenerating(false);
  }

  useEffect(() => {
    if (selected.length > 0) generateStrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Show the "scroll down" tooltip once the guest has picked all 3 shots
  // (i.e. the strip preview is being generated below the fold), and hide
  // it once they scroll or after a timeout.
  useEffect(() => {
    if (!loadingShots && !hasCreated && selected.length === STRIP_COUNT) {
      setShowScrollTip(true);
      const t = setTimeout(() => setShowScrollTip(false), 4500);
      return () => clearTimeout(t);
    } else {
      setShowScrollTip(false);
    }
  }, [selected.length, loadingShots, hasCreated]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTip(false);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  async function markStripCreated() {
    if (hasCreated) return;
    const { error } = await supabase
      .from("photo_strips")
      .insert({ session_id: sessionId });
    if (!error) {
      setHasCreated(true);
      setConfirmingShare(false);
    }
  }

  async function handleShare() {
    if (!stripUrl || hasCreated) return;
    try {
      const res = await fetch(stripUrl);
      const blob = await res.blob();
      const file = new File([blob], "wedding-strip.jpg", { type: "image/jpeg" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: coupleNames,
          text: `${coupleNames} ${hashtag}`,
        });

        setConfirmingShare(true);
        return;
      }
    } catch (err) {
      console.error("Share failed, falling back to download:", err);
    }
    handleDownload();
  }

  function handleDownload() {
    if (!stripUrl || hasCreated) return;
    const a = document.createElement("a");
    a.href = stripUrl;
    a.download = "wedding-strip.jpg";
    a.click();

    markStripCreated();
  }

  return (
    <div
      className="h-full w-full flex flex-col relative overflow-hidden"
      style={{
        background: "#FBF8F4",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        style={{
          padding: "20px 20px 8px",
          textAlign: "center",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <svg
          viewBox="0 0 900 720"
          width="34"
          height="27"
          style={{ marginBottom: 6, display: "block" }}
        >
          <g transform="translate(0,720) scale(0.1,-0.1)" fill="#8FA3D9">
            <path d={LOGO_PATH_MAIN} />
            <path d={LOGO_PATH_STEM} />
          </g>
        </svg>

        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 400,
            fontSize: "0.6rem",
            color: "rgba(52,48,79,0.4)",
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Your souvenir
        </p>
        <h1
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(1.8rem, 7vw, 2.4rem)",
            color: "#34304F",
            margin: 0,
          }}
        >
          Make your strip
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: "0.75rem",
            color: "rgba(52,48,79,0.55)",
            marginTop: 8,
          }}
        >
          Pick {STRIP_COUNT} shots to share.
        </p>
      </div>

      <div
        ref={scrollContainerRef}
        style={{ flex: 1, overflowY: "auto", padding: "8px 20px", position: "relative" }}
      >
        {loadingShots ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontSize: "0.75rem",
              color: "rgba(52,48,79,0.4)",
            }}
          >
            Loading your shots…
          </div>
        ) : hasCreated ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8FA3D9, #C99BA0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <polyline
                  points="5,15 11,21 23,8"
                  stroke="#FBF8F4"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p
              style={{
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontStyle: "italic",
                fontSize: "1.4rem",
                color: "#34304F",
                marginBottom: 8,
              }}
            >
              Your strip is made
            </p>
            <p
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: "0.78rem",
                color: "rgba(52,48,79,0.55)",
                lineHeight: 1.6,
                maxWidth: 240,
              }}
            >
              Each guest gets one souvenir strip — yours has already been created and shared or saved.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {shots.map((shot) => {
                const isSelected = selected.includes(shot.id);
                const order = selected.indexOf(shot.id);
                return (
                  <button
                    key={shot.id}
                    onClick={() => toggleSelect(shot.id)}
                    style={{
                      position: "relative",
                      aspectRatio: "3/4",
                      border: isSelected
                        ? "3px solid #8FA3D9"
                        : "1px solid rgba(143,163,217,0.3)",
                      borderRadius: 8,
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "none",
                    }}
                  >
                    <img
                      src={shot.localUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: isSelected ? 1 : 0.5,
                      }}
                    />
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #8FA3D9, #C99BA0)",
                          color: "#FBF8F4",
                          fontSize: "0.65rem",
                          fontFamily: "DM Sans, sans-serif",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {order + 1}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selected.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  onClick={openStripViewer}
                  style={{
                    borderRadius: 10,
                    overflow: "hidden",
                    boxShadow: "0 8px 30px rgba(52,48,79,0.18)",
                    maxWidth: 200,
                    width: "100%",
                    background: "#fff",
                    minHeight: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: stripUrl && !generating ? "pointer" : "default",
                  }}
                >
                  {generating && (
                    <span
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: "0.7rem",
                        color: "rgba(52,48,79,0.4)",
                        padding: 20,
                      }}
                    >
                      Generating…
                    </span>
                  )}
                  {!generating && stripUrl && (
                    <img src={stripUrl} alt="Photo strip preview" style={{ width: "100%", display: "block" }} />
                  )}
                </div>
              </div>
            )}

            {selected.length > 0 && !generating && stripUrl && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <p
                  style={{
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    fontSize: "0.68rem",
                    color: "rgba(52,48,79,0.4)",
                    letterSpacing: "0.02em",
                  }}
                >
                  Tap the strip to view full screen
                </p>
              </div>
            )}

            {showScrollTip && (
              <div
                style={{
                  position: "sticky",
                  bottom: 8,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "none",
                  marginTop: 8,
                  zIndex: 3,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 20,
                    background: "rgba(52,48,79,0.88)",
                    color: "#FBF8F4",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    fontWeight: 400,
                    fontSize: "0.72rem",
                    letterSpacing: "0.03em",
                    boxShadow: "0 6px 20px rgba(52,48,79,0.25)",
                    animation: "stripTipBounce 1.4s ease-in-out infinite",
                  }}
                >
                  Scroll down to see your strip
                  <span style={{ fontSize: "0.9rem" }}>↓</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div
        style={{
          padding: "12px 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {!hasCreated && confirmingShare && (
          <div
            style={{
              textAlign: "center",
              padding: "6px 4px 4px",
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: "0.78rem",
                color: "rgba(52,48,79,0.7)",
                marginBottom: 12,
              }}
            >
              Did you finish posting your story?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={markStripCreated}
                className="flex-1 rounded-full active:scale-95 transition-transform"
                style={{
                  padding: "13px 0",
                  background: "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
                  color: "#34304F",
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  fontWeight: 500,
                  fontSize: "0.8rem",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                Yes, posted it
              </button>
              <button
                onClick={() => setConfirmingShare(false)}
                className="flex-1 rounded-full active:scale-95 transition-transform"
                style={{
                  padding: "13px 0",
                  background: "transparent",
                  border: "1px solid rgba(143,163,217,0.5)",
                  color: "#34304F",
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  fontWeight: 500,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                }}
              >
                Not yet
              </button>
            </div>
          </div>
        )}

        {!hasCreated && !confirmingShare && (
          <>
            <button
              onClick={handleShare}
              disabled={!stripUrl || generating}
              className="w-full rounded-full active:scale-95 transition-transform"
              style={{
                padding: "15px 0",
                background: "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
                color: "#34304F",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 500,
                fontSize: "0.85rem",
                border: "none",
                cursor: stripUrl ? "pointer" : "not-allowed",
                letterSpacing: "0.1em",
                opacity: stripUrl ? 1 : 0.5,
              }}
            >
              SHARE
            </button>
            <button
              onClick={handleDownload}
              disabled={!stripUrl || generating}
              className="w-full rounded-full active:scale-95 transition-transform"
              style={{
                padding: "13px 0",
                background: "transparent",
                border: "1px solid rgba(143,163,217,0.5)",
                color: "#34304F",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 500,
                fontSize: "0.8rem",
                cursor: stripUrl ? "pointer" : "not-allowed",
                letterSpacing: "0.08em",
                opacity: stripUrl ? 1 : 0.5,
              }}
            >
              DOWNLOAD
            </button>
          </>
        )}
        <button
          onClick={onDone}
          style={{
            background: "none",
            border: "none",
            color: "rgba(52,48,79,0.45)",
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.06em",
            cursor: "pointer",
            padding: "6px 0",
          }}
        >
          {hasCreated ? "Back to finish" : "Skip for now"}
        </button>
      </div>

      {stripViewerOpen && stripUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
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
            onTouchStart={stripViewerTouchStart}
            onTouchMove={stripViewerTouchMove}
            onTouchEnd={stripViewerTouchEnd}
            onDoubleClick={() => {
              setStripViewerScale((s) => (s > 1 ? 1 : 2.5));
              setStripViewerPan({ x: 0, y: 0 });
            }}
          >
            <img
              src={stripUrl}
              alt="Photo strip full view"
              draggable={false}
              style={{
                maxWidth: "88%",
                maxHeight: "88%",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 12px 44px rgba(0,0,0,0.5)",
                transform: `translate(${stripViewerPan.x}px, ${stripViewerPan.y}px) scale(${stripViewerScale})`,
                transition: stripPinchDistRef.current ? "none" : "transform 0.2s ease",
                touchAction: "none",
              }}
            />
          </div>

          <button
            onClick={closeStripViewer}
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

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style>{`
        @keyframes stripTipBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(4px); }
        }
      `}</style>
    </div>
  );
}