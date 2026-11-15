import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Building2, CheckCircle, Globe2, MapPin, Target } from 'lucide-react';
import SEO from '../../components/SEO';
import enterpriseSeoPages from '../../config/enterpriseSeoPages.json';

const pageCollections = {
  markets: {
    label: 'Markets',
    items: enterpriseSeoPages.markets,
    basePath: '/markets',
    siblingBasePath: '/industries',
    siblingLabel: 'Industries'
  },
  industries: {
    label: 'Industries',
    items: enterpriseSeoPages.industries,
    basePath: '/industries',
    siblingBasePath: '/markets',
    siblingLabel: 'Markets'
  }
};

const enterpriseServices = [
  ['GeoScore', 'Evaluate viability, competition and market density before investing in a commercial location.', Target],
  ['Local Ads', 'Activate sponsored visibility by city, category, business intent or geographic market.', MapPin],
  ['B2B Connect', 'Organize supplier discovery, strategic accounts and commercial outreach with clearer criteria.', Building2],
  ['KPI Reports', 'Review campaign delivery, engagement and recommendations in a language the client understands.', BarChart3]
];

const getMarketNames = () => enterpriseSeoPages.markets.map((market) => market.name).join(', ');

export default function EnterpriseSeoLanding({ type }) {
  const { slug } = useParams();
  const collection = pageCollections[type];
  const page = collection?.items.find((item) => item.slug === slug);

  if (!collection || !page) {
    return <Navigate to="/enterprise/media-kit" replace />;
  }

  const isMarket = type === 'markets';
  const canonicalPath = `${collection.basePath}/${page.slug}`;
  const siblingItems = enterpriseSeoPages[isMarket ? 'industries' : 'markets'].slice(0, 6);
  const title = isMarket
    ? `${page.name} Advertising, GeoScore and B2B Discovery`
    : `${page.name} Advertising, GeoScore and Market Intelligence`;
  const description = `${page.description} Includes local ads, GeoScore studies, B2B discovery and executive campaign reporting.`;

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: title,
      description,
      provider: {
        '@type': 'Organization',
        name: 'Geobooker',
        url: 'https://geobooker.com.mx'
      },
      serviceType: isMarket
        ? 'Enterprise advertising and market intelligence by country'
        : 'Enterprise advertising and market intelligence by industry',
      areaServed: isMarket
        ? { '@type': 'Country', name: page.name }
        : enterpriseSeoPages.markets.map((market) => ({ '@type': 'Country', name: market.name })),
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Geobooker Enterprise Solutions',
        itemListElement: enterpriseServices.map(([name, text], index) => ({
          '@type': 'Offer',
          position: index + 1,
          name,
          description: text,
          url: `https://geobooker.com.mx/enterprise/contact?source=${type}-${page.slug}`
        }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Geobooker', item: 'https://geobooker.com.mx/' },
        { '@type': 'ListItem', position: 2, name: collection.label, item: `https://geobooker.com.mx${collection.basePath}` },
        { '@type': 'ListItem', position: 3, name: page.name, item: `https://geobooker.com.mx${canonicalPath}` }
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SEO
        title={title}
        description={description}
        url={canonicalPath}
        keywords={[
          'Geobooker',
          page.name,
          'GeoScore',
          'local advertising',
          'enterprise campaigns',
          'B2B discovery',
          'market study'
        ]}
        structuredData={structuredData}
      />

      <section className="border-b border-white/10 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
              <Globe2 className="h-4 w-4" />
              Geobooker {collection.label}
            </p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">{page.headline}</h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">{description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={`/enterprise/contact?source=${type}-${page.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 py-4 font-bold text-slate-950 hover:bg-cyan-200"
              >
                Request proposal
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/enterprise/media-kit"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-4 font-semibold text-white hover:bg-white/10"
              >
                View media kit
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-4">
          {enterpriseServices.map(([name, text, icon]) => {
            const ServiceIcon = icon;
            return (
              <div key={name} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <ServiceIcon className="h-8 w-8 text-cyan-200" />
                <h2 className="mt-4 text-xl font-bold">{name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="text-3xl font-black">
              {isMarket ? `Where Geobooker can help in ${page.name}` : `How Geobooker helps ${page.name}`}
            </h2>
            <p className="mt-4 leading-8 text-slate-300">
              {isMarket
                ? `Teams can plan campaigns by city, industry and business objective while using GeoScore and local discovery signals to reduce guesswork. Priority cities include ${page.cities.join(', ')}.`
                : `Teams can use Geobooker to compare locations, create local advertising campaigns and organize B2B opportunities across markets including ${getMarketNames()}.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(isMarket ? page.cities : page.useCases).map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h3 className="text-xl font-bold">Operational signals</h3>
            <ul className="mt-5 space-y-3">
              {(page.signals || page.useCases).map((item) => (
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
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black">Explore related {collection.siblingLabel.toLowerCase()}</h2>
            <Link to="/enterprise" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">
              Enterprise plans
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {siblingItems.map((item) => (
              <Link
                key={item.slug}
                to={`${collection.siblingBasePath}/${item.slug}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10"
              >
                <p className="font-bold text-white">{item.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
