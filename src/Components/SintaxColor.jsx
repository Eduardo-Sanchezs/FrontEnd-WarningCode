import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodePreview = ({ code }) => {
  return (
    <SyntaxHighlighter language="java" style={vs2015} showLineNumbers>
      {code}
    </SyntaxHighlighter>
  );
};
