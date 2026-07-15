import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  // React Router gives us the current page address.
  const { pathname } = useLocation();

  useEffect(() => {
    // Move smoothly to the beginning whenever the address changes.
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  // This helper controls scrolling and does not display an element.
  return null;
}

export default ScrollToTop;
