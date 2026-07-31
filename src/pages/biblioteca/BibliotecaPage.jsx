import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Globe2,
  Layers3,
  LibraryBig,
  LockKeyhole,
  MapPinned,
  PenTool,
  Sparkles
} from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import {
  downloadLinks,
  libraryAudiences,
  libraryDocuments,
  libraryStats,
  readingRoutes,
  upcomingDocuments
} from '../../features/biblioteca/libraryContent';

const Pill = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'border-slate-300 bg-white/100 text-slate-700',
    amber: 'border-amber-300 bg-amber-100 text-amber-900',
    emerald: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    cyan: 'border-cyan-300 bg-cyan-100 text-cyan-900'
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${tones[tone]}`}>
      {children}
    </span>
  );
};

const SectionHeader = ({ eyebrow, title, description }) => (
  <div className="mx-auto max-w-3xl text-center">
    <p className="text-sm font-black uppercase tracking-[0.28em] text-geoPurple">{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">{title}</h2>
    <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">{description}</p>
  </div>
);

export default function BibliotecaPage() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');

  useEffect(() => {
    document.title = isEnglish
      ? 'Geobooker Library 2026 | Business guides'
      : 'Biblioteca Geobooker 2026 | Guias de negocio';
  }, [isEnglish]);

  const copy = {
    heroBadge: isEnglish ? 'Editorial business knowledge center' : 'Centro editorial de conocimiento para negocios',
    heroTitle: isEnglish ? 'The business library for building with judgment.' : 'La biblioteca para construir negocios con criterio.',
    heroText: isEnglish
      ? 'A practical, structured and responsible guide for people who want to start, diagnose or improve a local business from idea to sustainable growth.'
      : 'Una guia practica, estructurada y responsable para quienes quieren abrir, diagnosticar o mejorar un negocio local desde la idea hasta el crecimiento sostenible.',
    downloadMd: isEnglish ? 'Download Markdown' : 'Descargar Markdown',
    downloadTxt: isEnglish ? 'Download TXT for Word' : 'Descargar TXT para Word',
    readRoute: isEnglish ? 'Reading routes' : 'Rutas de lectura',
    docs: isEnglish ? 'Base documents' : 'Documentos base',
    docsDesc: isEnglish
      ? 'The first editorial block is ready for review. Final PDF design, cover, logo lockup and non-editable files will come after approval.'
      : 'El primer bloque editorial esta listo para revision. El diseno final en PDF, portada, logotipo y archivos no editables vendran despues de aprobar contenido.',
    upcoming: isEnglish ? 'Next editorial block' : 'Siguiente bloque editorial',
    upcomingDesc: isEnglish
      ? 'These documents complete legal, AI, advertising, CRM and continuous improvement coverage.'
      : 'Estos documentos completan la cobertura legal, IA, publicidad, CRM y mejora continua.',
    ctaTitle: isEnglish ? 'Use the library with Geobooker tools.' : 'Usa la Biblioteca junto con las herramientas de Geobooker.',
    ctaText: isEnglish
      ? 'Explore businesses, claim your listing, practice decisions in Emprende and prepare stronger visibility before paying for advertising.'
      : 'Explora negocios, reclama tu perfil, practica decisiones en Emprende y prepara mejor tu visibilidad antes de pagar publicidad.',
    explore: isEnglish ? 'Explore Geobooker' : 'Explorar Geobooker',
    emprende: isEnglish ? 'Open Emprende' : 'Abrir Emprende',
    claim: isEnglish ? 'Claim a business' : 'Reclamar negocio'
  };

  return (
    <div className="min-h-screen bg-[#f6f1e6] text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-900/10 bg-[radial-gradient(circle_at_top_left,#f4d32a_0,#f4d32a_18%,transparent_38%),linear-gradient(135deg,#fff7d1_0%,#f6f1e6_45%,#dff7ef_100%)]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 opacity-40 md:block">
          <div className="absolute right-16 top-14 h-64 w-64 rounded-full border-[28px] border-geoPurple/20" />
          <div className="absolute bottom-12 right-40 h-36 w-36 rounded-full bg-geoPink/20 blur-xl" />
          <div className="absolute right-0 top-1/3 h-96 w-24 rounded-l-full bg-white/70" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-24">
          <div>
            <Pill tone="amber">{copy.heroBadge}</Pill>
            <div className="mt-7 flex items-center gap-4">
              <div className="rounded-3xl border border-slate-900/10 bg-white p-4 shadow-xl">
                <BrandLogo size={64} />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Geobooker 2026</p>
                <p className="text-lg font-black text-geoPurple">Biblioteca de Negocios</p>
              </div>
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-slate-950 md:text-7xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
              {copy.heroText}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={downloadLinks.text}
                download
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-geoPurple"
              >
                <Download className="h-5 w-5" />
                {copy.downloadTxt}
              </a>
              <a
                href={downloadLinks.markdown}
                download
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <FileText className="h-5 w-5" />
                {copy.downloadMd}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Pill tone="cyan">Metodo Geobooker</Pill>
                  <h2 className="mt-5 text-3xl font-black">Idea, negocio, confianza y futuro</h2>
                </div>
                <LibraryBig className="h-12 w-12 text-geoYellow" />
              </div>

              <div className="mt-7 grid gap-3">
                {[
                  ['Idea', 'Del impulso inicial a una decision validada.'],
                  ['Constructor', 'Psicologia, paciencia, energia y criterio.'],
                  ['Operacion', 'Procesos, finanzas, ventas y seguimiento.'],
                  ['Crecimiento', 'Visibilidad, reputacion, Ads, CRM y sostenibilidad.']
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="font-black text-geoYellow">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {libraryStats.map((stat) => (
                <div key={stat.value} className="rounded-3xl border border-slate-900/10 bg-white p-5 shadow-sm">
                  <p className="text-3xl font-black text-geoPurple">{stat.value}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">{isEnglish ? stat.labelEn : stat.labelEs}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {libraryAudiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <article key={audience.titleEs} className="rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <Icon className="h-9 w-9 text-geoPurple" />
                <h3 className="mt-5 text-xl font-black">{isEnglish ? audience.titleEn : audience.titleEs}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{isEnglish ? audience.textEn : audience.textEs}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <SectionHeader
            eyebrow={copy.readRoute}
            title={isEnglish ? 'Start where your business is.' : 'Empieza donde esta tu negocio.'}
            description={isEnglish
              ? 'The library is organized as a working method, not as random articles. Choose the path that matches your current stage.'
              : 'La Biblioteca esta organizada como metodo de trabajo, no como articulos sueltos. Elige la ruta que corresponde a tu etapa actual.'}
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {readingRoutes.map((route) => (
              <article key={route.titleEs} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-xl font-black">{isEnglish ? route.titleEn : route.titleEs}</h3>
                <div className="mt-5 space-y-3">
                  {(isEnglish ? route.itemsEn : route.itemsEs).map((item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-geoYellow text-sm font-black text-slate-950">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <SectionHeader
          eyebrow={copy.docs}
          title={isEnglish ? 'A serious first editorial edition.' : 'Una primera edicion editorial seria.'}
          description={copy.docsDesc}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {libraryDocuments.map((doc) => {
            const Icon = doc.icon;
            return (
              <article key={doc.no} className="group rounded-[1.75rem] border border-slate-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-geoYellow">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Doc. {doc.no}</span>
                </div>
                <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-geoPurple">{doc.collection}</p>
                <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">{doc.editorialName}</h3>
                <p className="mt-2 text-sm font-bold text-slate-500">{doc.title}</p>
                <p className="mt-4 text-sm leading-6 text-slate-600">{doc.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Checklist, preguntas y respuestas de trabajo
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Pill tone="cyan">{copy.upcoming}</Pill>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">{copy.upcomingDesc}</h2>
              <p className="mt-5 text-base leading-7 text-slate-300">
                {isEnglish
                  ? 'After approval, we can build category-specific editions for restaurants, workshops, pharmacies, beauty, logistics, suppliers and professional services.'
                  : 'Despues de aprobar esta base, podemos crear versiones por categoria: restaurantes, talleres, farmacias, belleza, logistica, proveedores y servicios profesionales.'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingDocuments.map((doc) => {
                const Icon = doc.icon;
                return (
                  <div key={doc.no} className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Icon className="h-7 w-7 text-geoYellow" />
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">Doc. {doc.no}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-black">{doc.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{doc.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-geoPurple via-slate-950 to-geoPink p-1 shadow-2xl">
          <div className="rounded-[1.85rem] bg-white p-8 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Pill tone="emerald">PDF-ready</Pill>
                  <Pill tone="amber">PWA Library</Pill>
                  <Pill tone="slate">Editorial review</Pill>
                </div>
                <h2 className="mt-6 text-3xl font-black md:text-5xl">{copy.ctaTitle}</h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{copy.ctaText}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-geoPurple">
                    <MapPinned className="h-5 w-5" />
                    {copy.explore}
                  </Link>
                  <Link to="/emprende" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-950 px-5 py-3 font-black text-slate-950 transition hover:bg-slate-100">
                    <Layers3 className="h-5 w-5" />
                    {copy.emprende}
                  </Link>
                  <Link to="/claim" className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-geoPurple px-5 py-3 font-black text-geoPurple transition hover:bg-geoPurple hover:text-white">
                    <ArrowRight className="h-5 w-5" />
                    {copy.claim}
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-3">
                  <LockKeyhole className="h-7 w-7 text-geoPurple" />
                  <h3 className="text-xl font-black">{isEnglish ? 'Editorial and legal note' : 'Nota editorial y legal'}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {isEnglish
                    ? 'The current downloads are review drafts. Final PDFs should include logo, cover design, page numbering, iconography and a non-editable export after approval.'
                    : 'Las descargas actuales son borradores de revision. Los PDFs finales deberan incluir logotipo, portada, numeracion, iconografia y exportacion no editable despues de aprobar contenido.'}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {isEnglish
                    ? 'This material is informational and does not replace legal, tax, financial, psychological or professional advice.'
                    : 'Este material es informativo y no sustituye asesoria legal, fiscal, financiera, psicologica ni profesional especializada.'}
                </p>
                <div className="mt-5 flex items-center gap-2 text-sm font-black text-slate-700">
                  <Globe2 className="h-4 w-4 text-geoPurple" />
                  {isEnglish ? 'Global editions planned after Spanish review.' : 'Versiones globales previstas despues de aprobar la edicion en espanol.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 text-center">
        <div className="mx-auto max-w-3xl">
          <PenTool className="mx-auto h-8 w-8 text-geoPurple" />
          <p className="mt-4 text-sm leading-6 text-slate-500">
            {isEnglish
              ? 'Version 0.1. Built as an editorial foundation for Geobooker Library 2026. Design, final PDF layout and category editions are next-stage work.'
              : 'Version 0.1. Construida como base editorial de Biblioteca Geobooker 2026. Diseno final de PDF, maquetacion e industrias por categoria quedan para la siguiente etapa.'}
          </p>
        </div>
      </section>
    </div>
  );
}

