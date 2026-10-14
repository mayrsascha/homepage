import { useEffect } from 'react';
import useDarkMode from './usedarkmode';
import Hero from './Hero';
import Footer from './Footer';

import './App.css';

function App() {
  const [darkMode, setDarkMode] = useDarkMode();

  useEffect(() => {
    // Theme colors are CSS variables keyed off html.js-dark.
    // The pre-paint script sets it before first paint; React syncs it on toggle.
    document.documentElement.classList.toggle('js-dark', darkMode);
  }, [darkMode]);

  // NOTE: the real image's fade-in (html.profile-loaded) is wired by an inline script in
  // index.html (runs before React), NOT by React's onLoad. A single owner
  // avoids the skeleton/React handler divergence that broke hydration, and
  // addEventListener survives hydrateRoot adoption.

  return (
    <div className={darkMode ? 'App darkmode' : 'App'}>
      <main className="content">
        <Hero />
        <div className="profile">
          {/* Cross-fade stack: placeholder paints underneath; the real image
              overlays at opacity:0 and fades in on load (wired by the inline
              pre-React script). Neither src changes after parse — no
              load-order race can flash. */}
          <div className="profile-stack">
            <img className="profile-placeholder" src="/profile-lqip.webp" alt="" aria-hidden="true" width="500" height="750" decoding="async" />
            <img className="profile-real" src="/profile.webp" alt="Profile" width="500" height="750" decoding="async" />
          </div>
        </div>
      </main>
      <Footer darkMode={darkMode} setDarkMode={setDarkMode} />
    </div>
  );
}

export default App;