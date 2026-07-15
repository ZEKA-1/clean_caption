import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const STEP_MS = 180; // how often progress advances
const STEP_SIZE = 5; // percent added on every tick

function Processing() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  const fileName =
    sessionStorage.getItem("cleanCaptionFileName") || "your-video.mp4";
  const quality = sessionStorage.getItem("cleanCaptionQuality") || "original";

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = current + STEP_SIZE;
        if (next >= 100) {
          clearInterval(timer);
          return 100;
        }
        return next;
      });
    }, STEP_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const redirectTimer = setTimeout(() => {
        navigate("/download");
      }, 700);

      return () => clearTimeout(redirectTimer);
    }
  }, [progress, navigate]);

  const currentMessage =
    progress < 35
      ? "Detecting offensive language..."
      : progress < 70
        ? "Adding audio beeps..."
        : progress < 100
          ? "Applying mouth blur..."
          : "Processing complete.";

  const remainingSteps = Math.ceil((100 - progress) / STEP_SIZE);
  const remainingSeconds = Math.max(1, Math.round((remainingSteps * STEP_MS) / 1000));

  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <section className="processing-card">
          <div className="spinner" aria-hidden="true"></div>

          <p className="eyebrow">Processing</p>
          <h1>Cleaning your video...</h1>
          <p className="processing-file">
            {fileName} · {quality === "original" ? "Original quality" : quality}
          </p>

          <div className="progress-track" aria-label={`${progress}% complete`}>
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="progress-row">
            <span>{currentMessage}</span>
            <strong>{progress}%</strong>
          </div>

          {progress < 100 && (
            <p className="small-text time-remaining">
              ~{remainingSeconds}s remaining
            </p>
          )}

          <button
            type="button"
            className="button button-secondary cancel-button"
            onClick={() => navigate("/upload")}
          >
            Cancel
          </button>

          <p className="small-text">
            TODO backend: replace this progress simulation with real
            processing status from the API. Cancelling should also tell the
            API to stop the job.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Processing;
