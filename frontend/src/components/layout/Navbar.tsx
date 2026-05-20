import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTimezone } from '@/context/TimezoneContext';
import { TIMEZONES } from '@/features/charts/utils';
import NotificationBell from '@/components/common/NotificationBell';

export default function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const themeCtx = useTheme();
  const { timezone, setTimezone } = useTimezone();
  const [menuOpen, setMenuOpen] = useState(false);

  const segments = pathname.split('/').filter(Boolean);
  const isTicker =
    segments.length === 1 &&
    /^[A-Z]{1,5}$/.test(segments[0].toUpperCase()) &&
    ![
      'ADMIN',
      'GRAPH',
      'THREAT-INTEL',
      'SOCIALS',
      'INTELLIGENCE',
      'CYBER-NEWS',
      'EVENTS',
      'SEC-ARCHIVE',
      'RESEARCH',
    ].includes(segments[0].toUpperCase());
  const ticker = isTicker ? segments[0].toUpperCase() : null;

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        Cyber Stock Intelligence
      </Link>

      {user && (
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span className={`navbar-hamburger-icon${menuOpen ? ' open' : ''}`} />
        </button>
      )}

      <div className={`navbar-nav${menuOpen ? ' navbar-nav--open' : ''}`}>
        {user && (
          <Link to="/" className="navbar-nav-link" onClick={closeMenu}>
            Companies
          </Link>
        )}
        {user && (
          <Link to="/threat-intel" className="navbar-nav-link" onClick={closeMenu}>
            Threat Intel
          </Link>
        )}
        {user && (
          <Link to="/socials" className="navbar-nav-link" onClick={closeMenu}>
            Socials
          </Link>
        )}
        {user && (
          <Link to="/intelligence" className="navbar-nav-link" onClick={closeMenu}>
            Intelligence
          </Link>
        )}
        {user && (
          <Link to="/cyber-news" className="navbar-nav-link" onClick={closeMenu}>
            Cyber News
          </Link>
        )}
        {user && (
          <Link to="/events" className="navbar-nav-link" onClick={closeMenu}>
            Events
          </Link>
        )}
        {user && (
          <Link to="/sec-archive" className="navbar-nav-link" onClick={closeMenu}>
            SEC Archive
          </Link>
        )}
        {user && (
          <a
            href={`http://localhost:3000/api-docs?token=${localStorage.getItem('auth_token') ?? ''}`}
            target="_blank"
            rel="noreferrer"
            className="navbar-nav-link"
            onClick={closeMenu}
          >
            API Docs
          </a>
        )}
      </div>

      {ticker && (
        <>
          <span className="navbar-sep">/</span>
          <span className="navbar-ticker">{ticker}</span>
        </>
      )}

      {user && (
        <div className="navbar-user">
          {themeCtx && (
            <button
              className="navbar-theme-toggle"
              onClick={themeCtx.toggle}
              title={themeCtx.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {themeCtx.theme === 'dark' ? '☀' : '☽'}
            </button>
          )}
          <select
            className="navbar-tz-select"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            title="Display timezone"
          >
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <NotificationBell />
          <span className="navbar-username">{String(user.username ?? user.email)}</span>
          {user.role === 'admin' && (
            <>
              <span className="navbar-role">admin</span>
              <Link to="/admin" className="navbar-logout">
                Admin
              </Link>
            </>
          )}
          <UserButton />
        </div>
      )}
    </nav>
  );
}
