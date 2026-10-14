import './base.css';
import './App.css';
import './Hero.css';
import './Footer.css';

// The page is static HTML (index.html). This module only owns the theme:
// the inline pre-paint script sets html.js-dark before first paint; here we
// wire the toggle button and follow OS theme changes.
const root = document.documentElement;

const setDarkMode = (dark: boolean) => {
  root.classList.toggle('js-dark', dark);
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = dark ? '#1d1f21' : '#fdf6e3';
  localStorage.setItem('darkMode', String(dark));
};

document.querySelector('.Footer .button')?.addEventListener('click', () => {
  setDarkMode(!root.classList.contains('js-dark'));
});

window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  setDarkMode(e.matches);
});

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
