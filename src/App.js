import React from 'react';
import Hero from './Hero';
import Footer from './Footer';

import "./App.css"

function App() {
  return (
    <div className="App">
      <main className="content">
        <Hero/>
        <div className="profile">
          <img src="/profile.png" alt="Profile"></img>
        </div>
      </main>
      <Footer/>
    </div>
  );
}

export default App;
