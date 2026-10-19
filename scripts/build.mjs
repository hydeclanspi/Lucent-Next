import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const SITE = 'https://hydeclanspi.github.io/Lucent-Next/';
const exists = file => access(file).then(() => true, () => false);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// The site: the product (src/) at the root, and the demos beside it — the concept film, the on-device
// recording and the motion atelier. Published URLs do not depend on the repository layout: /, /film/,
// /device/, /atelier/.
const SITE_MAP = [['src', ''], ['demo/film', 'film'], ['demo/device', 'device'], ['demo/atelier', 'atelier']];
for (const [from, to] of SITE_MAP) {
  if (await exists(path.join(root, from))) await cp(path.join(root, from), path.join(output, to), { recursive: true });
}
await cp(path.join(root, 'docs/llms.txt'), path.join(output, 'llms.txt'));
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
await writeFile(path.join(output, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ['', 'film/', 'device/', 'atelier/'].map(page => `  <url><loc>${SITE}${page}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log('Built dist/ — ready for static hosting.');
