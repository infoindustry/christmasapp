// Tiny local receiver for portrait.html: saves POSTed PNGs to work/portraits/<id>.png (run, then open /portrait.html)
import http from 'node:http'; import fs from 'node:fs';
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const id = new URL(req.url, 'http://x').searchParams.get('id'); const chunks = [];
  req.on('data', c => chunks.push(c)); req.on('end', () => { fs.writeFileSync(`work/portraits/${id}.png`, Buffer.from(Buffer.concat(chunks).toString().split(',')[1], 'base64')); console.log('saved', id); res.end('ok'); });
}).listen(5175, () => console.log('listening on 5175'));
