import { useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import markdown from 'highlight.js/lib/languages/markdown';

import './Hero.css';
import Intro from './Intro';

hljs.registerLanguage('markdown', markdown);

function Hero() {
  const mdRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (mdRef.current) {
      hljs.highlightBlock(mdRef.current);
    }
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