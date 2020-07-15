import { useState, useEffect } from 'react';

export default () => {
    let initialMode = false;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initialMode = true;
    }
    const [darkMode, setDarkMode] = useState(initialMode);
    const darkModeCheck = (e) => { e.matches ? setDarkMode(true) : setDarkMode(false); }
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

    return [darkMode, setDarkMode];
}