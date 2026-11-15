import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import config from '../config/geoSeo.json';

export default function GeoDirectoryPage() {
    const { city, category } = useParams();
    const [state, setState] = useState({ loading: true });
    const cityInfo = Object.hasOwn(config.cities, city) ? config.cities[city] : null;
    const categoryInfo = Object.hasOwn(config.categories, category) ? config.categories[category] : null;
    useEffect(() => {
        const controller = new AbortController();
        setState({ loading: true });
        if (!cityInfo || !categoryInfo) { setState({ error: 'Página no encontrada' }); return () => controller.abort(); }
        fetch(`/.netlify/functions/geo-directory?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`, { signal: controller.signal })
            .then(response => { if (!response.ok) throw new Error('No fue posible consultar los negocios. Intenta de nuevo.'); return response.json(); })
            .then(data => setState({ data }))
            .catch(error => { if (error.name !== 'AbortError') setState({ error: error.message }); });
        return () => controller.abort();
    }, [city, category, cityInfo, categoryInfo]);
    const title = cityInfo && categoryInfo ? `${categoryInfo.name} en ${cityInfo.name}` : 'Página no encontrada';
    const businesses = state.data?.businesses || [];
    return <main className="mx-auto max-w-5xl px-5 py-10">
        <SEO title={title} url={`https://geobooker.com.mx/ciudad/${city}/${category}`} alternateUrls={{}}
            description={`Consulta negocios de ${categoryInfo?.name.toLowerCase() || 'la categoría'} en ${cityInfo?.name || 'la zona'}: direcciones y perfiles públicos para explorar la zona y contactar al negocio.`}
            noindex={!state.loading && !businesses.length} structuredData={businesses.length ? {
                '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: businesses.map((business, i) => ({ '@type': 'ListItem', position: i + 1, name: business.name, url: `https://geobooker.com.mx${business.path}` }))
            } : null} />
        <nav className="mb-5 text-blue-700"><Link to="/categories">Categorías</Link> · <Link to={`/ciudad/${city}`}>{cityInfo?.name || 'Mapa'}</Link></nav>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="my-4">Explora perfiles públicos y confirma horarios, disponibilidad y condiciones directamente con cada negocio.</p>
        {state.loading && <p role="status">Consultando negocios…</p>}
        {state.error && <p role="alert">{state.error}</p>}
        {state.data && !businesses.length && <p>Aún no hay perfiles públicos disponibles para esta combinación.</p>}
        <ul className="my-6 grid gap-4 md:grid-cols-2">{businesses.map(business => <li key={business.path} className="rounded-xl border p-5">
            <h2 className="text-xl font-semibold"><Link className="text-blue-700" to={business.path}>{business.name}</Link></h2>
            <p className="mt-2">{business.address}</p>{business.attribution && <small>{business.attribution}</small>}
        </li>)}</ul>
        <Link className="font-semibold text-blue-700" to={`/ciudad/${city}?category=${category}`}>Explorar el mapa de la zona →</Link>
    </main>;
}
