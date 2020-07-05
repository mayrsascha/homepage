import React, { useState } from 'react';
import { Box, Button, Text, Link, List, ListItem, ListIcon } from "@chakra-ui/core";
import { IoLogoGithub, IoIosCode, IoIosMail, IoIosRocket, IoLogoTwitter } from 'react-icons/io';

function Contact() {
  const [emailHidden, setEmailHidden] = useState(true);

  return (
    <Box w="100vw" h="100vh">
      <Text as="h2" fontSize="4xl">Find me on the web</Text>
      <List spacing={3}>
        <ListItem>
          <ListIcon icon={IoLogoGithub} />
          <Link href="https://github.com/mayrsascha">GitHub</Link>
        </ListItem>
        <ListItem>
          <ListIcon icon={IoIosCode} />
          <Link href="https://stackoverflow.com/users/story/1864315">Stack Overflow</Link>
        </ListItem>
        <ListItem>
          <ListIcon icon={IoLogoTwitter} />
          <Link href="https://twitter.com/realsidehacker">Twitter</Link>
        </ListItem>
        <ListItem>
          <ListIcon icon={IoIosRocket} />
          <Link href="https://www.toptal.com/resume/sascha-mayr">TopTal</Link>
        </ListItem>
        <ListItem>
          <ListIcon icon={IoIosMail} />
          { emailHidden ? (
            <Button onClick={() => setEmailHidden(false)}>Show email</Button>
          ) : (
            <Link href="mailto:mayr.sascha@gmail.com">mayr.sascha@gmail.com</Link>
          )}
        </ListItem>
      </List>
    </Box>
  );
}

export default Contact;
