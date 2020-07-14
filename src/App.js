import React from 'react';
import Hero from './Hero';
import Footer from './Footer';

import "./App.css"

function App() {
  return (
    <div className="App">
      <main className="content">
        <Hero/>
        <img className="profile" src="/profile.png" alt="Profile photo"></img>
      </main>
      <Footer/>
    </div>
  );
}

export default App;
