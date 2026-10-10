import Helmet from 'react-helmet';
import useDarkMode from './usedarkmode';
import Hero from './Hero';
import Footer from './Footer';

import './App.css';

function App() {
  const [darkMode, setDarkMode] = useDarkMode();
  return (
    <div className={`App ${darkMode ? 'darkmode' : ''}`}>
      <Helmet
        link={[
          {
            rel: 'stylesheet',
            href: '//cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.1/build/styles/solarized-light.min.css',
            disabled: darkMode,
          },
          {
            rel: 'stylesheet',
            href: '//cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.1/build/styles/tomorrow-night.min.css',
            disabled: !darkMode,
          },
        ]}
      />
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