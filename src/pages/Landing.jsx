import Navbar from "../components/Navbar.jsx";
import Hero from "../components/Hero.jsx";
import UploadBox from "../components/UploadBox.jsx";
import Comparison from "../components/Comparison.jsx";
import Features from "../components/Features.jsx";
import HowItWorks from "../components/HowItWorks.jsx";
import Footer from "../components/Footer.jsx";

function Landing() {
  return (
    <>
      {/* The landing page combines all public sections in order. */}
      <Navbar />

      <main>
        <Hero />

        <section className="section page-shell">
          <UploadBox />
        </section>

        <Comparison />
        <Features />
        <HowItWorks />
      </main>

      <Footer />
    </>
  );
}

export default Landing;
