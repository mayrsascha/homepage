import React from 'react';

function Hero() {
  return (
    <div w="100vw" h="100vh">
      <div bgImage="url('./profile.jpg')" bgPos="center" bgRepeat="no-repeat">
        <div fontSize="2xl">Hello {"{visitorName}"}</div>
        <h1 as="h1" fontSize="5xl">My name is Sascha Mayr</h1>
        <p fontSize="3xl">Full Stack Web Dev</p>
      </div>
    </div>
  );
}

export default Hero;
