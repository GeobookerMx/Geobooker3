-- ==========================================================
-- COMMUNITY BLOG: Initial Posts & Comments System
-- ==========================================================

-- 1. Create comments table
CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT true, -- Auto-approve, admin can hide later
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);

-- 2. RLS for comments
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can read approved comments"
ON community_comments FOR SELECT
USING (is_approved = true);

-- Authenticated users can add comments
CREATE POLICY "Auth users can add comments"
ON community_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON community_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- 3. Function to add comment
CREATE OR REPLACE FUNCTION add_community_comment(
    p_post_id UUID,
    p_content TEXT
)
RETURNS UUID AS $$
DECLARE
    v_comment_id UUID;
    v_user_name TEXT;
BEGIN
    -- Get user name
    SELECT COALESCE(full_name, email) INTO v_user_name
    FROM user_profiles
    WHERE id = auth.uid();
    
    IF v_user_name IS NULL THEN
        v_user_name := 'Usuario';
    END IF;
    
    -- Insert comment
    INSERT INTO community_comments (post_id, user_id, user_name, content)
    VALUES (p_post_id, auth.uid(), v_user_name, p_content)
    RETURNING id INTO v_comment_id;
    
    RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION add_community_comment(UUID, TEXT) TO authenticated;

-- ==========================================================
-- 4. INSERT INITIAL BLOG POSTS
-- ==========================================================

-- Post 1: Tips para negocios
INSERT INTO community_posts (title, content, summary, category, is_published, published_at, author_name)
VALUES (
    '💡 5 Tips para Hacer Crecer tu Negocio Local en 2025',
    '## 1. Optimiza tu Presencia Digital

En la era digital, tu negocio **DEBE** ser fácil de encontrar en línea. Geobooker te ayuda a aparecer en el mapa cuando la gente busca servicios cerca.

## 2. Pide Reseñas a Clientes Satisfechos

Las reseñas son oro digital. Un cliente que deja una buena reseña vale más que cualquier anuncio.

## 3. Ofrece Promociones Exclusivas

Crea ofertas especiales para clientes que te encuentren en Geobooker. Un simple "10% de descuento al mencionar Geobooker" puede traerte muchos clientes nuevos.

## 4. Mantén tu Información Actualizada

Horarios, teléfono, dirección... cualquier dato desactualizado puede costarte clientes.

## 5. Responde Rápidamente

La velocidad es clave. Un cliente que pregunta por WhatsApp espera respuesta en minutos, no horas.

---

**¿Tienes más tips? ¡Compártelos en los comentarios!**',
    '5 consejos prácticos para hacer crecer tu negocio local usando herramientas digitales.',
    'tips',
    true,
    NOW(),
    'Equipo Geobooker'
)
ON CONFLICT DO NOTHING;

-- Post 2: Recursos útiles
INSERT INTO community_posts (title, content, summary, category, is_published, published_at, author_name)
VALUES (
    '📚 Recursos Gratuitos para Emprendedores Mexicanos',
    '## 🏛️ Gobierno

- **[INADEM](https://www.gob.mx/se)** - Secretaría de Economía con programas de apoyo
- **[SAT - Portal de Emprendedores](https://www.sat.gob.mx)** - Guías fiscales y trámites

## 💰 Financiamiento

- **[Nacional Financiera (NAFIN)](https://www.nafin.com)** - Créditos para PyMEs
- **[FONDEADORA](https://fondeadora.mx)** - Crowdfunding mexicano

## 📖 Capacitación Gratuita

- **[Coursera](https://www.coursera.org)** - Cursos de negocios de universidades top
- **[Google Skillshop](https://skillshop.withgoogle.com)** - Marketing digital certificado
- **[Santander Becas](https://www.becas-santander.com)** - Becas de capacitación

## 🛠️ Herramientas Gratis

- **[Canva](https://canva.com)** - Diseño gráfico fácil
- **[Wave Apps](https://waveapps.com)** - Facturación gratis
- **[Trello](https://trello.com)** - Organización de proyectos

---

**¿Conoces más recursos? ¡Compártelos en los comentarios!**',
    'Lista de recursos gratuitos para emprendedores: financiamiento, capacitación y herramientas.',
    'tips',
    true,
    NOW() - INTERVAL '1 day',
    'Equipo Geobooker'
)
ON CONFLICT DO NOTHING;

-- Post 3: Búsqueda de empleo
INSERT INTO community_posts (title, content, summary, category, is_published, published_at, author_name)
VALUES (
    '💼 ¿Buscas Trabajo? Portales de Empleo en México',
    '## 🔍 Portales de Empleo

- **[OCC Mundial](https://occ.com.mx)** - El más grande de México
- **[CompuTrabajo](https://www.computrabajo.com.mx)** - Miles de ofertas diarias
- **[Indeed México](https://mx.indeed.com)** - Buscador global
- **[LinkedIn Jobs](https://linkedin.com/jobs)** - Para profesionales
- **[Bumeran](https://www.bumeran.com.mx)** - Ofertas variadas

## 🏢 Empleos en Gobierno

- **[Trabajaen](https://www.trabajaen.gob.mx)** - Servicio Profesional de Carrera
- **[Bolsa de Trabajo IMSS](https://www.imss.gob.mx)** - Instituto Mexicano del Seguro Social

## 💡 Tips para tu CV

1. **Una página** es suficiente si tienes menos de 10 años de experiencia
2. **Logros, no solo tareas** - "Aumenté ventas 30%" en vez de "Responsable de ventas"
3. **Palabras clave** del puesto que buscas
4. **Foto profesional** - Fondo blanco, vestimenta formal

## 🤝 Comunidad Geobooker

Los negocios registrados en Geobooker a veces buscan empleados. ¡Explora el mapa y contacta negocios en tu zona!

---

**¿Tienes experiencias buscando empleo? ¡Comparte en los comentarios!**',
    'Portales de empleo en México y tips para mejorar tu CV.',
    'tips',
    true,
    NOW() - INTERVAL '2 days',
    'Equipo Geobooker'
)
ON CONFLICT DO NOTHING;

-- Post 4: Historia de éxito
INSERT INTO community_posts (title, content, summary, category, is_published, published_at, author_name)
VALUES (
    '⭐ Historia de Éxito: De Food Truck a Restaurante',
    '## La Historia de "Tacos El Primo"

Don Roberto empezó vendiendo tacos en una esquina de Guadalajara con un carrito ambulante. Su sazón era inigualable, pero nadie lo conocía.

### El Cambio

Un día, un cliente le sugirió registrar su negocio en Geobooker. "Así la gente te encuentra cuando busca tacos cerca", le dijo.

### Los Resultados

- **Mes 1**: De 20 clientes diarios a 40
- **Mes 6**: Ahorró suficiente para un local fijo
- **Hoy**: Tiene un restaurante con 5 empleados

### Sus Palabras

> "Nunca imaginé que algo tan simple como aparecer en un mapa pudiera cambiar mi vida. Ahora la gente me encuentra sin que yo tenga que buscarlos."

---

**¿Tienes una historia de éxito? ¡Contáctanos para compartirla!**',
    'Cómo un taquero ambulante creció su negocio usando Geobooker.',
    'historias',
    true,
    NOW() - INTERVAL '3 days',
    'Equipo Geobooker'
)
ON CONFLICT DO NOTHING;

-- Post 5: Actualización de plataforma
INSERT INTO community_posts (title, content, summary, category, is_published, published_at, author_name)
VALUES (
    '🚀 Nuevas Funciones en Geobooker - Diciembre 2024',
    '## ¿Qué hay de nuevo?

### 📍 Cambia la Ubicación de tu Negocio
¿Tu negocio se mudó? ¿Eres un negocio móvil? Ahora puedes actualizar tu ubicación hasta 3 veces al mes.

### 🎁 Recompensas por Referidos
Invita amigos con negocio y gana publicidad GRATIS:
- 3 referidos → Publicidad en tu ciudad
- 7 referidos → Publicidad estatal
- 15 referidos → Publicidad nacional

### 🍎 Inicia Sesión con Apple
Ahora puedes usar tu Apple ID para registrarte y entrar más rápido.

### 🌐 Página de Comunidad
Estás leyendo esto en nuestra nueva sección de Comunidad. ¡Comparte tus opiniones en los comentarios!

---

**¡Gracias por ser parte de Geobooker!**',
    'Resumen de las nuevas funciones disponibles en Geobooker.',
    'actualizaciones',
    true,
    NOW(),
    'Equipo Geobooker'
)
ON CONFLICT DO NOTHING;

-- 5. Verify
SELECT 'Blog posts and comments system created!' as status;
SELECT title, category, is_published FROM community_posts ORDER BY created_at DESC;
