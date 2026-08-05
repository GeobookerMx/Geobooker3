import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Layers3,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import SEO from '../../components/SEO';
import BrandLogo from '../../components/common/BrandLogo';
import AppQRCode from '../../components/common/AppQRCode';
import {
  downloadLinks,
  getLibraryDocumentBySlug,
  getLibraryDocumentDownloadPath,
  getLibraryDocumentPdfPath,
  libraryDocuments
} from '../../features/biblioteca/libraryContent';
import { APP_LINKS, buildTrackedDownloadUrl } from '../../config/appLinks';

const renderInline = (text) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const cleanMarkdownForReading = (source) => {
  const lines = String(source || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const firstSeparator = lines.findIndex((line) => /^---+$/.test(line.trim()));
  const start = firstSeparator >= 0 && firstSeparator < 16 ? firstSeparator + 1 : 0;
  const cleaned = [];
  let skippedTitle = false;
  let skippedSubtitle = false;

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (/^##\s+Portada Editorial\s*$/i.test(trimmed)) continue;
    if (!skippedTitle && /^#\s+/.test(line)) { skippedTitle = true; continue; }
    if (skippedTitle && !skippedSubtitle && /^##\s+/.test(line)) { skippedSubtitle = true; continue; }
    if (/^---+$/.test(trimmed)) continue;
    cleaned.push(line);
  }

  return cleaned.join('\n').replace(/^\s+/, '');
};

function MarkdownReader({ sourcePath }) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    fetch(sourcePath)
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo cargar el documento.');
        return response.text();
      })
      .then((text) => {
        if (!cancelled) {
          setContent(cleanMarkdownForReading(text));
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [sourcePath]);

  if (status === 'loading') {
    return (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 shadow-sm">
        Cargando capítulo...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-8 text-center text-sm font-bold text-red-700 shadow-sm">
        No se pudo cargar la lectura interna. Usa el boton de abrir el documento completo.
      </div>
    );
  }

  return <div className="biblioteca-reader rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-8">{renderMarkdown(content)}</div>;
}

const renderMarkdown = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const nodes = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={i} className="h-3" />);
      continue;
    }

    if (trimmed === '---') {
      nodes.push(<hr key={i} className="my-8 border-slate-200" />);
      continue;
    }

    if (trimmed.startsWith('|')) {
      const tableLines = [];
      let cursor = i;
      while (cursor < lines.length && lines[cursor].trim().startsWith('|')) {
        tableLines.push(lines[cursor].trim());
        cursor += 1;
      }
      i = cursor - 1;

      const rows = tableLines
        .filter((row) => !/^\|?\s*:?[-]+/.test(row.replace(/\|/g, '').trim()))
        .map((row) => row.split('|').map((cell) => cell.trim()).filter(Boolean));
      const [head = [], ...body] = rows;

      nodes.push(
        <div key={i} className="my-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            {head.length > 0 && (
              <thead className="bg-slate-950 text-white">
                <tr>{head.map((cell, idx) => <th key={idx} className="px-4 py-3 font-black">{renderInline(cell)}</th>)}</tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100 bg-white">
              {body.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, idx) => <td key={idx} className="px-4 py-3 align-top text-slate-700">{renderInline(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('# ')) {
      nodes.push(<h1 key={i} className="mb-4 mt-2 text-4xl font-black leading-tight text-slate-950">{renderInline(trimmed.slice(2))}</h1>);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(<h2 key={i} className="mb-3 mt-9 text-3xl font-black leading-tight text-slate-950">{renderInline(trimmed.slice(3))}</h2>);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      nodes.push(<h3 key={i} className="mb-2 mt-7 text-xl font-black text-geoPurple">{renderInline(trimmed.slice(4))}</h3>);
      continue;
    }

    if (trimmed.startsWith('>')) {
      nodes.push(<blockquote key={i} className="my-5 rounded-2xl border-l-4 border-geoPurple bg-slate-50 p-5 text-lg font-bold text-slate-800">{renderInline(trimmed.replace(/^>\s?/, ''))}</blockquote>);
      continue;
    }

    if (/^- \[ \]/.test(trimmed)) {
      nodes.push(
        <div key={i} className="my-2 flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-slate-400 bg-white" />
          <span>{renderInline(trimmed.replace(/^- \[ \]\s*/, ''))}</span>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('- ')) {
      nodes.push(
        <div key={i} className="my-2 flex items-start gap-3 text-sm leading-7 text-slate-700">
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-geoPurple" />
          <span>{renderInline(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      nodes.push(<p key={i} className="my-2 text-sm font-bold leading-7 text-slate-700">{renderInline(trimmed)}</p>);
      continue;
    }

    nodes.push(<p key={i} className="my-3 text-base leading-8 text-slate-700">{renderInline(trimmed)}</p>);
  }

  return nodes;
};

const qualityBlocks = [
  {
    icon: CheckCircle2,
    title: 'Checklist accionable',
    text: 'Cada documento incluye listas de revisión para pasar de lectura a acción.'
  },
  {
    icon: HelpCircle,
    title: 'Preguntas de reflexión',
    text: 'El lector puede revisar decisiones, riesgos, prioridades y siguientes pasos.'
  },
  {
    icon: FileText,
    title: 'Respuestas de trabajo',
    text: 'Incluye espacios para completar el caso propio antes de invertir o ejecutar.'
  },
  {
    icon: ShieldCheck,
    title: 'Aviso responsable',
    text: 'El contenido informa y orienta, sin sustituir asesoría profesional especializada.'
  }
];

export default function BibliotecaDocumentPage() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');
  const doc = getLibraryDocumentBySlug(slug);

  if (!doc) return <Navigate to="/biblioteca" replace />;

  const Icon = doc.icon || BookOpen;
  const currentIndex = libraryDocuments.findIndex((item) => item.slug === doc.slug);
  const previous = currentIndex > 0 ? libraryDocuments[currentIndex - 1] : null;
  const next = currentIndex < libraryDocuments.length - 1 ? libraryDocuments[currentIndex + 1] : null;
  const sourcePath = getLibraryDocumentDownloadPath(doc);
  const pdfPath = getLibraryDocumentPdfPath(doc);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: `${doc.editorialName} - Biblioteca Geobooker 2026`,
    headline: doc.title,
    description: doc.summary,
    inLanguage: ['es-MX'],
    isPartOf: {
      '@type': 'CreativeWorkSeries',
      name: 'Biblioteca Geobooker 2026',
      url: 'https://geobooker.com.mx/biblioteca'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Geobooker',
      url: 'https://geobooker.com.mx'
    },
    educationalUse: ['business education', 'entrepreneurship', 'local business guidance'],
    learningResourceType: ['guide', 'checklist', 'workbook'],
    url: 'https://geobooker.com.mx/biblioteca/' + doc.slug,
    mainEntityOfPage: 'https://geobooker.com.mx/biblioteca/' + doc.slug,
    encoding: {
      '@type': 'MediaObject',
      contentUrl: 'https://geobooker.com.mx' + pdfPath,
      encodingFormat: 'application/pdf'
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f1e6] text-slate-950">
      <SEO
        title={`${doc.editorialName} | Biblioteca Geobooker`}
        description={doc.summary}
        image="/images/geobooker-og-image.png"
        url={`/biblioteca/${doc.slug}`}
        alternateUrls={{
          'es-MX': 'https://geobooker.com.mx/biblioteca/' + doc.slug,
          'x-default': 'https://geobooker.com.mx/biblioteca/' + doc.slug
        }}
        keywords={[doc.title, doc.editorialName, doc.collection, ...doc.tags, 'Geobooker Biblioteca 2026']}
        breadcrumbs={[
          { name: 'Geobooker', item: '/' },
          { name: 'Biblioteca Geobooker', item: '/biblioteca' },
          { name: doc.editorialName, item: `/biblioteca/${doc.slug}` }
        ]}
        structuredData={structuredData}
      />

      <section className="relative overflow-hidden border-b border-slate-900/10 bg-[linear-gradient(135deg,#fff7d1_0%,#f6f1e6_45%,#e6fbf3_100%)]">
        <div className="absolute -right-16 top-10 h-72 w-72 rounded-full border-[32px] border-geoPurple/10" />
        <div className="absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-geoYellow/40 blur-2xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
          <Link
            to="/biblioteca"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-x-1 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {isEnglish ? 'Back to Library' : 'Volver a Biblioteca'}
          </Link>

          <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-geoYellow">Doc. {doc.no}</span>
                <span className="rounded-full border border-geoPurple/30 bg-white/80 px-4 py-2 text-sm font-black text-geoPurple">{doc.collection}</span>
                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">{doc.status}</span>
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-none tracking-tight text-slate-950 md:text-7xl">
                {doc.editorialName}
              </h1>
              <p className="mt-5 max-w-3xl text-xl font-bold leading-8 text-slate-700">{doc.title}</p>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{doc.summary}</p>
            </div>

            <div className="rounded-[2rem] border border-slate-900/10 bg-white p-6 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-geoYellow">
                  <Icon className="h-8 w-8" />
                </div>
                <BrandLogo size={52} />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {doc.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-6 grid gap-3">
                <a
                  href={pdfPath}
                  download
                  type="application/pdf"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-geoPurple px-5 py-3 font-black text-white shadow-lg transition hover:bg-slate-950"
                >
                  <Download className="h-5 w-5" />
                  {isEnglish ? 'Download professional PDF' : 'Descargar PDF profesional'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {qualityBlocks.map((block) => {
            const BlockIcon = block.icon;
            return (
              <article key={block.title} className="rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-sm">
                <BlockIcon className="h-8 w-8 text-geoPurple" />
                <h2 className="mt-4 text-xl font-black">{block.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{block.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-geoPurple">Lectura interna del capítulo</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{doc.editorialName}</h2>
          </div>
        </div>
        <div className="mb-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm biblioteca-print-cover md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-geoPurple">Biblioteca Geobooker 2026</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">{doc.editorialName}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{doc.title}</p>
            </div>
            <BrandLogo size={64} />
          </div>
          <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            {isEnglish
              ? 'Educational material for entrepreneurs and local businesses. It does not replace specialized legal, tax, financial or professional advice.'
              : 'Material educativo para emprendedores y negocios locales. No sustituye asesoría legal, fiscal, financiera o profesional especializada.'}
          </p>
        </div>
        <MarkdownReader sourcePath={sourcePath} />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 md:px-8 print:hidden">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <div className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-900">
                Geobooker App
              </div>
              <h2 className="mt-4 text-3xl font-black text-slate-950">{isEnglish ? 'Download Geobooker and keep learning.' : 'Descarga Geobooker y continúa aprendiendo.'}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {isEnglish
                  ? 'Use the app to explore businesses, claim listings, practice with Emprende and return to the Library from your phone.'
                  : 'Usa la app para explorar negocios, reclamar perfiles, practicar con Emprende y volver a la Biblioteca desde tu celular.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-black">
                <a href={APP_LINKS.androidStoreUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-slate-950 px-5 py-3 text-white transition hover:bg-geoPurple">Google Play</a>
                <a href={APP_LINKS.iosStoreUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border-2 border-slate-950 px-5 py-3 text-slate-950 transition hover:bg-slate-100">App Store</a>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-[1.5rem] bg-slate-50 p-6">
              <AppQRCode
                size={148}
                value={buildTrackedDownloadUrl({
                  platform: 'generic',
                  source: 'qr',
                  medium: 'biblioteca_documento',
                  campaign: 'biblioteca_2026',
                  target: 'hub',
                })}
                label={isEnglish ? 'Scan to download' : 'Escanea para descargar'}
                subtitle={isEnglish ? 'Android, iPhone and PWA' : 'Android, iPhone y PWA'}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-14 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <div className="inline-flex rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-900">
              {isEnglish ? 'Professional reading mode' : 'Modo lectura profesional'}
            </div>
            <h2 className="mt-5 text-3xl font-black md:text-5xl">
              {isEnglish ? 'A professional edition ready to use.' : 'Una edición profesional lista para usarse.'}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              {isEnglish
                ? 'Each chapter includes brand typography, vector iconography, an editorial footer and a final app download invitation.'
                : 'Cada capítulo incluye tipografía de marca, iconografía vectorial, footer editorial y una invitación final para descargar la app.'}
            </p>
          </div>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-6">
            <h3 className="text-xl font-black">{isEnglish ? 'Complete edition downloads' : 'Descarga de edición completa'}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {isEnglish
                ? 'One clear download: the complete professional PDF edition.'
                : 'Una sola descarga clara: la edición profesional completa en PDF.'}
            </p>
            <div className="mt-5">
              <a href={downloadLinks.pdf} download type="application/pdf" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-geoYellow px-5 py-3 font-black text-slate-950">
                <Download className="h-5 w-5" />
                {isEnglish ? 'Download complete PDF' : 'Descargar PDF completo'}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-geoPurple">
              <Sparkles className="h-4 w-4" />
              {isEnglish ? 'Continue reading' : 'Continuar lectura'}
            </div>
            <h2 className="mt-2 text-2xl font-black">
              {next ? next.editorialName : isEnglish ? 'You reached the end of this edition.' : 'Llegaste al final de esta edición.'}
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {previous && (
              <Link to={`/biblioteca/${previous.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 px-5 py-3 font-black text-slate-950">
                <ArrowLeft className="h-5 w-5" />
                Doc. {previous.no}
              </Link>
            )}
            {next && (
              <Link to={`/biblioteca/${next.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">
                <Layers3 className="h-5 w-5" />
                Doc. {next.no}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
