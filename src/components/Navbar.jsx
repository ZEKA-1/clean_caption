import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Upload, Menu, X } from "lucide-react";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);


  function handleHomeClick() {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <nav className="navbar page-shell" aria-label="Main navigation">
        <Link to="/" className="brand" onClick={handleHomeClick}>
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-c">C</span>
          </span>
          <span>CleanCaption</span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end onClick={handleHomeClick}>
            Home
          </NavLink>
          <a href="/#features">Features</a>
          <a href="/#how-it-works">How it works</a>
          <NavLink to="/about">About / FAQ</NavLink>
        </div>

        <div className="navbar-actions">
          <Link to="/upload" className="button button-small">
            <Upload size={18} strokeWidth={2.2} />
            <span className="upload-button-text">Upload a video</span>
          </Link>

          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="mobile-menu page-shell">
          <NavLink to="/" end onClick={handleHomeClick}>
            Home
          </NavLink>
          <a href="/#features" onClick={closeMenu}>Features</a>
          <a href="/#how-it-works" onClick={closeMenu}>How it works</a>
          <NavLink to="/about" onClick={closeMenu}>About / FAQ</NavLink>
        </div>
      )}
    </header>
  );
}

export default Navbar;
