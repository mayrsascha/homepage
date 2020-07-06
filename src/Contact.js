import React, { useState } from 'react';
import { IoLogoGithub, IoIosCode, IoIosMail, IoIosRocket, IoLogoTwitter } from 'react-icons/io';

function Contact() {
  const [emailHidden, setEmailHidden] = useState(true);

  return (
    <div w="100vw" h="100vh">
      <h2 fontSize="4xl">Find me on the web</h2>
      <ul spacing={3}>
        <li>
          <IoLogoGithub/>
          <a href="https://github.com/mayrsascha">GitHub</a>
        </li>
        <li>
          <IoIosCode/>
          <a href="https://stackoverflow.com/users/story/1864315">Stack Overflow</a>
        </li>
        <li>
          <IoLogoTwitter/>
          <a href="https://twitter.com/realsidehacker">Twitter</a>
        </li>
        <li>
          <IoIosRocket/>
          <a href="https://www.toptal.com/resume/sascha-mayr">TopTal</a>
        </li>
        <li>
          <IoIosMail/>
          { emailHidden ? (
            <button onClick={() => setEmailHidden(false)}>Show email</button>
          ) : (
            <a href="mailto:mayr.sascha@gmail.com">mayr.sascha@gmail.com</a>
          )}
        </li>
      </ul>
    </div>
  );
}

export default Contact;
