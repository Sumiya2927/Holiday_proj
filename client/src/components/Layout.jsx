import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X, Compass, Radio } from 'lucide-react';
import { getApiMode, onApiModeChange } from '../api/http';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [apiMode, setApiMode] = useState(() => getApiMode());
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    return onApiModeChange(mode => setApiMode(mode));
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="navbar">
        <div className="container nav-inner">
          <Link className="brand" to="/" aria-label="Build My Holiday home">
            <span className="brand-icon">
              <Compass size={23} />
            </span>
            <span>
              build my<span className="brand-light"> holiday</span>
              <i />
            </span>
          </Link>

          <button
            className="icon-button mobile-menu"
            aria-expanded={open}
            aria-controls="navigation"
            aria-label="Toggle menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>

          <nav id="navigation" className={open ? 'nav-links open' : 'nav-links'}>
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/plan">Plan Holiday</NavLink>
            <NavLink className="nav-booking" to="/find-booking">
              Find Booking <ArrowUpRight size={15} />
            </NavLink>

            {/* Mode badge for transparent development evaluation */}
            <span
              style={{
                fontSize: '10px',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '6px',
                background: apiMode === 'live' ? '#e8f7ee' : '#eff6f7',
                color: apiMode === 'live' ? '#16a34a' : 'var(--teal)',
                border: `1px solid ${apiMode === 'live' ? '#bfe4cc' : '#d2e4e7'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title={
                apiMode === 'live'
                  ? 'Connected to real backend API'
                  : 'Backend offline; running on full local catalog fixtures'
              }
            >
              <Radio size={11} />
              {apiMode === 'live' ? 'Live API' : 'Catalog Preview'}
            </span>
          </nav>
        </div>
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-top">
          <div>
            <Link to="/" className="brand">
              <Compass size={22} /> build my holiday.
            </Link>
            <p>Less planning. More possibilities.</p>
          </div>
          <nav aria-label="Footer">
            <Link to="/">Home</Link>
            <Link to="/plan">Plan Holiday</Link>
            <Link to="/find-booking">Find Booking</Link>
          </nav>
        </div>
        <div className="container footer-bottom">
          <span>Build My Holiday · Thoughtfully put together.</span>
          <span>Made for the journey, not just the destination.</span>
        </div>
      </footer>
    </>
  );
}
