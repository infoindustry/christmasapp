// Depth map for a page illustration (Depth Anything V2 Small, runs locally via ONNX).
import { pipeline, env } from '@huggingface/transformers';
import sharp from 'sharp';
env.cacheDir = './work/models';
const [src, out] = [process.argv[2], process.argv[3]];
const depth = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small');
const { depth: d } = await depth(src);           // d: RawImage, 8-bit, bright = near
const { width, height } = await sharp(src).metadata();
await sharp(Buffer.from(d.data), { raw: { width: d.width, height: d.height, channels: d.channels } })
  .resize(width, height).greyscale().png().toFile(out);
console.log('depth saved', out, d.width + 'x' + d.height);
