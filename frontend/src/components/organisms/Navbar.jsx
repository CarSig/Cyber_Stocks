import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/react";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationBell from "../molecules/NotificationBell.jsx";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const segments = pathname.split("/").filter(Boolean);
  const isTicker = segments.length === 1 && /^[A-Z]{1,5}$/.test(segments[0].toUpperCase())
    && !["ADMIN"].includes(segments[0].toUpperCase());
  const ticker = isTicker ? segments[0].toUpperCase() : null;

  return (
    <nav className="navbar">
      <div className="navbar-nav">
        {user && <Link to="/" className="navbar-nav-link">Companies</Link>}
        {user && <Link to="/threat-intel" className="navbar-nav-link">Threat Intel</Link>}
        {user && <Link to="/socials" className="navbar-nav-link">Socials</Link>}
        {user && <Link to="/intelligence" className="navbar-nav-link">Intelligence</Link>}
      </div>
      {ticker && (
        <>
          <span className="navbar-sep">/</span>
          <span className="navbar-ticker">{ticker}</span>
        </>
      )}
      {user && (
        <div className="navbar-user">
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
