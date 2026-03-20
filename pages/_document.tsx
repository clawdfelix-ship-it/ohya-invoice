import { Html, Head, Main, NextScript } from 'next/document';
import { readFileSync } from 'fs';
import { join } from 'path';

export default function Document() {
  return (
    <Html lang="zh-HK">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
