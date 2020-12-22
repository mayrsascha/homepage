import { useState, useEffect } from 'react';

const useDarkMode = () => {
    let initialMode = false;
    const localStorageMode = localStorage.getItem('darkMode');
    if (localStorageMode) {
        initialMode = localStorageMode === 'true';
    } else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialMode = true;
    }
    const [darkMode, setDarkMode] = useState(initialMode);
    const setMode = (mode) => {
        setDarkMode(mode);
        localStorage.setItem('darkMode', mode);
    }
    const darkModeCheck = (e) => { e.matches ? setMode(true) : setMode(false); }
    useEffect(() => {
        if (window.matchMedia) {
            const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            try {
                darkMediaQuery.addEventListener('change', darkModeCheck);
            } catch(e) {
                // Safari
                darkMediaQuery.addListener(darkModeCheck);
            }

            return () => {
            try {
                darkMediaQuery.removeEventListener('change', darkModeCheck);
            } catch(e) {
                // Safari
                darkMediaQuery.removeListener(darkModeCheck);
            }
            }
        }
    });

    return [darkMode, setMode];
}

export default useDarkMode;