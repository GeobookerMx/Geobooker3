import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  Download,
  Globe2,
  MapPin,
  Shield,
  Target
} from 'lucide-react';
import SEO from '../../components/SEO';
import { trackEvent } from '../../services/analyticsService';
import enterpriseSeoPages from '../../config/enterpriseSeoPages.json';

const markets = ['Mexico', 'United States', 'Spain', 'Colombia', 'Argentina', 'Chile', 'United Kingdom', 'Canada'];

const solutions = [
  {
    title: 'Local Advertising',
    text: 'Sponsored placements, city/category visibility, map presence and local discovery campaigns.',
    icon: MapPin
  },
  {
    title: 'Enterprise Campaigns',
    text: 'Managed multi-city or multi-country campaigns with review, scheduling and KPI reporting.',
    icon: Building2
  },
  {
    title: 'GeoScore Intelligence',
    text: 'Commercial location studies that help teams compare viability, density and competitive signals.',
    icon: Target
  },
  {
    title: 'B2B Connect',
    text: 'Supplier discovery, strategic account targeting and commercial lead workflows for business teams.',
    icon: Globe2
  }
];

const kpis = [
  'Impressions by placement',
  'Clicks and CTR',
  'Map/profile interactions',
  'Lead and form submissions',
  'App download intent',
  'Campaign summary and recommendations'
];

export default function EnterpriseMediaKit() {
  useEffect(() => {
    trackEvent('media_kit_view', {
      page: 'enterprise_media_kit',
      audience: 'enterprise'
    });
  }, []);

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Geobooker Enterprise Media Kit',
      description: 'Enterprise overview of Geobooker advertising, GeoScore, B2B Connect and global campaign solutions.',
      url: 'https://geobooker.com.mx/enterprise/media-kit',
      mainEntity: {
        '@type': 'Service',
        name: 'Geobooker Enterprise Marketing Solutions',
        serviceType: 'Local advertising, market intelligence and enterprise campaign activation',
        provider: {
          '@type': 'Organization',
          name: 'Geobooker',
          url: 'https://geobooker.com.mx'
        },
        areaServed: markets.map((name) => ({ '@type': 'Country', name }))
      }
    }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SEO
        title="Geobooker Enterprise Media Kit | Advertising, GeoScore and Global Campaigns"
        description="Review Geobooker enterprise solutions for local advertising, GeoScore market studies, B2B Connect and global campaign activation."
        url="/enterprise/media-kit"
        structuredData={structuredData}
      />

      <section className="border-b border-white/10 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200">
              <Shield className="h-4 w-4" />
              Enterprise Media Kit
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              Geobooker turns local discovery into measurable advertising and market intelligence.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              For brands, agencies, franchises and expansion teams, Geobooker combines business discovery,
              GeoScore studies, local advertising placements and B2B campaign workflows across priority markets.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/enterprise/contact?source=media-kit"
                onClick={() => trackEvent('enterprise_demo_click', { source: 'media_kit' })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-4 font-bold text-slate-950 hover:bg-amber-300"
              >
                Request enterprise demo
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  trackEvent('media_kit_download_click', { source: 'media_kit' });
                  window.print();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-4 font-semibold text-white hover:bg-white/10"
              >
                <Download className="h-5 w-5" />
                Print / save PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-4">
          {[
            ['Markets', '8+', 'Priority countries and global expansion logic'],
            ['Solutions', '4', 'Ads, GeoScore, B2B and enterprise campaigns'],
            ['KPIs', '6+', 'Reporting metrics for campaign accountability'],
            ['Platforms', 'Web + Apps', 'PWA, iOS, Android and public web']
          ].map(([label, value, text]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-black text-white">{value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black">Enterprise Solutions</h2>
              <p className="mt-2 max-w-2xl text-slate-300">
                Built for teams that need measurable local presence, audience discovery and market-level decisions.
              </p>
            </div>
            <Link to="/enterprise" className="hidden text-sm font-semibold text-amber-300 hover:text-amber-200 md:inline-flex">
              View plans
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {solutions.map(({ title, text, icon }) => {
              const SolutionIcon = icon;
              return (
                <div key={title} className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                  <SolutionIcon className="h-8 w-8 text-amber-300" />
                  <h3 className="mt-4 text-xl font-bold">{title}</h3>
                  <p className="mt-2 leading-7 text-slate-300">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h2 className="text-3xl font-black">Markets and Positioning</h2>
            <p className="mt-4 leading-8 text-slate-300">
              Geobooker is positioned as a global business discovery and commercial activation platform:
              useful for consumers, valuable for local businesses, and measurable for brands that need city-level visibility.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {markets.map((market) => (
                <span key={market} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  {market}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-7 w-7 text-emerald-300" />
              <h3 className="text-xl font-bold">Campaign KPIs</h3>
            </div>
            <ul className="mt-5 space-y-3">
              {kpis.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-300">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
          <h2 className="text-3xl font-black">Want Geobooker reviewed by your marketing or expansion team?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">
            Share this media kit, request a demo, or ask for a market-specific proposal by country, city, industry or campaign objective.
          </p>
          <Link
            to="/enterprise/contact?source=media-kit-footer"
            onClick={() => trackEvent('enterprise_demo_click', { source: 'media_kit_footer' })}
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 font-bold text-slate-950 hover:bg-slate-100"
          >
            Talk to Geobooker Enterprise
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-black">Market pages</h2>
            <p className="mt-3 leading-7 text-slate-300">
              Use these pages to review Geobooker by country and share a direct link with teams evaluating market entry,
              city-level advertising or GeoScore coverage.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {enterpriseSeoPages.markets.map((market) => (
                <Link
                  key={market.slug}
                  to={`/markets/${market.slug}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white hover:bg-white/10"
                >
                  {market.name}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black">Industry pages</h2>
            <p className="mt-3 leading-7 text-slate-300">
              These pages explain how Geobooker can support local advertising, B2B discovery and market intelligence by
              commercial vertical.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {enterpriseSeoPages.industries.map((industry) => (
                <Link
                  key={industry.slug}
                  to={`/industries/${industry.slug}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white hover:bg-white/10"
                >
                  {industry.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
