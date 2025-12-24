-- ==========================================================
-- COMMUNITY POSTS TABLE (Admin-Only Blog)
-- ==========================================================

-- 1. Create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category TEXT DEFAULT 'general', -- noticias, tips, actualizaciones, historias, general
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT DEFAULT 'Equipo Geobooker',
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- 2. Add indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_published ON community_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

-- 3. RLS Policies
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Anyone can read published posts"
ON community_posts FOR SELECT
USING (is_published = true);

-- Only admins can manage posts
CREATE POLICY "Admins can manage posts"
ON community_posts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE admin_users.id = auth.uid()
    )
);

-- 4. Comments (optional, for future)
COMMENT ON TABLE community_posts IS 'Admin-only blog posts for community news and tips';

-- 5. Insert welcome post
INSERT INTO community_posts (title, content, summary, category, is_published, published_at)
VALUES (
    '¡Bienvenidos a la Comunidad Geobooker!',
    '# Bienvenidos a la Comunidad Geobooker 🎉

Este es tu espacio para:
- 📰 **Noticias**: Enterarte de las últimas novedades de Geobooker
- 💡 **Tips**: Aprender a hacer crecer tu negocio
- 🚀 **Actualizaciones**: Conocer las nuevas funciones de la plataforma
- ⭐ **Historias de Éxito**: Inspirarte con negocios que están triunfando

¡Gracias por ser parte de esta comunidad de emprendedores!',
    'Tu espacio para noticias, tips y actualizaciones para hacer crecer tu negocio.',
    'noticias',
    true,
    NOW()
)
ON CONFLICT DO NOTHING;

-- 6. Verify
SELECT 'Community posts table created!' as status;
