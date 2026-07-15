import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Film } from "lucide-react";
import { setCurrentVideo, getCurrentVideoUrl, clearCurrentVideo } from "../utils/currentVideo.js";

const QUALITY_OPTIONS = [
  { value: "original", label: "Original quality" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p (smaller file)" },
];

function UploadBox({ compact = false }) {
  // The hidden input is opened when the visible button is clicked.
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [quality, setQuality] = useState("original");

  // just for the name/preview here — the shared ref lives in currentVideo.js
  const [file, setFile] = useState(null);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setCurrentVideo(selectedFile); // so Processing/Download can use it too
  }

  function resetSelection() {
    setFile(null);
    clearCurrentVideo();
  }

  function startProcessing() {
    if (!file) return;

    sessionStorage.setItem("cleanCaptionFileName", file.name);
    sessionStorage.setItem("cleanCaptionQuality", quality);

    // TODO backend: send file + quality to the API here
    navigate("/processing");
  }

  return (
    <section className={compact ? "upload-box compact" : "upload-box"}>
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

          <h2>Drop your video here</h2>
          <p>or choose a file from your computer</p>

          <label className="quality-select">
            <span>Output quality</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="button" onClick={openFilePicker}>
            <UploadCloud size={19} strokeWidth={2.1} />
            Choose video
          </button>

          <p className="upload-help">MP4, MOV and AVI · Maximum 500 MB</p>
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

          <label className="quality-select">
            <span>Output quality</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="download-actions">
            <button type="button" className="button" onClick={startProcessing}>
              Start processing
            </button>
            <button type="button" className="button button-secondary" onClick={resetSelection}>
              Choose a different video
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default UploadBox;
