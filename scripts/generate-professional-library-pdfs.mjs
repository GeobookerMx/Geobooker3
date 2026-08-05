import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceDir = path.join(root, 'docs', 'biblioteca-geobooker-2026');
const outputDir = path.join(root, 'public', 'biblioteca', 'pdfs');
const editorialDir = path.join(root, 'docs', 'biblioteca-geobooker-2026', 'pdfs');
const tempDir = path.join(os.tmpdir(), 'geobooker-library-pdf');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const downloadUrl = 'https://geobooker.com.mx/download';
const androidUrl = 'https://play.google.com/store/apps/details?id=com.geobooker.app&hl=es_MX';
const iosUrl = 'https://apps.apple.com/mx/app/geobooker-cerca-de-ti/id6758590506';

const documents = [
  ['00', 'punto-de-partida-geobooker', '00-presentacion-editorial-biblioteca-geobooker-2026.md', 'El punto de partida Geobooker', 'Presentación editorial de la Biblioteca Geobooker 2026', 'Fundamentos editoriales', 'book'],
  ['01', 'liderar-sin-cargo', '01-liderazgo-en-pequena-escala.md', 'Liderar sin cargo', 'Liderazgo en pequeña escala', 'Operación y capital humano', 'people'],
  ['02', 'radiografia-del-negocio', '02-como-diagnosticar-el-estado-actual-de-un-negocio.md', 'Radiografía del negocio', 'Cómo diagnosticar el estado actual de un negocio', 'Diagnóstico', 'chart'],
  ['03', 'abrir-con-criterio', '03-antes-de-abrir-un-negocio-decisiones-que-debes-tomar.md', 'Abrir con criterio', 'Antes de abrir un negocio: decisiones que debes tomar', 'Guía para abrir', 'compass'],
  ['04', 'encontrar-al-cliente-correcto', '04-cliente-ideal-ubicacion-y-demanda-local.md', 'Encontrar al cliente correcto', 'Cliente ideal, ubicación y demanda local', 'Marketing local', 'target'],
  ['05', 'numeros-que-sostienen', '05-finanzas-basicas-para-negocios-locales.md', 'Números que sostienen', 'Finanzas básicas para negocios locales', 'Finanzas y control', 'finance'],
  ['06', 'ordenar-la-operacion', '06-operacion-diaria-procesos-y-control.md', 'Ordenar la operación', 'Operación diaria, procesos y control', 'Operación', 'settings'],
  ['07', 'vender-atender-y-regresar', '07-ventas-atencion-y-seguimiento-al-cliente.md', 'Vender, atender y regresar', 'Ventas, atención y seguimiento al cliente', 'Ventas y servicio', 'handshake'],
  ['08', 'aparecer-donde-el-cliente-busca', '08-marketing-local-y-visibilidad-digital.md', 'Aparecer donde el cliente busca', 'Marketing local y visibilidad digital', 'Marketing local', 'pin'],
  ['09', 'confianza-que-se-puede-ver', '09-reputacion-resenas-y-confianza.md', 'Confianza que se puede ver', 'Reputación, reseñas y confianza', 'Reputación', 'shield'],
  ['10', 'negocio-que-puede-durar', '10-sostenibilidad-del-negocio-local.md', 'Negocio que puede durar', 'Sostenibilidad del negocio local', 'Estrategia, riesgo y futuro', 'leaf'],
  ['11', 'construir-sin-romperse', '11-psicologia-del-constructor-de-negocios.md', 'Construir sin romperse', 'Psicología del constructor de negocios', 'Capital humano evolutivo', 'brain']
].map(([no, slug, file, title, subtitle, collection, icon]) => ({ no, slug, file, title, subtitle, collection, icon }));

for (const directory of [outputDir, editorialDir, tempDir]) fs.mkdirSync(directory, { recursive: true });

const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const logo = dataUri(path.join(root, 'public', 'images', 'geobooker-logo-horizontal.png'), 'image/png');
const fonts = [400, 600, 700, 800, 900].map((weight) => ({
  weight,
  uri: dataUri(path.join(root, 'public', 'fonts', `nunito-sans-${weight}.ttf`), 'font/ttf')
}));

const escapeHtml = (value = '') => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const inline = (value) => escapeHtml(value)
  .replace(/_{3,}/g, '<span class="answer-line"></span>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.+?)\*/g, '<em>$1</em>')
  .replace(/`(.+?)`/g, '<code>$1</code>')
  .replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');

const icons = {
  book: '<path d="M5 4.5h8a3 3 0 0 1 3 3V20H8a3 3 0 0 0-3 3V4.5Z"/><path d="M27 4.5h-8a3 3 0 0 0-3 3V20h8a3 3 0 0 1 3 3V4.5Z"/>',
  people: '<circle cx="12" cy="10" r="4"/><circle cx="23" cy="11" r="3"/><path d="M4 26c0-5 3-8 8-8s8 3 8 8M20 20c4-1 8 1 8 6"/>',
  chart: '<path d="M5 27V5M5 27h23"/><path d="m9 22 5-6 5 3 7-10"/><circle cx="9" cy="22" r="1.5"/><circle cx="26" cy="9" r="1.5"/>',
  compass: '<circle cx="16" cy="16" r="12"/><path d="m21 10-3 8-8 3 3-8 8-3Z"/>',
  target: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="2"/>',
  finance: '<path d="M6 25h20M9 22V12M16 22V6M23 22V15"/><path d="m8 8 6-4 6 3 7-4"/>',
  settings: '<circle cx="16" cy="16" r="5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3"/>',
  handshake: '<path d="m4 17 6-7 6 2 6-2 6 7-9 9-4-3-3 2-8-8Z"/><path d="m10 10 5 6 4-4"/>',
  pin: '<path d="M16 29s10-8 10-17a10 10 0 1 0-20 0c0 9 10 17 10 17Z"/><circle cx="16" cy="12" r="3"/>',
  shield: '<path d="M16 3 27 7v8c0 7-5 12-11 14C10 27 5 22 5 15V7l11-4Z"/><path d="m10 16 4 4 8-9"/>',
  leaf: '<path d="M27 5C14 5 6 11 6 21c7 2 17-1 21-16Z"/><path d="M7 26c4-8 10-12 17-16"/>',
  brain: '<path d="M13 27H9a5 5 0 0 1-3-9 5 5 0 0 1 2-9 6 6 0 0 1 11-2 6 6 0 0 1 7 6 5 5 0 0 1 0 9 5 5 0 0 1-7 4"/><path d="M16 7v20M10 12c3 0 5 2 6 4M22 12c-3 0-5 2-6 4"/>'
};
const iconSvg = (name) => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;

function markdownToHtml(source) {
  const lines = source.split(/\r?\n/);
  const out = [];
  let list = null;
  let table = false;
  const closeList = () => { if (list) out.push(`</${list}>`); list = null; };
  const closeTable = () => { if (table) out.push('</tbody></table></div>'); table = false; };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const value = line.trim();
    if (!value) { closeList(); closeTable(); continue; }
    if (/^---+$/.test(value)) { closeList(); closeTable(); continue; }
    const heading = value.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { closeList(); closeTable(); const level = Math.min(4, heading[1].length + 1); out.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue; }
    if (value.startsWith('|') && value.endsWith('|')) {
      closeList();
      const cells = value.slice(1, -1).split('|').map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      if (!table) { out.push('<div class="table-wrap"><table><tbody>'); table = true; }
      out.push(`<tr>${cells.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`);
      continue;
    }
    closeTable();
    const bullet = value.match(/^[-*+]\s+(.+)$/);
    const numbered = value.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      const wanted = bullet ? 'ul' : 'ol';
      if (list !== wanted) { closeList(); out.push(`<${wanted}>`); list = wanted; }
      let item = (bullet || numbered)[1];
      const checkbox = /^\[ \]\s*/.test(item);
      item = item.replace(/^\[ \]\s*/, '');
      out.push(`<li${checkbox ? ' class="check"' : ''}>${checkbox ? '<span class="check-box" aria-hidden="true"></span>' : ''}${inline(item)}</li>`);
      continue;
    }
    closeList();
    if (value.startsWith('>')) out.push(`<blockquote>${inline(value.replace(/^>\s?/, ''))}</blockquote>`);
    else if (/^\*\*[^*]+:\*\*/.test(value)) out.push(`<p class="meta">${inline(value)}</p>`);
    else out.push(`<p>${inline(value)}</p>`);
  }
  closeList(); closeTable();
  return out.join('\n');
}

function cleanMarkdownForPrint(source) {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstSeparator = lines.findIndex((line) => /^---+$/.test(line.trim()));
  const start = firstSeparator >= 0 && firstSeparator < 16 ? firstSeparator + 1 : 0;
  const cleaned = [];
  let skippedTitle = false;
  let skippedSubtitle = false;
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+Portada Editorial\s*$/i.test(line.trim())) continue;
    if (!skippedTitle && /^#\s+/.test(line)) { skippedTitle = true; continue; }
    if (skippedTitle && !skippedSubtitle && /^##\s+/.test(line)) { skippedSubtitle = true; continue; }
    if (/^---+$/.test(line.trim())) continue;
    cleaned.push(line);
  }
  return cleaned.join('\n').replace(/^\s+/, '');
}

const fontFaces = fonts.map(({ weight, uri }) => `@font-face{font-family:'Nunito Sans';font-style:normal;font-weight:${weight};src:url('${uri}') format('truetype');}`).join('');
const baseCss = `${fontFaces}
@page{size:letter;margin:18mm 17mm 21mm}*{box-sizing:border-box}html,body{margin:0;color:#20243a;font-family:'Nunito Sans',sans-serif;font-size:10.2pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:#555bc4;text-decoration:none}.cover{height:242mm;margin:-18mm -17mm -21mm;padding:21mm 19mm 17mm;position:relative;overflow:hidden;background:linear-gradient(145deg,#fff9d9 0%,#fff 43%,#eef0ff 100%);break-after:page}.cover:before{content:'';position:absolute;width:180mm;height:180mm;border:22mm solid rgba(85,91,196,.09);border-radius:50%;right:-85mm;top:-75mm}.cover:after{content:'';position:absolute;width:90mm;height:90mm;background:rgba(233,51,83,.08);border-radius:50%;left:-45mm;bottom:-38mm}.brand{width:60mm;height:auto;position:relative;z-index:1}.edition{margin-top:18mm;display:flex;align-items:center;gap:7mm;color:#555bc4;font-size:9pt;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.doc-icon{width:23mm;height:23mm;border-radius:7mm;background:#555bc4;color:#f4d32a;padding:5mm;box-shadow:0 4mm 12mm rgba(85,91,196,.22)}.doc-icon svg{width:100%;height:100%}.cover h1{position:relative;z-index:1;margin:15mm 0 4mm;max-width:155mm;color:#232143;font-size:34pt;line-height:1.02;letter-spacing:-.035em}.cover .subtitle{position:relative;z-index:1;max-width:142mm;color:#555d72;font-size:16pt;font-weight:700;line-height:1.35}.cover-bottom{position:absolute;z-index:1;left:19mm;right:19mm;bottom:18mm;display:flex;align-items:flex-end;justify-content:space-between;border-top:1px solid rgba(35,33,67,.18);padding-top:6mm}.cover-bottom strong{display:block;color:#555bc4;font-size:10pt}.cover-bottom span{display:block;color:#73798c;font-size:8.5pt}.seal{border:1px solid rgba(85,91,196,.3);border-radius:99px;padding:2.5mm 5mm;background:rgba(255,255,255,.76);color:#555bc4;font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:.1em}.running-footer{position:fixed;left:0;right:0;bottom:-14mm;height:9mm;border-top:.35mm solid #daddea;background:#fff;display:flex;align-items:center;justify-content:space-between;color:#74798b;font-size:7.5pt}.running-footer img{width:25mm}.content{padding-top:1mm}.content h2,.content h3,.content h4{color:#29275f;line-height:1.2;break-after:avoid}.content h2{font-size:22pt;margin:10mm 0 4mm;border-bottom:1.2mm solid #f4d32a;padding-bottom:2.5mm}.content h3{font-size:15pt;margin:8mm 0 3mm}.content h4{font-size:11.5pt;margin:6mm 0 2mm;color:#555bc4}.content p{margin:0 0 3mm;orphans:3;widows:3}.content .meta{margin:0 0 1mm;color:#5c6275;font-size:9pt}.content strong{color:#29275f}.content ul,.content ol{padding-left:7mm;margin:2mm 0 5mm}.content li{padding-left:1mm;margin:0 0 1.7mm;break-inside:avoid}.content li::marker{color:#555bc4;font-weight:900}.content li.check{list-style:none;display:flex;gap:2mm;margin-left:-5mm}.content .check-box{flex:0 0 4mm;width:4mm;height:4mm;border:.35mm solid #555bc4;border-radius:1mm;margin-top:.6mm;background:#fff}.answer-line{display:inline-block;width:100%;min-width:28mm;height:5mm;border-bottom:.35mm solid #aeb3c4;vertical-align:bottom}.content blockquote{margin:5mm 0;padding:4.5mm 5mm;border-left:1.5mm solid #555bc4;border-radius:0 4mm 4mm 0;background:#f2f3ff;color:#2f315c;font-weight:700;break-inside:avoid}.content hr{border:0;border-top:.3mm solid #dfe1ea;margin:7mm 0}.table-wrap{margin:4mm 0 6mm;break-inside:avoid;overflow:hidden;border:1px solid #d9dce8;border-radius:3mm}.content table{width:100%;border-collapse:collapse;font-size:8.3pt}.content td{padding:2.2mm;border-right:1px solid #e2e4ec;border-bottom:1px solid #e2e4ec;vertical-align:top}.content tr:first-child td{background:#302d68;color:#fff;font-weight:800}.cta{height:242mm;margin:-18mm -17mm -21mm;padding:24mm 20mm 18mm;background:linear-gradient(145deg,#25234f,#555bc4 64%,#777de3);color:#fff;break-before:page;position:relative;overflow:hidden}.cta:after{content:'';position:absolute;width:120mm;height:120mm;border:18mm solid rgba(244,211,42,.14);border-radius:50%;right:-45mm;bottom:-60mm}.cta img{width:54mm;filter:brightness(0) invert(1)}.cta .phone{width:23mm;height:23mm;margin-top:20mm;padding:5mm;border-radius:7mm;background:#f4d32a;color:#302d68}.cta .phone svg{width:100%;height:100%}.cta h2{max-width:145mm;margin:8mm 0 5mm;font-size:31pt;line-height:1.05}.cta p{max-width:145mm;color:#e8e9ff;font-size:13pt}.store-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:11mm;max-width:150mm}.store{display:block;border:1px solid rgba(255,255,255,.25);border-radius:5mm;background:rgba(255,255,255,.1);padding:5mm;color:#fff}.store strong{display:block;font-size:13pt}.store span{display:block;margin-top:1mm;color:#dfe1ff;font-size:8.5pt}.download-hub{display:inline-block;margin-top:7mm;border-radius:99px;background:#f4d32a;color:#29275f;padding:3mm 6mm;font-weight:900}.cta-footer{position:absolute;left:20mm;bottom:18mm;font-size:8pt;color:#dfe1ff}.cta-footer strong{color:#fff}`;

function htmlDocument(meta, markdown) {
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><title>${escapeHtml(meta.title)} | Geobooker</title><style>${baseCss}</style></head><body>
  <section class="cover"><img class="brand" src="${logo}" alt="Geobooker"><div class="edition"><div class="doc-icon">${iconSvg(meta.icon)}</div><span>Biblioteca de Negocios · Documento ${meta.no}</span></div><h1>${escapeHtml(meta.title)}</h1><p class="subtitle">${escapeHtml(meta.subtitle)}</p><div class="cover-bottom"><div><strong>${escapeHtml(meta.collection)}</strong><span>Edición profesional · Agosto 2026 · geobooker.com.mx</span></div><div class="seal">Revisión editorial</div></div></section>
  <footer class="running-footer"><img src="${logo}" alt="Geobooker"><span>Biblioteca Geobooker 2026 · ${escapeHtml(meta.title)}</span></footer>
  <main class="content">${markdownToHtml(markdown)}</main>
  <section class="cta"><img src="${logo}" alt="Geobooker"><div class="phone">${iconSvg('pin')}</div><h2>Lleva Geobooker contigo.</h2><p>Descubre negocios cercanos, administra tu perfil, consulta la Biblioteca y continúa tomando decisiones con mayor criterio desde tu teléfono.</p><div class="store-grid"><a class="store" href="${androidUrl}"><strong>Google Play</strong><span>Descargar para Android</span></a><a class="store" href="${iosUrl}"><strong>App Store</strong><span>Descargar para iPhone</span></a></div><a class="download-hub" href="${downloadUrl}">geobooker.com.mx/download</a><div class="cta-footer"><strong>Geobooker</strong> · Cerca de ti · Biblioteca de Negocios 2026</div></section>
  </body></html>`;
}

function printPdf(name, html, destinations) {
  const htmlPath = path.join(tempDir, `${name}.html`);
  const pdfPath = path.join(outputDir, `${name}.pdf`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  const url = `file:///${htmlPath.replaceAll('\\', '/')}`;
  const result = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files', `--user-data-dir=${path.join(tempDir, 'chrome-profile')}`, `--print-to-pdf=${pdfPath}`, url], { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0 || !fs.existsSync(pdfPath)) throw new Error(`No se pudo generar ${name}.pdf\n${result.stderr}`);
  for (const destination of destinations) fs.copyFileSync(pdfPath, destination);
  return { name, bytes: fs.statSync(pdfPath).size };
}

const results = [];
for (const doc of documents) {
  const markdown = fs.readFileSync(path.join(sourceDir, doc.file), 'utf8');
  const name = `${doc.no}-${doc.slug}`;
  results.push(printPdf(name, htmlDocument(doc, cleanMarkdownForPrint(markdown)), [path.join(editorialDir, `${name}.pdf`)]));
}

const compiledMeta = { no: '00–11', title: 'Biblioteca Geobooker 2026', subtitle: 'La biblioteca para construir negocios con criterio', collection: 'Edición completa', icon: 'book' };
const compiledMarkdown = documents.map((doc) => `# ${doc.title}\n\n## ${doc.subtitle}\n\n${cleanMarkdownForPrint(fs.readFileSync(path.join(sourceDir, doc.file), 'utf8'))}`).join('\n\n');
const compiledName = 'biblioteca-geobooker-2026-edicion-profesional';
results.push(printPdf(compiledName, htmlDocument(compiledMeta, compiledMarkdown), [
  path.join(root, 'public', 'biblioteca', `${compiledName}.pdf`),
  path.join(sourceDir, `${compiledName}.pdf`)
]));

console.log(JSON.stringify({ generated: results.length, files: results }, null, 2));
