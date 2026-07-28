import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { addLocalHistoryEntry } from "../utils/localHistory.js";

function Download() {
  const fileName =
    sessionStorage.getItem("cleanCaptionFileName") || "clean-video.mp4";

  const [videoUrl] = useState(() =>
    sessionStorage.getItem("cleanCaptionProcessedVideoUrl")
  );

  const [downloadUrl] = useState(() =>
    sessionStorage.getItem("cleanCaptionDownloadUrl")
  );

  const [detections] = useState(() => {
    const saved = sessionStorage.getItem("cleanCaptionDetections");

    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    addLocalHistoryEntry({ name: fileName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <section className="download-card">
          <div className="success-icon">✓</div>

          <p className="eyebrow">Complete</p>
          <h1>Your cleaned video is ready.</h1>

          <p>{fileName}</p>

          {videoUrl ? (
            <video className="download-preview" controls src={videoUrl} />
          ) : (
            <p className="small-text">
              No processed video was found. Go back to Upload and process a
              video again.
            </p>
          )}

          {detections.length > 0 && (
            <div className="recent-videos" style={{ marginTop: "24px" }}>
              <h3>Detected bad words</h3>

              <ul className="recent-videos-list">
                {detections.map((item, index) => (
                  <li key={index}>
                    <span className="recent-video-name">{item.word}</span>
                    <span className="recent-video-meta">{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="download-actions">
            {downloadUrl && (
              <a href={downloadUrl} className="button">
                Download video
              </a>
            )}

            <Link to="/upload" className="button button-secondary">
              Process another video
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default Download;