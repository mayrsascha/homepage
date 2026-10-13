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

  useEffect(() => {
    // hydrateRoot: if the real image finished loading before hydration
    // attached React's onLoad, catch up here so the fade-in still happens.
    const real = document.querySelector<HTMLImageElement>('.profile-real');
    if (real && real.complete && !real.classList.contains('loaded')) {
      real.classList.add('loaded');
    }
  }, []);

  return (
    <div className={`App ${darkMode ? 'darkmode' : ''}`}>
      <main className="content">
        <Hero />
        <div className="profile">
          {/* Cross-fade stack: placeholder paints underneath; the real image
              overlays at opacity:0 and fades in on load. Neither src changes
              after parse, so no load-order race can flash. Survives the React
              remount because the onload handler is on the img itself. */}
          <div className="profile-stack">
            <img className="profile-placeholder" src="/profile-lqip.webp" alt="" aria-hidden="true" width="500" height="750" decoding="async" />
            <img
              className="profile-real"
              src="/profile.webp"
              alt="Profile"
              width="500"
              height="750"
              decoding="async"
              onLoad={(e) => e.currentTarget.classList.add('loaded')}
            />
          </div>
        </div>
      </main>
      <Footer darkMode={darkMode} setDarkMode={setDarkMode} />
    </div>
  );
}

export default App;