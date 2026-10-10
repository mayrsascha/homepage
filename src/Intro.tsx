import React from 'react';

const visitorName = 'visitorName'; // template variable — rendered literally as a cheeky nod

const Intro: React.FC = () => (
  <div className="Intro">
    <h1># Hello `{visitorName}`</h1>
    <p>
      <strong>Sascha Mayr</strong> — Software Engineer → Data Accuracy & Visualization
    </p>
    <p>
      Drinking too much coffee <span role="img" aria-label="coffee icon">☕️</span>.
    </p>

    <section className="featured-projects">
      <h2>Featured Projects</h2>
      <div className="project-grid">
        <article className="project-card">
          <h3><a href="https://shumi.ai/" target="_blank" rel="noopener noreferrer">Shumi</a></h3>
          <p className="project-role">Co-founder & Lead Developer</p>
          <p className="project-desc">Polished consumer product. Full-stack ownership: React, Node, PostgreSQL, AWS.</p>
        </article>
        <article className="project-card">
          <h3><a href="https://coinrotator.app/" target="_blank" rel="noopener noreferrer">CoinRotator</a></h3>
          <p className="project-role">Founder & Developer</p>
          <p className="project-desc">Crypto trading automation. Exchange integrations, real-time data pipelines, algorithmic execution.</p>
        </article>
        <article className="project-card">
          <h3><a href="https://cryptodesign.club/" target="_blank" rel="noopener noreferrer">Crypto Design Club</a></h3>
          <p className="project-role">Co-founder & Developer</p>
          <p className="project-desc">Design community & resources for crypto builders. Content platform, community tooling.</p>
        </article>
        <article className="project-card">
          <h3><a href="https://www.theta.health/" target="_blank" rel="noopener noreferrer">Wayfinder Health</a></h3>
          <p className="project-role">Lead Data Engineer</p>
          <p className="project-desc">Therapist network data integrity, compliance-heavy pipelines, visualization. References on request.</p>
        </article>
        <article className="project-card">
          <h3><a href="https://cutt.ly/1arVt8y" target="_blank" rel="noopener noreferrer">Aqua Scala</a></h3>
          <p className="project-role">Founder & Developer</p>
          <p className="project-desc">Water quality intelligence platform. Geospatial data, public health impact, educational tech.</p>
        </article>
        <article className="project-card">
          <h3><a href="https://cutt.ly/1arVt8y" target="_blank" rel="noopener noreferrer">Is water safe to drink in...?</a></h3>
          <p className="project-role">Founder & Developer</p>
          <p className="project-desc">Public water safety lookup. Open data aggregation, geospatial visualization, consumer education.</p>
        </article>
        <article className="project-card">
          <h3><a href="https://github.com/RubyMoney/money" target="_blank" rel="noopener noreferrer">Ruby Money</a></h3>
          <p className="project-role">Contributor</p>
          <p className="project-desc">Currency precision, locale-aware formatting, open financial data standards.</p>
        </article>
      </div>
    </section>

    <section className="professional-profiles">
      <h2>Professional Profiles</h2>
      <ul>
        <li><a href="https://app.usebraintrust.com/talent/7111/" target="_blank" rel="noopener noreferrer">Braintrust</a></li>
        <li><a href="https://stackoverflow.com/users/1864315/sascha-mayr?tab=profile" target="_blank" rel="noopener noreferrer">Stack Overflow</a></li>
        <li><a href="https://github.com/mayrsascha" target="_blank" rel="noopener noreferrer">GitHub</a></li>
      </ul>
    </section>

    <section className="personal-profiles">
      <h2>Personal Profiles</h2>
      <ul>
        <li><a href="https://cutt.ly/IarVG4E" target="_blank" rel="noopener noreferrer">Twitter</a></li>
        <li><a href="https://www.instagram.com/sascha.lives" target="_blank" rel="noopener noreferrer">Instagram</a></li>
        <li><a href="mailto:mayr.sascha@gmail.com">Email</a></li>
      </ul>
    </section>
  </div>
);

export default Intro;