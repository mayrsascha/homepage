import React from 'react';
import { Box, Code, Text } from "@chakra-ui/core";

function Hero() {
  return (
    <Box w="100vw" h="100vh">
      <Box bgImage="url('./profile.jpg')" bgPos="center" bgRepeat="no-repeat">
        <Code fontSize="2xl">Hello {"{visitorName}"}</Code>
        <Text as="h1" fontSize="5xl">My name is Sascha Mayr</Text>
        <Text fontSize="3xl">Full Stack Web Dev</Text>
      </Box>
    </Box>
  );
}

export default Hero;
