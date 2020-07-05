import React from 'react';
import { ThemeProvider, CSSReset } from '@chakra-ui/core'
import customTheme from "./theme"
import Hero from './Hero';
import Projects from './Projects';
import Contact from './Contact';
import Footer from './Footer';

function App() {
  return (
    <div>
      <ThemeProvider theme={customTheme}>
        <CSSReset />
        <Hero/>
        <Projects/>
        <Contact/>
        <Footer/>
      </ThemeProvider>
    </div>
  );
}

export default App;
