const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_URLS = 49000; // Margen de seguridad (Google permite 50k)

exports.handler = async (event, context) => {
    try {
        // 1. Obtener datos de Supabase
        // Negocios
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, updated_at, name')
            .eq('status', 'approved') // Solo negocios aprobados
            .order('updated_at', { ascending: false })
            .limit(20000);

        // Posts de Comunidad
        const { data: posts, error: postsError } = await supabase
            .from('community_posts') // Asegurar nombre correcto de tabla
            .select('id, created_at')
            .order('created_at', { ascending: false })
            .limit(5000);

        if (businessError) throw businessError;

        // 2. Definir rutas estáticas
        const staticRoutes = [
            '', '/categories', '/community', '/advertise', '/global',
            '/seguridad', '/login', '/signup', '/about'
        ];

        // 3. Generar XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">`;

        // Función helper para agregar URL
        const addUrl = (path, lastmod) => {
            const mxUrl = `https://geobooker.com.mx${path}`;
            const globalUrl = `https://geobooker.com${path}`;
            const date = lastmod ? new Date(lastmod).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            // Entradas cruzadas (Cross-Domain)
            // Entrada para .MX
            xml += `
  <url>
    <loc>${mxUrl}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-MX" href="${mxUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${globalUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${globalUrl}"/>
  </url>`;

            // Entrada para .COM (Global)
            xml += `
  <url>
    <loc>${globalUrl}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="es-MX" href="${mxUrl}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${globalUrl}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${globalUrl}"/>
  </url>`;
        };

        // Agregar estáticas
        staticRoutes.forEach(route => addUrl(route));

        // Agregar Negocios
        businesses.forEach(biz => {
            addUrl(`/business/${biz.id}`, biz.updated_at);
        });

        // Agregar Posts (si existen)
        if (posts) {
            posts.forEach(post => {
                addUrl(`/community/post/${post.id}`, post.created_at);
            });
        }

        xml += `\n</urlset>`;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
            },
            body: xml
        };

    } catch (error) {
        console.error('Error generando sitemap:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate sitemap', details: error.message })
        };
    }
};
