function Comparison() {
  return (
    <section id="demo" className="section page-shell">
      <div className="section-heading">
        <p className="eyebrow">Before and after</p>
        <h2>See the difference.</h2>
        <p>
          These demonstration videos show where the real original and processed
          videos will appear.
        </p>
      </div>

      <div className="comparison-grid">
        {/* Original video before censorship. */}
        <article className="comparison-card">
          <span className="label label-dark">Before</span>

          <video className="comparison-video" controls preload="metadata">
            <source src="/videos/before.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>

          <p>Original speech, audio and captions before processing.</p>
        </article>

        {/* Processed result with simulated beep and mouth blur. */}
        <article className="comparison-card">
          <span className="label">After</span>

          <video
            className="comparison-video processed"
            controls
            preload="metadata"
          >
            <source src="/videos/after.mp4" type="video/mp4" />
            Your browser does not support video playback.
          </video>

          <p>Cleaned audio, blurred mouth and filtered caption result.</p>
        </article>
      </div>
    </section>
  );
}

export default Comparison;
