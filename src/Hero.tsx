import './Hero.css';
import IntroHighlighted from './Intro.highlighted';

function Hero() {
  return (
    <div className="Hero">
      <pre className="markdown hljs">
        <code className="markdown hljs" dangerouslySetInnerHTML={{ __html: IntroHighlighted }} />
      </pre>
    </div>
  );
}

export default Hero;