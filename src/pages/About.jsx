import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const questions = [
  [
    "Which formats are supported?",
    "The current interface accepts MP4, MOV, AVI and other common video formats.",
  ],
  [
    "Do users need an account?",
    "No. Users can upload, process and download a video without signing in.",
  ],
  [
    "How long does processing take?",
    "The final duration depends on the backend, video length and AI processing speed.",
  ],
  [
    "Are videos stored permanently?",
    "The storage policy will be defined by the backend team and displayed clearly.",
  ],
];

function About() {
  return (
    <>
      <Navbar />

      <main className="page-main page-shell">
        <section className="about-intro">
          <p className="eyebrow">About the project</p>
          <h1>CleanCaption makes video moderation easier.</h1>
          <p>
            Users upload a video, let the system censor offensive words, blur
            the speaker&apos;s mouth and download the processed result.
          </p>
        </section>

        <section className="faq-section">
          <h2>Frequently asked questions</h2>

          <div className="faq-list">
            {/* details creates a simple expandable answer without extra state. */}
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default About;
