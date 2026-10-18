// Receiver for usdz.html: saves POSTed binaries to public/usdz/<id>.usdz (run, then open /usdz.html)
import http from 'node:http'; import fs from 'node:fs';
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const id = new URL(req.url, 'http://x').searchParams.get('id'); const chunks = [];
  req.on('data', c => chunks.push(c)); req.on('end', () => { fs.writeFileSync(`public/usdz/${id}.usdz`, Buffer.concat(chunks)); console.log('saved', id); res.end('ok'); });
}).listen(5176, () => console.log('listening on 5176'));
