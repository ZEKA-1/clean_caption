import { useState } from "react";
import { Clock, Trash2 } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import UploadBox from "../components/UploadBox.jsx";
import Footer from "../components/Footer.jsx";
import { getLocalHistory, clearLocalHistory } from "../utils/localHistory.js";

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function Upload() {
  // Read once when the page loads. This list only ever lives in this
  // browser — it's never sent to a server.
  const [history, setHistory] = useState(() => getLocalHistory());

  function handleClear() {
    clearLocalHistory();
    setHistory([]);
  }

  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <div className="section-heading narrow">
          <p className="eyebrow">Upload</p>
          <h1>Choose the video you want to clean.</h1>
          <p>
            No sign-in is required. Select a file and continue directly to the
            processing screen.
          </p>
        </div>

        {/* Reuse the same upload component from the landing page. */}
        <UploadBox compact />

        {/* Local-only history — stored in this browser, never uploaded. */}
        {history.length > 0 && (
          <section className="recent-videos">
            <div className="recent-videos-header">
              <h3>Recent videos</h3>
              <button type="button" className="clear-history" onClick={handleClear}>
                <Trash2 size={14} />
                Clear
              </button>
            </div>
            <ul className="recent-videos-list">
              {history.map((entry, index) => (
                <li key={index}>
                  <span className="recent-video-name">{entry.name}</span>
                  <span className="recent-video-meta">
                    <Clock size={13} />
                    {formatDate(entry.date)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="small-text">
              This list is stored only in your browser — it's never sent to a
              server.
            </p>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

export default Upload;
