import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Film } from "lucide-react";
import {
  setCurrentVideo,
  getCurrentVideoUrl,
  clearCurrentVideo,
} from "../utils/currentVideo.js";

const API_URL = "http://127.0.0.1:8000";

function UploadBox({ compact = false }) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function openFilePicker() {
    if (isUploading) return;
    fileInputRef.current?.click();
  }

  function saveSelectedFile(selectedFile) {
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      setError("Please choose a video file only.");
      return;
    }

    setError("");
    setFile(selectedFile);

    // Preview before processing.
    setCurrentVideo(selectedFile);

    // Clear old processed result.
    sessionStorage.removeItem("cleanCaptionJobId");
    sessionStorage.removeItem("cleanCaptionProcessedVideoUrl");
    sessionStorage.removeItem("cleanCaptionDownloadUrl");
    sessionStorage.removeItem("cleanCaptionDetections");
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];
    saveSelectedFile(selectedFile);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!isUploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    if (isUploading) return;

    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];
    saveSelectedFile(droppedFile);
  }

  function resetSelection() {
    setFile(null);
    setError("");
    clearCurrentVideo();

    sessionStorage.removeItem("cleanCaptionJobId");
    sessionStorage.removeItem("cleanCaptionProcessedVideoUrl");
    sessionStorage.removeItem("cleanCaptionDownloadUrl");
    sessionStorage.removeItem("cleanCaptionDetections");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function startProcessing() {
    if (!file || isUploading) return;

    try {
      setIsUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(`${API_URL}/api/process`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || `Upload failed (${response.status})`);
      }

      sessionStorage.setItem("cleanCaptionJobId", data.jobId);
      sessionStorage.setItem("cleanCaptionFileName", file.name);

      navigate("/processing");
    } catch (err) {
      const message = err.message || "Could not start processing.";
      setError(message);
      alert(`Could not start processing: ${message}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section
      className={`${compact ? "upload-box compact" : "upload-box"} ${isDragging ? "drag-over" : ""
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/*"
        onChange={handleFileChange}
        hidden
      />

      {!file ? (
        <>
          <div className="upload-icon" aria-hidden="true">
            <UploadCloud size={34} strokeWidth={2.1} />
          </div>

          <h2>{isDragging ? "Drop the video here" : "Drop your video here"}</h2>
          <p>or choose a file from your computer</p>

          <button type="button" className="button" onClick={openFilePicker}>
            <UploadCloud size={19} strokeWidth={2.1} />
            Choose video
          </button>

          <p className="upload-help">
            Drag and drop a video here, or click the button. MP4, MOV and AVI ·
            Maximum 500 MB
          </p>

          {error && <p className="small-text">{error}</p>}
        </>
      ) : (
        <>
          <video
            className="upload-preview"
            src={getCurrentVideoUrl()}
            controls
            muted
          />

          <div className="upload-preview-info">
            <Film size={16} />
            <span>{file.name}</span>
          </div>

          {error && <p className="small-text">{error}</p>}

          <div className="download-actions">
            <button
              type="button"
              className="button"
              onClick={startProcessing}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Start processing"}
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={resetSelection}
              disabled={isUploading}
            >
              Choose a different video
            </button>
          </div>

          <p className="upload-help">
            You can also drop another video here to replace this one.
          </p>
        </>
      )}
    </section>
  );
}

export default UploadBox;