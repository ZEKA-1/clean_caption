import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const API_URL = "http://127.0.0.1:8000";

function Processing() {
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Starting processing...");
  const [status, setStatus] = useState("running");

  const fileName =
    sessionStorage.getItem("cleanCaptionFileName") || "your-video.mp4";
  const jobId = sessionStorage.getItem("cleanCaptionJobId");

  useEffect(() => {
    if (!jobId) {
      setMessage("No processing job found. Please upload a video first.");
      setStatus("error");
      return;
    }

    let timer;

    async function checkStatus() {
      try {
        const response = await fetch(`${API_URL}/api/process/${jobId}/status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Could not get processing status.");
        }

        setProgress(data.progress || 0);
        setMessage(data.message || "Processing...");
        setStatus(data.status);

        if (data.status === "done") {
          clearInterval(timer);

          const resultResponse = await fetch(
            `${API_URL}/api/process/${jobId}/result`
          );

          const resultData = await resultResponse.json();

          if (!resultResponse.ok) {
            throw new Error(resultData.detail || "Could not get final video.");
          }

          const finalVideoUrl = `${API_URL}${resultData.videoUrl}`;
          const downloadUrl = `${API_URL}/api/process/${jobId}/download`;

          sessionStorage.setItem(
            "cleanCaptionProcessedVideoUrl",
            finalVideoUrl
          );

          sessionStorage.setItem("cleanCaptionDownloadUrl", downloadUrl);

          sessionStorage.setItem(
            "cleanCaptionDetections",
            JSON.stringify(resultData.detections || [])
          );

          navigate("/download");
        }

        if (data.status === "error") {
          clearInterval(timer);
          setStatus("error");
          setMessage(data.message || "Processing failed.");
        }
      } catch (error) {
        clearInterval(timer);
        setStatus("error");
        setMessage(error.message || "Processing failed.");
      }
    }

    checkStatus();
    timer = setInterval(checkStatus, 2000);

    return () => clearInterval(timer);
  }, [jobId, navigate]);

  async function handleCancel() {
    if (jobId) {
      try {
        await fetch(`${API_URL}/api/process/${jobId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Cancel failed:", error);
      }
    }

    navigate("/upload");
  }

  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <section className="processing-card">
          {status !== "error" && (
            <div className="spinner" aria-hidden="true"></div>
          )}

          <p className="eyebrow">Processing</p>

          <h1>
            {status === "error" ? "Processing failed." : "Cleaning your video..."}
          </h1>

          <p className="processing-file">{fileName}</p>

          <div className="progress-track" aria-label={`${progress}% complete`}>
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="progress-row">
            <span>{message}</span>
            <strong>{progress}%</strong>
          </div>

          {status === "error" && (
            <p className="small-text">
              Check your backend terminal to see the real error.
            </p>
          )}

          <button
            type="button"
            className="button button-secondary cancel-button"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Processing;