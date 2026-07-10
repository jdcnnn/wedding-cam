import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

const LOGO_PATH_MAIN =
  "M5320 6583 c-252 -20 -506 -85 -720 -186 -488 -231 -854 -678 -955 -1171 -65 -312 -33 -612 98 -941 63 -157 246 -445 334 -525 33 -30 33 -30 33 -315 0 -221 -3 -285 -12 -285 -7 0 -62 21 -123 46 -60 25 -135 56 -165 68 -30 13 -71 30 -90 38 -262 117 -706 298 -850 348 -109 38 -298 85 -420 105 -312 50 -650 -24 -941 -208 -294 -185 -480 -379 -660 -686 -17 -30 -32 -60 -33 -65 -1 -6 -11 -29 -23 -51 -31 -61 -71 -172 -99 -276 -144 -528 -40 -1062 293 -1505 203 -271 501 -478 843 -586 377 -119 728 -123 1085 -11 84 26 265 104 265 115 0 5 4 7 8 4 4 -2 26 6 47 19 22 13 58 34 79 45 93 52 280 202 397 319 182 182 291 332 399 550 108 216 135 289 185 488 57 231 80 416 91 729 6 163 9 185 23 180 9 -2 57 -22 106 -42 50 -21 137 -54 195 -73 105 -36 105 -36 102 -141 -7 -202 -43 -302 -130 -360 -47 -31 -47 -31 503 -27 454 3 567 7 650 20 244 42 459 109 650 204 112 56 148 75 155 84 3 3 21 14 40 24 19 10 37 21 40 24 3 3 39 29 80 56 96 64 109 75 255 214 78 74 214 226 245 273 14 21 28 38 33 38 4 0 7 7 7 15 0 8 5 15 10 15 6 0 10 5 10 11 0 6 11 25 24 42 38 51 111 175 160 274 89 178 145 342 197 582 29 132 38 508 16 656 -49 322 -155 617 -317 875 -44 70 -129 190 -150 210 -3 3 -25 30 -50 60 -25 30 -56 64 -70 76 -14 12 -43 39 -66 60 -22 22 -55 50 -73 64 -17 14 -62 49 -99 78 -37 29 -80 60 -97 69 -16 9 -32 19 -35 22 -6 7 -39 25 -177 96 -181 94 -413 174 -625 215 -201 40 -486 58 -678 43z m489 -57 c302 -52 649 -200 831 -353 8 -7 49 -39 90 -72 181 -142 381 -394 499 -628 198 -393 281 -922 220 -1388 -20 -152 -82 -419 -127 -545 -26 -73 -103 -254 -111 -260 -3 -3 -19 -32 -35 -65 -17 -33 -48 -87 -70 -120 -23 -33 -46 -70 -53 -83 -57 -107 -353 -401 -482 -479 -14 -9 -39 -25 -54 -35 -50 -34 -219 -118 -297 -148 -272 -102 -567 -142 -940 -124 l-195 9 -5 160 c-3 88 -3 177 -1 197 3 38 3 38 105 32 201 -12 444 25 696 107 52 17 109 37 125 44 186 80 316 147 442 231 62 41 115 79 119 86 8 13 1 9 -76 -42 -207 -139 -344 -201 -590 -268 -152 -42 -192 -47 -395 -47 -205 0 -274 9 -452 55 -85 22 -364 122 -448 160 -33 15 -82 35 -108 44 -111 38 -104 24 -111 208 -10 288 -16 1800 -7 1893 14 151 72 259 159 296 17 8 32 16 32 19 0 3 -146 5 -325 6 -179 0 -325 -3 -325 -7 0 -3 13 -12 29 -18 37 -16 97 -78 112 -116 43 -112 43 -98 48 -828 3 -383 3 -697 0 -697 -22 0 -239 291 -239 320 0 5 -4 10 -8 10 -5 0 -17 19 -27 43 -10 23 -35 78 -56 122 -78 171 -126 363 -138 558 -22 348 59 660 252 966 45 72 51 78 148 190 264 304 657 508 1099 570 41 6 86 13 100 15 62 11 479 -3 569 -18z m-3568 -2881 c222 -31 394 -88 884 -290 88 -36 183 -74 210 -85 28 -10 111 -44 185 -75 74 -31 180 -75 235 -96 55 -22 109 -44 120 -49 68 -31 137 -60 183 -76 52 -19 52 -19 52 -239 -1 -822 -108 -1307 -378 -1710 -99 -147 -288 -334 -448 -443 -527 -357 -1269 -345 -1873 31 -40 25 -87 58 -104 74 -18 15 -51 43 -74 61 -156 122 -325 350 -426 576 -58 130 -76 185 -114 343 -26 111 -27 132 -28 348 0 260 11 339 71 528 38 117 149 357 206 442 235 355 568 605 883 664 79 14 302 12 416 -4z";

const LOGO_PATH_STEM =
  "M4640 5563 c0 -5 15 -17 34 -27 74 -40 113 -113 135 -252 7 -50 9 -368 5 -1070 -3 -549 -3 -1032 1 -1071 5 -59 10 -73 23 -73 10 0 43 -9 75 -20 57 -19 155 -37 159 -29 2 2 5 531 8 1174 5 1170 5 1170 37 1231 30 57 96 124 122 124 6 0 11 4 11 9 0 6 -126 10 -305 11 -168 0 -305 -3 -305 -7z";

export function SplashScreen({ onDone }: Props) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 80);
    const t2 = setTimeout(() => setStage(2), 3700);
    const t3 = setTimeout(onDone, 4300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center select-none cursor-pointer relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
        opacity: stage === 2 ? 0 : 1,
        transition: stage === 2 ? "opacity 0.65s ease" : "none",
      }}
      onClick={onDone}
    >

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(115deg, transparent 15%, rgba(255,255,255,0.20) 30%, transparent 45%, rgba(255,255,255,0.12) 62%, transparent 78%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.32) 0%, transparent 68%)",
          opacity: stage === 1 ? 1 : 0,
          transform: stage === 1 ? "scale(1)" : "scale(0.5)",
          transition: "opacity 1.8s ease 0.1s, transform 1.8s ease 0.1s",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          overflow: "hidden",
          maxHeight: stage === 0 ? 0 : 118,
          transition:
            stage === 1
              ? "max-height 1.5s cubic-bezier(0.22, 0.61, 0.36, 1) 0.2s"
              : "none",
          marginBottom: 28,
          filter: "drop-shadow(0 2px 14px rgba(52,48,79,0.18))",
        }}
      >
        <svg
          viewBox="0 0 900 720"
          width="148"
          height="118"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <g
            transform="translate(0,720) scale(0.1,-0.1)"
            fill="#FBF8F4"
            stroke="none"
          >
            <path d={LOGO_PATH_MAIN} />
            <path d={LOGO_PATH_STEM} />
          </g>
        </svg>
      </div>

      <h1
        className="text-center leading-tight mb-3"
        style={{
          fontFamily: "Cormorant Garamond, Georgia, serif",
          fontWeight: 500,
          fontStyle: "italic",
          fontSize: "clamp(1.9rem, 8vw, 2.8rem)",
          color: "#FBF8F4",
          letterSpacing: "0.02em",
          textShadow: "0 2px 24px rgba(52,48,79,0.45)",
          opacity: stage === 1 ? 1 : 0,
          transform: stage === 1 ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.9s ease 1.4s, transform 0.9s ease 1.4s",
        }}
      >
        Jude &amp; Desiree
      </h1>

      <div
        style={{
          width: stage === 1 ? 52 : 0,
          height: 1,
          background: "rgba(251,248,244,0.5)",
          marginBottom: 12,
          transition: "width 0.7s ease 1.8s",
        }}
      />

      <p
        className="uppercase"
        style={{
          fontFamily: "DM Sans, system-ui, sans-serif",
          fontWeight: 500,
          fontSize: "0.68rem",
          color: "rgba(251,248,244,0.95)",
          letterSpacing: "0.35em",
          opacity: stage === 1 ? 1 : 0,
          transform: stage === 1 ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.9s ease 2s, transform 0.9s ease 2s",
        }}
      >
        THE WEDDING CAM
      </p>

      <p
        className="absolute bottom-10"
        style={{
          fontFamily: "DM Sans, system-ui, sans-serif",
          fontWeight: 300,
          fontSize: "0.75rem",
          color: "rgba(52,48,79,0.6)",
          letterSpacing: "0.06em",
          opacity: stage === 1 ? 1 : 0,
          transition: "opacity 1.2s ease 2.3s",
        }}
      >
        #JUDEfoundhisDEStiny
      </p>
    </div>
  );
}
