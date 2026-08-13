const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dist, { recursive: true });
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, '<!DOCTYPE html><html><head><title>Cognix</title></head><body></body></html>');
}

const dllSrc = path.join(__dirname, 'target', 'release', 'WebView2Loader.dll');
const dllDest = path.join(dist, 'WebView2Loader.dll');
if (fs.existsSync(dllSrc) && !fs.existsSync(dllDest)) {
  fs.copyFileSync(dllSrc, dllDest);
}
