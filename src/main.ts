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

const button = document.querySelector('.Footer .button');

const applyTheme = (dark: boolean) => {
  root.classList.toggle('js-dark', dark);
  button?.setAttribute('aria-pressed', String(dark));
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = dark ? '#1d1f21' : '#fdf6e3';
  });
};

// The button is a toggle: "Dark mode", pressed or not.
button?.setAttribute('aria-pressed', String(root.classList.contains('js-dark')));

const os = matchMedia('(prefers-color-scheme: dark)');

// A click is an explicit choice: apply and remember it. Choosing what the
// OS shows anyway forgets the choice, so the page follows the OS again.
button?.addEventListener('click', () => {
  const dark = !root.classList.contains('js-dark');
  applyTheme(dark);
  try {
    if (dark === os.matches) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(dark));
  } catch { /* not remembered */ }
});

// OS theme changes only apply while the visitor hasn't chosen one.
os.addEventListener('change', (e) => {
  if (stored() === null) applyTheme(e.matches);
});

// Keep other open tabs in step with a choice made here.
window.addEventListener('storage', (e) => {
  if (e.key === KEY || e.key === null) {
    const value = stored();
    applyTheme(value === null ? os.matches : value === 'true');
  }
});

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
