const http = require('http');

http.get('http://localhost:3000/start2', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    
    // Check if verticals section exists
    const hasVerticalsSection = html.includes('id="verticals"');
    console.log('Has #verticals section:', hasVerticalsSection);
    
    // Check SVG lines count and classes
    const branchLinesMuted = (html.match(/s2-branch-line-muted/g) || []).length;
    const branchLinesActive = (html.match(/s2-branch-line-active/g) || []).length;
    const totalBranchLines = branchLinesMuted + branchLinesActive;
    console.log('Muted branch lines:', branchLinesMuted);
    console.log('Active branch lines:', branchLinesActive);
    console.log('Total branch lines (expected 6):', totalBranchLines);

    // Check hub port dots count
    const hubDotsMuted = (html.match(/s2-branch-hub-dot-muted/g) || []).length;
    const hubDotsActive = (html.match(/s2-branch-hub-dot-active/g) || []).length;
    const totalHubDots = hubDotsMuted + hubDotsActive;
    console.log('Muted hub dots:', hubDotsMuted);
    console.log('Active hub dots:', hubDotsActive);
    console.log('Total hub dots (expected 6):', totalHubDots);

    // Check orbit rings
    const orbitOuter = html.includes('s2-orbit-outer');
    const orbitInner = html.includes('s2-orbit-inner');
    console.log('Orbit rings present:', orbitOuter && orbitInner);

    // Check 6 store profile buttons
    const nodePills = (html.match(/s2-tree-node-pill/g) || []).length;
    console.log('Store profile pills count (expected 6):', nodePills);

    // Check beauty coordinates
    const hasBeauty = html.includes('Beauty &amp; Skincare') || html.includes('Beauty & Skincare');
    console.log('Has Beauty & Skincare profile:', hasBeauty);

    if (totalBranchLines === 6 && totalHubDots === 6 && nodePills === 6) {
      console.log('\n>>> SUCCESS: All 6 connectors and anchor ports are solidly configured in DOM and permanently present! <<<');
    } else {
      console.log('\n>>> WARNING: Mismatch in expected elements <<<');
    }
  });
}).on('error', err => {
  console.error('HTTP Error:', err.message);
});
