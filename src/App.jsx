import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop.jsx";
import Landing from "./pages/Landing.jsx";
import Upload from "./pages/Upload.jsx";
import Processing from "./pages/Processing.jsx";
import Download from "./pages/Download.jsx";
import About from "./pages/About.jsx";

function App() {
  return (
    <BrowserRouter>
      {/* Return to the top whenever the user opens another page. */}
      <ScrollToTop />

      {/* Each route connects a URL to one page component. */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/processing" element={<Processing />} />
        <Route path="/download" element={<Download />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
