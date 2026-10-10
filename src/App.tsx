import useDarkMode from './usedarkmode';
import Hero from './Hero';
import Footer from './Footer';

import './App.css';

function App() {
  const [darkMode, setDarkMode] = useDarkMode();
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