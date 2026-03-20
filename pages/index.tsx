import { GetStaticProps, NextPage } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';
import Head from 'next/head';

interface Props {
  html: string;
  css: string;
}

const Page: NextPage<Props> = ({ html, css }) => {
  return (
    <>
      <Head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </Head>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
};

export default Page;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const filePath = join(process.cwd(), 'public', 'index.html');
  const htmlContent = readFileSync(filePath, 'utf-8');
  
  // Extract CSS from <style> tags
  const cssMatch = htmlContent.match(/<style>([\s\S]*?)<\/style>/);
  const css = cssMatch ? cssMatch[1] : '';
  
  // Strip DOCTYPE, html, head, body tags
  const innerHtml = htmlContent
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head>[\s\S]*<\/head>/i, '')
    .replace(/<style>[\s\S]*?<\/style>/i, '') // Remove inline styles from HTML
    .replace(/<body>/i, '')
    .replace(/<\/body>/i, '');
  
  return { props: { html: innerHtml, css } };
};
