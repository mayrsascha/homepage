import { useState, useEffect } from 'react';

const useDarkMode = (): [boolean, (mode: boolean) => void] => {
  let initialMode = false;
  const localStorageMode = localStorage.getItem('darkMode');
  if (localStorageMode) {
    initialMode = localStorageMode === 'true';
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    initialMode = true;
  }
  const [darkMode, setDarkMode] = useState<boolean>(initialMode);
  const setMode = (mode: boolean) => {
    setDarkMode(mode);
    localStorage.setItem('darkMode', String(mode));
  };
  const darkModeCheck = (e: MediaQueryListEvent) => { e.matches ? setMode(true) : setMode(false); };
  useEffect(() => {
    if (window.matchMedia) {
      const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      try {
        darkMediaQuery.addEventListener('change', darkModeCheck);
      } catch (e) {
        // Safari
        darkMediaQuery.addListener(darkModeCheck);
      }

      return () => {
        try {
          darkMediaQuery.removeEventListener('change', darkModeCheck);
        } catch (e) {
          // Safari
          darkMediaQuery.removeListener(darkModeCheck);
        }
      };
    }
  }, []);

  return [darkMode, setMode];
};

export default useDarkMode;