import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';
import { UserButton } from '@clerk/react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTimezone } from '@/context/TimezoneContext';
import { TIMEZONES } from '@/features/charts/utils';
import NotificationBell from '@/components/common/feedback/NotificationBell';

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
      'INTEL',
      'THREAT-INTEL',
      'SOCIALS',
      'INTELLIGENCE',
      'CYBER-NEWS',
      'EVENTS',
      'SEC-ARCHIVE',
      'EDGAR-ARCHIVE',
      'INSIDERS',
      'LEADERBOARD',
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
          <Link to="/intel" className="navbar-nav-link" onClick={closeMenu}>
            Intel
          </Link>
        )}
        {user && (
          <Link to="/events" className="navbar-nav-link" onClick={closeMenu}>
            Events
          </Link>
        )}
        {user && (
          <Link to="/edgar-archive" className="navbar-nav-link" onClick={closeMenu}>
            EDGAR Archive
          </Link>
        )}
        {user && (
          <Link to="/insiders" className="navbar-nav-link" onClick={closeMenu}>
            Insiders
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
              <Link to="/admin" className="navbar-logout">
                <span className="navbar-role">Admin</span>
                {/* Admin */}
              </Link>
            </>
          )}
          <UserButton />
        </div>
      )}
    </nav>
  );
}
