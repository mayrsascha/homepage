import React from 'react';
import "./Footer.css"

function Footer() {
  return (
    <footer className="Footer">
      <p>Built with Netlify, Webpack and React</p>
      <p>© {new Date().getFullYear()} Sascha Mayr. All rights reserved.</p>
    </footer>
  );
}

export default Footer;
