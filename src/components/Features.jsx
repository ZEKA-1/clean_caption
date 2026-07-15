const features = [
  {
    icon: "01",
    title: "Speech detection",
    text: "Identify offensive words and their timestamps in the video audio.",
  },
  {
    icon: "02",
    title: "Audio censoring",
    text: "Replace inappropriate words with a clear beep sound.",
  },
  {
    icon: "03",
    title: "Mouth blur",
    text: "Blur the speaker's mouth only during the detected words.",
  },
];

function Features() {
  return (
    <section id="features" className="section section-soft">
      <div className="page-shell">
        <div className="section-heading">
          <p className="eyebrow">Main features</p>
          <h2>Everything needed for a clean result.</h2>
        </div>

        <div className="feature-grid">
          {/* map creates one card for every feature in the array above. */}
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-number">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
