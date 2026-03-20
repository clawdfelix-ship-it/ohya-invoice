import { GetStaticProps, NextPage } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';

interface Props {
  html: string;
}

const Page: NextPage<Props> = ({ html }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default Page;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const filePath = join(process.cwd(), 'public', 'index.html');
  const html = readFileSync(filePath, 'utf-8');
  // Strip <!DOCTYPE>, <html>, <head>, <body> tags to avoid nesting issues
  const innerHtml = html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace(/<\/html>/i, '')
    .replace(/<head>[\s\S]*<\/head>/i, '')
    .replace(/<body>/i, '')
    .replace(/<\/body>/i, '');
  return { props: { html: innerHtml } };
};
