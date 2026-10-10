declare module 'react-helmet' {
  import * as React from 'react';

  export interface HelmetProps {
    title?: string;
    titleTemplate?: string;
    defaultTitle?: string;
    base?: any;
    link?: any[];
    meta?: any[];
    noscript?: any[];
    onChangeClientState?: (newState: any, addedTags: any, removedTags: any) => void;
    script?: any[];
    style?: any[];
    htmlAttributes?: any;
    bodyAttributes?: any;
    titleAttributes?: any;
    encodeSpecialCharacters?: boolean;
    defer?: boolean;
  }

  class Helmet extends React.PureComponent<HelmetProps> {
    static renderStatic(): { helmet: any };
    static peek(): any;
    static rewind(): any;
  }

  export default Helmet;
}