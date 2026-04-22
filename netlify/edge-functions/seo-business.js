export default async (request, context) => {
    // Extraer el path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');

    // Asegurar que estamos en /business/:id
    if (pathParts[1] !== 'business' || !pathParts[2]) {
        return context.next();
    }

    const businessId = pathParts[2];

    // Cargar la respuesta original (el index.html del React SPA)
    const response = await context.next();

    // Solo inyectamos SEO si es archivo HTML
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
        return response;
    }

    // Usar Netlify env variables (en Edge no existe process.env)
    const supabaseUrl = Netlify.env.get("VITE_SUPABASE_URL");
    let supabaseKey = Netlify.env.get("VITE_SUPABASE_ANON_KEY"); 
    
    // Si tenemos Service Role Key úsalo por prioridad (para bypass RLS en perfiles cerrados)
    const serviceKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceKey) supabaseKey = serviceKey;

    if (!supabaseUrl || !supabaseKey) {
        return response; // No config, devolver original
    }

    let business = null;

    try {
        // Primera tabla: business_candidates (Donde están los 260k del DENUE)
        let res = await fetch(`${supabaseUrl}/rest/v1/business_candidates?id=eq.${businessId}&select=name,city,state,industry,description`, {
            headers: {
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`
            }
        });
        let data = await res.json();
        
        if (data && data.length > 0) {
            business = data[0];
        } else {
            // Segunda tabla: businesses (Donde están los Claimed/Verified)
            res = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=name,city,state,industry,description`, {
                headers: {
                    "apikey": supabaseKey,
                    "Authorization": `Bearer ${supabaseKey}`
                }
            });
            data = await res.json();
            if (data && data.length > 0) business = data[0];
        }
    } catch (err) {
        console.error("Edge SEO Fetch error:", err);
    }

    // Si el negocio no existe o hubo error, enviamos la página genérica original
    if (!business) {
        return response;
    }

    // Construir los textos SEO
    // Limpieza básica de strings (capitalizar primera letra, etc)
    const cleanWord = (text) => text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : '';
    
    const bizName = business.name || 'Empresa Local';
    const bizCity = cleanWord(business.city);
    const bizIndustry = cleanWord(business.industry);
    
    const title = `${bizName} | Geobooker ${bizCity ? `- ${bizCity}` : ''}`;
    const description = business.description 
        || `Toda la información y perfil de negocios de ${bizName}. Encuentra empresas de ${bizIndustry} en ${bizCity}. Contacto, ubicación y networking local verificado.`;

    // Utilizar HTMLRewriter para inyectar tags y sobreescribir los vacíos/genéricos
    return new HTMLRewriter()
        .on('title', {
            element(element) {
                element.setInnerContent(title);
            }
        })
        .on('head', {
            element(element) {
                // Inyectar en el final del <head>
                element.append(`<meta name="description" content="${description}">`, { html: true });
                element.append(`<meta property="og:title" content="${title}">`, { html: true });
                element.append(`<meta property="og:description" content="${description}">`, { html: true });
                element.append(`<meta property="og:type" content="profile">`, { html: true });
                element.append(`<meta name="twitter:title" content="${title}">`, { html: true });
                element.append(`<meta name="twitter:description" content="${description}">`, { html: true });
            }
        })
        .transform(response);
};
