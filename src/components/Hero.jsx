import { useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentVideoUrl } from "../utils/currentVideo.js";

function Hero() {
  // show the real result if there is one this session, else a generic example
  const [realVideoUrl] = useState(() => getCurrentVideoUrl());
  const fileName = sessionStorage.getItem("cleanCaptionFileName");
  const hasRealResult = Boolean(realVideoUrl);

  return (
    <section className="hero page-shell">
      <div className="hero-copy">
        <p className="eyebrow">Simple video moderation</p>
        <h1>Make every video safer to share.</h1>

        <p className="hero-text">
          Upload a video, detect offensive language, replace it with beeps,
          blur the speaker&apos;s mouth and download the cleaned version.
        </p>

        <div className="hero-actions">
          <Link to="/upload" className="button">
            Upload a video
          </Link>
          <a href="#demo" className="button button-secondary">
            See demo
          </a>
        </div>

        <p className="privacy-note">
          No account required. Upload, process and download directly.
        </p>
      </div>

      <div className="product-card" aria-label={hasRealResult ? "Your last processed video" : "Example preview"}>
        <div className="product-card-top">
          <div>
            <p className="file-label">{hasRealResult ? fileName : "Example preview"}</p>
            <p className="small-text">
              {hasRealResult ? "Processing complete" : "This is what a finished result looks like"}
            </p>
          </div>
          <span className="status-badge">Ready</span>
        </div>

        {hasRealResult ? (
          <video className="hero-preview-video" controls muted src={realVideoUrl} />
        ) : (
          <video className="hero-preview-video" controls muted preload="metadata">
            <source src="/videos/hero-example.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>
        )}
      </div>
    </section>
  );
}

export default Hero;
