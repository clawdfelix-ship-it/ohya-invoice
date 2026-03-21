const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

// Extract JS content (lines 240-894)
const allLines = html.split('\n');
const jsLines = allLines.slice(239, 894); // 0-indexed
const jsContent = jsLines.join('\n');

// Save to temp file to avoid eval issues
fs.writeFileSync('/tmp/test_js.js', jsContent);
console.log('Saved JS to /tmp/test_js.js, length:', jsContent.length);

// Try running it with node --check
const { execSync } = require('child_process');
try {
  execSync('node --check /tmp/test_js.js', { encoding: 'utf8' });
  console.log('✅ No syntax errors');
} catch(e) {
  console.log('❌ Syntax error:');
  console.log(e.stdout);
  console.log(e.stderr);
  
  // Find the error line from stderr
  const match = e.stderr.match(/(\d+):(\d+)/);
  if (match) {
    const lineNum = parseInt(match[1]) - 1;
    console.log('\nProblematic line:');
    console.log(jsLines[lineNum]);
    console.log('\nContext (lines', lineNum-2, 'to', lineNum+2, '):');
    console.log(jsLines.slice(Math.max(0, lineNum-2), lineNum+3).join('\n'));
  }
}
