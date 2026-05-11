import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import NotificationBell from "../molecules/NotificationBell.jsx";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const isTicker = segments.length === 1 && /^[A-Z]{1,5}$/.test(segments[0].toUpperCase())
    && !["ADMIN"].includes(segments[0].toUpperCase());
  const ticker = isTicker ? segments[0].toUpperCase() : null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>Cyber Stock Intelligence</Link>

      {user && (
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span className={`navbar-hamburger-icon${menuOpen ? " open" : ""}`} />
        </button>
      )}

      <div className={`navbar-nav${menuOpen ? " navbar-nav--open" : ""}`}>
        {user && <Link to="/" className="navbar-nav-link" onClick={closeMenu}>Companies</Link>}
        {user && <Link to="/threat-intel" className="navbar-nav-link" onClick={closeMenu}>Threat Intel</Link>}
        {user && <Link to="/socials" className="navbar-nav-link" onClick={closeMenu}>Socials</Link>}
        {user && <Link to="/intelligence" className="navbar-nav-link" onClick={closeMenu}>Intelligence</Link>}
        {user && <a href={`http://localhost:3000/api-docs?token=${localStorage.getItem("auth_token") ?? ""}`} target="_blank" rel="noreferrer" className="navbar-nav-link" onClick={closeMenu}>API Docs</a>}
      </div>

      {ticker && (
        <>
          <span className="navbar-sep">/</span>
          <span className="navbar-ticker">{ticker}</span>
        </>
      )}

      {user && (
        <div className="navbar-user">
          <button className="navbar-theme-toggle" onClick={toggle} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? "☀" : "☽"}
          </button>
          <NotificationBell />
          <span className="navbar-username">{user.username}</span>
          {user.role === "admin" && (
            <>
              <span className="navbar-role">admin</span>
              <Button variant="ghost" asChild className="navbar-logout">
                <Link to="/admin">Admin</Link>
              </Button>
            </>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      )}
    </nav>
  );
}
