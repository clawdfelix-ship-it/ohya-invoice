import { useEffect, useState } from 'react';

export default function Home() {
  const [html, setHtml] = useState('');
  
  useEffect(() => {
    fetch('/index.html')
      .then(r => r.text())
      .then(html => {
        // Inject into DOM
        document.open();
        document.write(html);
        document.close();
      })
      .catch(err => {
        console.error('Failed to load:', err);
        document.body.innerHTML = '<div style="padding:20px;color:#ff6b6b">Failed to load page</div>';
      });
  }, []);
  
  return null;
}
