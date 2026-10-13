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
    // LQIP -> real image swap (same as the pre-paint script does for the
    // skeleton img). Runs once on mount; the swap is idempotent.
    const img = document.querySelector<HTMLImageElement>('.profile img[data-src]');
    if (!img) return;
    const real = new Image();
    real.onload = () => { img.src = img.getAttribute('data-src')!; img.removeAttribute('data-src'); };
    real.src = img.getAttribute('data-src')!;
  }, []);

  return (
    <div className={`App ${darkMode ? 'darkmode' : ''}`}>
      <main className="content">
        <Hero />
        <div className="profile">
          {/* Mid-res placeholder (profile-lqip.webp, ~5KB, same composition as
              the full image) paints first; swaps to the real WebP via data-src
              once downloaded. No blur: the placeholder is close enough to the
              final image that the swap is imperceptible. */}
          <img src="/profile-lqip.webp" data-src="/profile.webp" alt="Profile" width="500" height="750" />
        </div>
      </main>
      <Footer darkMode={darkMode} setDarkMode={setDarkMode} />
    </div>
  );
}

export default App;