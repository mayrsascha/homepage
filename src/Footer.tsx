import './Footer.css';

interface FooterProps {
  darkMode: boolean;
  setDarkMode: (mode: boolean) => void;
}

function Footer({ darkMode, setDarkMode }: FooterProps) {
  return (
    <footer className="Footer">
      <div>
        <p>Built with Netlify, Vite and React</p>
        <p>© {new Date().getFullYear()} Sascha Mayr. All rights reserved.</p>
      </div>
      {/* Both icons render in every theme — no src swap on toggle/load.
          Theme styling comes from CSS keyed off html.js-dark. */}
      <button
        className="button"
        onClick={() => { darkMode ? setDarkMode(false) : setDarkMode(true) }}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <span className="icon-moon">🌙</span>
        <span className="icon-sun">☀️</span>
      </button>
      <a href="https://github.com/mayrsascha/homepage" target="_blank" rel="noopener noreferrer" className="github-link">
        <img src="/github.png" alt="github" width="30" height="30" />
      </a>
    </footer>
  );
}

export default Footer;