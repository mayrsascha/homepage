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
      <button className="button" onClick={() => { darkMode ? setDarkMode(false) : setDarkMode(true) }}>
        { darkMode ? '☀️' : '🌙' }
      </button>
      <a href="https://github.com/mayrsascha/homepage" target="_blank" rel="noopener noreferrer" className="github-link">
        <img src={darkMode ? '/github-light.png' : '/github.png'} alt="github" />
      </a>
    </footer>
  );
}

export default Footer;