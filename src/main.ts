import './style.css';

// The page is static HTML (index.html). This module only owns the theme:
// the inline pre-paint script sets html.js-dark before first paint; here we
// wire the toggle button and follow OS theme changes.
const root = document.documentElement;
const KEY = 'darkMode';

// localStorage can throw (blocked storage, some private modes): the theme
// then simply isn't remembered.
const stored = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

const applyTheme = (dark: boolean) => {
  root.classList.toggle('js-dark', dark);
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content = dark ? '#1d1f21' : '#fdf6e3';
};

// A click is an explicit choice: apply and remember it.
document.querySelector('.Footer .button')?.addEventListener('click', () => {
  const dark = !root.classList.contains('js-dark');
  applyTheme(dark);
  try { localStorage.setItem(KEY, String(dark)); } catch { /* not remembered */ }
});

// OS theme changes only apply while the visitor hasn't chosen one.
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (stored() === null) applyTheme(e.matches);
});

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
