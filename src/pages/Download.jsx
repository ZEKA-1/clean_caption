import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { addLocalHistoryEntry } from "../utils/localHistory.js";
import { getCurrentVideoUrl } from "../utils/currentVideo.js";

function Download() {
  const fileName =
    sessionStorage.getItem("cleanCaptionFileName") || "clean-video.mp4";
  const quality = sessionStorage.getItem("cleanCaptionQuality") || "original";

  const [videoUrl] = useState(() => getCurrentVideoUrl());

  useEffect(() => {
    addLocalHistoryEntry({ name: fileName, quality });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDownload(event) {
    event.preventDefault();

    // TODO backend: real download link goes here
    alert("The backend team will connect the real download link here.");
  }

  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <section className="download-card">
          <div className="success-icon">✓</div>

          <p className="eyebrow">Complete</p>
          <h1>Your cleaned video is ready.</h1>
          <p>
            {fileName} · {quality === "original" ? "Original quality" : quality}
          </p>

          {videoUrl ? (
            <video className="download-preview" controls src={videoUrl} />
          ) : (
            <p className="small-text">
              No video was found for this session — go back to Upload and
              choose a file to see it here.
            </p>
          )}

          <div className="download-actions">
            <a href="#" className="button" onClick={handleDownload}>
              Download video
            </a>

            <Link to="/upload" className="button button-secondary">
              Process another video
            </Link>
          </div>

          <p className="small-text">
            TODO backend: this shows the video exactly as uploaded — no real
            beep/blur applied yet. Replace with the real processed video once
            the API exists.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Download;
