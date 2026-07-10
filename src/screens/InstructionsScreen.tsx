import { useState, useEffect } from "react";

interface Props {
  onStart: () => void;
}

const steps = [
  {
    number: "01",
    text: "Point your camera at the newlyweds and other special moments.",
  },
  {
    number: "02",
    text: "Tap the shutter. You have 10 shots, so make them count.",
  },
  {
    number: "03",
    text: "Your photos are saved automatically to the couple's album.",
  },
];

export function InstructionsScreen({ onStart }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="h-full w-full flex flex-col relative overflow-hidden"
      style={{ background: "#FBF8F4" }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,155,160,0.4) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(143,163,217,0.3) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          height: 3,
          width: visible ? "40%" : "0%",
          background: "linear-gradient(90deg, #8FA3D9, #C99BA0)",
          transition: "width 0.9s cubic-bezier(0.22,0.61,0.36,1) 0.1s",
          flexShrink: 0,
        }}
      />

      <div className="flex flex-col flex-1 px-8 pt-12 pb-10">
        <div
          className="mb-12"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          <p
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 400,
              fontSize: "0.63rem",
              color: "rgba(52,48,79,0.4)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Before you begin
          </p>
          <h1
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "clamp(2.4rem, 10vw, 3.2rem)",
              color: "#34304F",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            How it works.
          </h1>
        </div>

        <ol className="flex flex-col flex-1" style={{ gap: 0 }}>
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex items-start"
              style={{
                gap: 20,
                paddingBottom: 28,
                paddingTop: i === 0 ? 0 : 28,
                borderBottom:
                  i < steps.length - 1
                    ? "1px solid rgba(143,163,217,0.3)"
                    : "none",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(14px)",
                transition: `opacity 0.7s ease ${0.35 + i * 0.12}s, transform 0.7s ease ${0.35 + i * 0.12}s`,
              }}
            >
              <span
                style={{
                  fontFamily: "Cormorant Garamond, Georgia, serif",
                  fontWeight: 300,
                  fontStyle: "italic",
                  fontSize: "2.6rem",
                  lineHeight: 1,
                  minWidth: 38,
                  userSelect: "none",
                  background: "linear-gradient(135deg, #8FA3D9, #C99BA0)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {step.number}
              </span>

              <p
                style={{
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  fontWeight: 400,
                  fontSize: "0.9rem",
                  color: "rgba(52,48,79,0.8)",
                  lineHeight: 1.75,
                  paddingTop: 4,
                  margin: 0,
                }}
              >
                {step.text}
              </p>
            </li>
          ))}
        </ol>

        <div
          className="mt-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.7s ease 0.75s, transform 0.7s ease 0.75s",
          }}
        >
          <button
            onClick={onStart}
            className="w-full rounded-full active:scale-95 transition-transform"
            style={{
              padding: "15px 0",
              background: "linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)",
              color: "#34304F",
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 500,
              fontSize: "0.88rem",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.12em",
              boxShadow: "0 4px 20px rgba(143,163,217,0.45)",
            }}
          >
            GET STARTED
          </button>

          <p
            className="text-center mt-5"
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "0.72rem",
              color: "rgba(52,48,79,0.3)",
              letterSpacing: "0.08em",
            }}
          >
            #JUDEfoundhisDEStiny
          </p>
        </div>
      </div>
    </div>
  );
}
