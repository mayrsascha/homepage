import React, { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/tomorrow-night.css';

import "./Hero.css"
import Intro from "./Intro.js"

hljs.registerLanguage('markdown', markdown);

function Hero() {
  const mdRef = useRef(null);
  useEffect(() => {
    hljs.highlightBlock(mdRef.current);
  });
  return (
    <div className="Hero">
      <pre ref={mdRef}>
        <code className="markdown" dangerouslySetInnerHTML={{ __html: Intro }}>
        </code>
      </pre>
    </div>
  );
}

export default Hero;
