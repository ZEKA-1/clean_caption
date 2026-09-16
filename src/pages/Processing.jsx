import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const API_URL = "http://127.0.0.1:8000";

function Processing() {
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);

  const [message, setMessage] = useState(
    "Starting processing..."
  );

  const [status, setStatus] = useState(
    "running"
  );

  const [errorType, setErrorType] =
    useState("");

  const [errorDetails, setErrorDetails] =
    useState("");

  const [retryCount, setRetryCount] =
    useState(0);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const fileName =
    sessionStorage.getItem(
      "cleanCaptionFileName"
    ) || "your-video.mp4";

  const jobId =
    sessionStorage.getItem(
      "cleanCaptionJobId"
    );

  useEffect(() => {
    let timer = null;
    let disposed = false;

    function stopPolling() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function showError(
      type,
      title,
      details
    ) {
      stopPolling();

      if (disposed) {
        return;
      }

      setStatus("error");

      setErrorType(type);

      setMessage(title);

      setErrorDetails(
        details || "An unexpected error occurred."
      );
    }

    async function getFinalResult() {
      try {
        const resultResponse = await fetch(
          `${API_URL}/api/process/${jobId}/result`
        );

        let resultData = {};

        try {
          resultData =
            await resultResponse.json();
        } catch {
          resultData = {};
        }

        if (!resultResponse.ok) {
          throw new Error(
            resultData.detail ||
              "The processed video could not be loaded."
          );
        }

        if (disposed) {
          return;
        }

        const finalVideoUrl =
          `${API_URL}${resultData.videoUrl}`;

        const downloadUrl =
          `${API_URL}/api/process/${jobId}/download`;

        sessionStorage.setItem(
          "cleanCaptionProcessedVideoUrl",
          finalVideoUrl
        );

        sessionStorage.setItem(
          "cleanCaptionDownloadUrl",
          downloadUrl
        );

        sessionStorage.setItem(
          "cleanCaptionDetections",
          JSON.stringify(
            resultData.detections || []
          )
        );

        navigate("/download");
      } catch (error) {
        showError(
          "result",
          "Your video was processed, but the result could not be loaded.",
          error.message
        );
      }
    }

    async function checkStatus() {
      try {
        const response = await fetch(
          `${API_URL}/api/process/${jobId}/status`
        );

        let data = {};

        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          if (response.status === 404) {
            showError(
              "job",
              "This processing job could not be found.",
              "The server no longer has information about this video. Please upload the video again."
            );

            return;
          }

          throw new Error(
            data.detail ||
              `Server error (${response.status}).`
          );
        }

        if (disposed) {
          return;
        }

        setProgress(
          typeof data.progress === "number"
            ? data.progress
            : 0
        );

        setMessage(
          data.message || "Processing..."
        );

        setStatus(
          data.status || "running"
        );

        setErrorType("");
        setErrorDetails("");

        if (data.status === "done") {
          stopPolling();

          setProgress(100);

          await getFinalResult();

          return;
        }

        if (data.status === "error") {
          showError(
            "processing",
            "CleanCaption could not finish processing this video.",
            data.message ||
              "The processing pipeline stopped unexpectedly."
          );
        }
      } catch (error) {
        showError(
          "connection",
          "CleanCaption cannot connect to the processing server.",
          error.message ||
            "Please make sure the backend is running and try again."
        );
      }
    }

    if (!jobId) {
      setStatus("error");

      setErrorType("missing");

      setMessage(
        "No processing job was found."
      );

      setErrorDetails(
        "Please return to the upload page and choose a video first."
      );

      return () => {
        disposed = true;
      };
    }

    /*
      Poll every 500 ms.

      The percentage still comes from
      the real backend.
    */

    timer = setInterval(
      checkStatus,
      500
    );

    checkStatus();

    return () => {
      disposed = true;

      stopPolling();
    };
  }, [
    jobId,
    navigate,
    retryCount,
  ]);

  function clearCurrentJob() {
    sessionStorage.removeItem(
      "cleanCaptionJobId"
    );

    sessionStorage.removeItem(
      "cleanCaptionProcessedVideoUrl"
    );

    sessionStorage.removeItem(
      "cleanCaptionDownloadUrl"
    );

    sessionStorage.removeItem(
      "cleanCaptionDetections"
    );
  }

  function handleRetryConnection() {
    setStatus("running");

    setErrorType("");

    setErrorDetails("");

    setMessage(
      "Reconnecting to CleanCaption..."
    );

    setRetryCount(
      (current) => current + 1
    );
  }

  function handleBackToUpload() {
    clearCurrentJob();

    navigate("/upload");
  }

  async function handleCancel() {
    if (isCancelling) {
      return;
    }

    setIsCancelling(true);

    if (jobId) {
      try {
        await fetch(
          `${API_URL}/api/process/${jobId}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        console.error(
          "Cancel request failed:",
          error
        );
      }
    }

    clearCurrentJob();

    navigate("/upload");
  }

  const canRetryConnection =
    errorType === "connection" ||
    errorType === "result";

  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <section
          className={`processing-card ${
            status === "error"
              ? "processing-card-error"
              : ""
          }`}
        >
          {status === "error" ? (
            <>
              <div
                className="processing-error-icon"
                aria-hidden="true"
              >
                <AlertTriangle
                  size={32}
                  strokeWidth={2}
                />
              </div>

              <p className="eyebrow">
                Something went wrong
              </p>

              <h1>
                Processing failed
              </h1>

              <p className="processing-file">
                {fileName}
              </p>

              <div className="processing-error-message">
                <strong>
                  {message}
                </strong>

                <p>
                  {errorDetails}
                </p>
              </div>

              <div className="processing-error-actions">
                {canRetryConnection && (
                  <button
                    type="button"
                    className="button"
                    onClick={
                      handleRetryConnection
                    }
                  >
                    <RefreshCw
                      size={18}
                    />

                    Retry connection
                  </button>
                )}

                <button
                  type="button"
                  className="button button-secondary"
                  onClick={
                    handleBackToUpload
                  }
                >
                  <ArrowLeft
                    size={18}
                  />

                  Back to upload
                </button>
              </div>

              <p className="small-text processing-error-help">
                Your original video on your
                computer has not been
                deleted.
              </p>
            </>
          ) : (
            <>
              <div
                className="spinner"
                aria-hidden="true"
              />

              <p className="eyebrow">
                Processing
              </p>

              <h1>
                Cleaning your video...
              </h1>

              <p className="processing-file">
                {fileName}
              </p>

              <div
                className="progress-track"
                aria-label={`${progress}% complete`}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <div className="progress-row">
                <span>
                  {message}
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <button
                type="button"
                className="button button-secondary cancel-button"
                onClick={
                  handleCancel
                }
                disabled={
                  isCancelling
                }
              >
                {isCancelling
                  ? "Cancelling..."
                  : "Cancel"}
              </button>
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Processing;