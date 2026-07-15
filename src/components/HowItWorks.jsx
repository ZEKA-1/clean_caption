const steps = [
  ["1", "Upload", "Choose a supported video from your device."],
  ["2", "Process", "The system detects words, adds beeps and blurs the mouth."],
  ["3", "Download", "Preview and download the cleaned video."],
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="section page-shell">
      <div className="section-heading">
        <p className="eyebrow">How it works</p>
        <h2>Three simple steps.</h2>
      </div>

      <div className="steps-grid">
        {/* Each step uses the same card design to keep the page consistent. */}
        {steps.map(([number, title, text]) => (
          <article className="step-card" key={number}>
            <span className="step-number">{number}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;
