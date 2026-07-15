import { Link } from "react-router-dom";

function Footer() {
  // Same reasoning as Navbar: clicking "Home" while already on "/"
  // doesn't trigger a navigation, so nothing scrolls by default.
  // Scrolling unconditionally here fixes that without needing to check
  // the current route.
  function handleHomeClick() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="footer">
      <div className="page-shell footer-content">
        {/* Footer brand summary. */}
        <div>
          <Link to="/" className="brand footer-brand" onClick={handleHomeClick}>
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-c">C</span>
            </span>
            <span>CleanCaption</span>
          </Link>
          <p>A simple front-end for safer video sharing.</p>
        </div>

        {/* Useful navigation links repeated at the bottom. */}
        <div className="footer-links">
          <Link to="/" onClick={handleHomeClick}>Home</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/about">About / FAQ</Link>
        </div>

        <p>© 2026 CleanCaption</p>
      </div>
    </footer>
  );
}

export default Footer;
