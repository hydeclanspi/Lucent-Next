import { cp, mkdir, rm, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const SITE = 'https://hydeclanspi.github.io/lucent/';
const exists = file => access(file).then(() => true, () => false);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// The product (index.html, assets/, web/) and the motion atelier are the whole site.
for (const entry of ['index.html', 'assets', 'web', 'atelier']) {
  if (await exists(path.join(root, entry))) await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
await cp(path.join(root, 'docs/llms.txt'), path.join(output, 'llms.txt'));
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
await writeFile(path.join(output, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ['', 'atelier/'].map(page => `  <url><loc>${SITE}${page}</loc></url>`).join('\n') + '\n</urlset>\n');
console.log('Built dist/ — ready for static hosting.');
