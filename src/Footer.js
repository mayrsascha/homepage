import React from 'react';
import { Box } from "@chakra-ui/core";

function Contact() {
  return (
    <Box w="100vw">
      <p>Built with Netlify, Webpack, React and Chakra UI</p>
      <p>© {new Date().getFullYear()} Sascha Mayr. All rights reserved.</p>
    </Box>
  );
}

export default Contact;
