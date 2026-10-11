import { useEffect } from 'react';
import useDarkMode from './usedarkmode';
import Hero from './Hero';
import Footer from './Footer';

import './App.css';

declare global {
  interface HTMLLinkElement {
    disabled: boolean;
  }
}

function App() {
  const [darkMode, setDarkMode] = useDarkMode();

  useEffect(() => {
    const light = document.getElementById('hljs-light') as HTMLLinkElement | null;
    const dark = document.getElementById('hljs-dark') as HTMLLinkElement | null;
    if (light) light.disabled = darkMode;
    if (dark) dark.disabled = !darkMode;
    // The pre-paint script adds js-dark for OS-dark users; once React owns
    // the theme (.App.darkmode), drop it so toggling back to light works.
    document.documentElement.classList.remove('js-dark');
  }, [darkMode]);

  return (
    <div className={`App ${darkMode ? 'darkmode' : ''}`}>
      <main className="content">
        <Hero />
        <div className="profile">
          <picture>
            <source srcSet="/profile.webp" type="image/webp" />
            <img src="/profile.png" alt="Profile" />
          </picture>
        </div>
      </main>
      <Footer darkMode={darkMode} setDarkMode={setDarkMode} />
    </div>
  );
}

export default App;