import React from 'react';
import "./Footer.css"

function Footer(props) {
  return (
    <footer className="Footer">
      <div>
        <p>Built with Netlify, Webpack and React</p>
        <p>© {new Date().getFullYear()} Sascha Mayr. All rights reserved.</p>
      </div>
      <button className="button" onClick={() => {props.darkMode ? props.setDarkMode(false) : props.setDarkMode(true)} }>
        { props.darkMode ? "🌞" : "🌙" }
      </button>
    </footer>
  );
}

export default Footer;
