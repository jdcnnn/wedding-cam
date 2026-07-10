import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import { SplashScreen } from "./screens/SplashScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";
import { CameraScreen } from "./screens/CameraScreen";
import { FinishedScreen } from "./screens/FinishedScreen";
import { PhotoStripScreen } from "./screens/PhotoStripScreen";
import { AdminScreen } from "./screens/AdminScreen";

function GuestApp() {
  const {
    sessionId,
    shotCount,
    screen,
    setScreen,
    isLoading,
    incrementShot,
    decrementShot,
  } = useSession();

  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #C9C7EC 0%, #DEC6DE 48%, #F4CBD6 100%)",
        }}
      >
        <div
          style={{
            color: "#FBF8F4",
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: "0.68rem",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  if (!sessionId) return null;

  switch (screen) {
    case "splash":
      return <SplashScreen onDone={() => setScreen("instructions")} />;
    case "instructions":
      return <InstructionsScreen onStart={() => setScreen("camera")} />;
    case "camera":
      return (
        <CameraScreen
          sessionId={sessionId}
          shotCount={shotCount}
          onShot={incrementShot}
          onDelete={decrementShot}
          onFinished={() => setScreen("finished")}
        />
      );
    case "finished":
      return (
        <FinishedScreen
          sessionId={sessionId}
          onCreateStrip={() => setScreen("strip")}
        />
      );
    case "strip":
      return (
        <PhotoStripScreen
          sessionId={sessionId}
          onDone={() => setScreen("finished")}
        />
      );
    default:
      return null;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminScreen />} />
        <Route path="/*" element={<GuestApp />} />
      </Routes>
    </BrowserRouter>
  );
}