-- ==========================================
-- CORRECCIONES DE ESQUEMA DE EMAIL MARKETING
-- Ejecutar ANTES de insertar plantillas
-- ==========================================

-- 1. Agregar columna 'category' si no existe
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Agregar UNIQUE constraint en 'name' para permitir ON CONFLICT
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_name_unique;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_name_unique UNIQUE (name);

-- ==========================================
-- PLANTILLAS DE MARKETING PRO (Extendidas)
-- Con redes sociales y segmentación por nicho
-- ==========================================

-- Footer de redes sociales reutilizable
-- (Se añade al final de cada plantilla)

-- ============================================================
-- PLANTILLA 1: GANCHO LOCAL (MÉXICO) - PROSPECTING
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Gancho Local México',
    '🚀 {{empresa}}: ¿Listo para que más clientes te encuentren en el mapa?',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Hola {{nombre}}! 👋</h1>
        
        <p>Te escribo porque noté que <strong>{{empresa}}</strong> tiene un gran potencial para destacar en nuestra comunidad local.</p>
        
        <p>En <strong style="color: #3b82f6;">Geobooker</strong> estamos conectando a miles de personas con los mejores negocios de México. Queremos invitarte a optimizar tu perfil para que aparezcas en los primeros resultados cuando alguien busque servicios cerca de ti.</p>
        
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">🎁 Beneficio especial para ti:</h2>
            <p style="margin-bottom: 0; font-size: 18px;">Al activar tu cuenta <strong>esta semana</strong>, te daremos un distintivo de <strong>"Negocio Verificado"</strong> sin costo adicional.</p>
        </div>
        
        <h2 style="color: #1f2937;">✨ ¿Qué puedes hacer con Geobooker?</h2>
        <ul style="padding-left: 20px;">
            <li><strong>🔓 Abre y cierra tu negocio digitalmente:</strong> Tus clientes sabrán si estás disponible antes de salir de casa.</li>
            <li><strong>📍 Muévete de ubicación:</strong> ¿Tienes food truck o negocio móvil? Actualiza tu posición en tiempo real.</li>
            <li><strong>📸 Muestra tu mejor cara:</strong> Sube hasta 10 fotos para que la gente se enamore de tu negocio.</li>
            <li><strong>💬 WhatsApp directo:</strong> Recibe mensajes de clientes interesados al instante.</li>
        </ul>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #92400e;"><strong>⏰ PROMOCIÓN POR TIEMPO LIMITADO:</strong> Los primeros 50 negocios que se registren este mes recibirán 2 meses de Premium gratis.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 ¿Conoces a alguien que quiera más ventas?</h2>
        <p>Nuestro <strong>programa de referidos</strong> es súper amigable: por cada negocio que invites y se registre, tú ganas crédito para anuncios y ellos reciben descuento en su primer mes Premium. ¡Todos ganan!</p>
        
        <p>¿Te gustaría que te ayude a configurar tu ubicación exacta en el mapa? Solo responde este correo.</p>
        
        <p style="margin-top: 30px;">¡Un abrazo y éxito en tu negocio! 🙌</p>
        
        <!-- Redes Sociales -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin-bottom: 15px;">📱 Síguenos en redes para tips de negocio y promociones exclusivas:</p>
            <div>
                <a href="https://facebook.com/geobooker" style="display: inline-block; margin: 0 8px; color: #3b82f6; text-decoration: none;">📘 Facebook</a>
                <a href="https://instagram.com/geobooker" style="display: inline-block; margin: 0 8px; color: #e1306c; text-decoration: none;">📸 Instagram</a>
                <a href="https://tiktok.com/@geobooker" style="display: inline-block; margin: 0 8px; color: #000000; text-decoration: none;">🎵 TikTok</a>
                <a href="https://youtube.com/@geobooker" style="display: inline-block; margin: 0 8px; color: #ff0000; text-decoration: none;">▶️ YouTube</a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx | #CercaDeTi</p>
        </div>
    </div>',
    'prospecting'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 2: EXPANSIÓN GLOBAL (ENGLISH)
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Global Expansion Hook',
    '🌍 {{empresa}}: Expand your reach to the Mexican market',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">Hello {{nombre}}! 👋</h1>
        
        <p>I am reaching out from <strong style="color: #3b82f6;">Geobooker</strong>, the fastest-growing business directory in Mexico and Latin America.</p>
        
        <p>We noticed <strong>{{empresa}}</strong> and believe our platform can be your gateway to the Latin American market.</p>
        
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">🎯 Why Geobooker?</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li>Users are <strong>actively looking</strong> for reliable businesses to book and visit.</li>
                <li>Mexico''s middle class is growing and <strong>eager for international brands</strong>.</li>
                <li>We offer <strong>multi-language support</strong> for your business profile.</li>
            </ul>
        </div>
        
        <h2 style="color: #1f2937;">✨ Powerful features:</h2>
        <ul style="padding-left: 20px;">
            <li><strong>🔓 Digital Open/Close:</strong> Real-time availability status.</li>
            <li><strong>📍 Dynamic Location:</strong> Perfect for pop-ups and events.</li>
            <li><strong>📊 Analytics Dashboard:</strong> Track views and clicks.</li>
            <li><strong>💬 Direct WhatsApp:</strong> Instant customer inquiries.</li>
        </ul>
        
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #1e40af;"><strong>⏰ LIMITED TIME:</strong> International businesses get 3 months of Premium at 50% off this month.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 Know someone who wants more sales?</h2>
        <p>Our <strong>referral program</strong> rewards you with ad credits for every business you refer. <strong>Win-win!</strong></p>
        
        <p>Would you be open to a quick 15-minute call?</p>
        
        <p style="margin-top: 30px;">Looking forward to connecting! 🤝</p>
        
        <!-- Social Media -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin-bottom: 15px;">📱 Follow us for business tips and exclusive promos:</p>
            <div>
                <a href="https://facebook.com/geobooker" style="display: inline-block; margin: 0 8px; color: #3b82f6; text-decoration: none;">📘 Facebook</a>
                <a href="https://instagram.com/geobooker" style="display: inline-block; margin: 0 8px; color: #e1306c; text-decoration: none;">📸 Instagram</a>
                <a href="https://youtube.com/@geobooker" style="display: inline-block; margin: 0 8px; color: #ff0000; text-decoration: none;">▶️ YouTube</a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx | #NearYou</p>
        </div>
    </div>',
    'global'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 3: NICHO - RESTAURANTES Y GASTRONOMÍA
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Nicho: Restaurantes',
    '🍔 {{empresa}}: ¡Que el hambre de tus clientes trabaje a tu favor!',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Qué tal {{nombre}}! 🍽️</h1>
        
        <p>Vimos las reseñas de <strong>{{empresa}}</strong> y ¡nos encantó lo que ofrecen! 😋</p>
        
        <p>En <strong style="color: #3b82f6;">Geobooker</strong>, los usuarios buscan "dónde comer" usando nuestro mapa en tiempo real.</p>
        
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">🌟 Para restaurantes:</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li><strong>📸 Galería Premium:</strong> Hasta 10 fotos de tus platillos.</li>
                <li><strong>📋 Menú digital:</strong> Muestra tus especialidades.</li>
                <li><strong>⭐ Distintivo verificado:</strong> Genera confianza.</li>
            </ul>
        </div>
        
        <h2 style="color: #1f2937;">🔥 Herramientas para ti:</h2>
        <ul style="padding-left: 20px;">
            <li><strong>🔓 "Estamos abiertos":</strong> Indica si estás recibiendo clientes.</li>
            <li><strong>📍 Ubicación dinámica:</strong> ¿Food truck? Actualiza tu posición.</li>
            <li><strong>💬 WhatsApp reservas:</strong> Un clic y te escriben directo.</li>
        </ul>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #92400e;"><strong>🎉 PROMO:</strong> Los primeros 20 restaurantes tendrán perfil destacado 2 semanas GRATIS.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 ¿Conoces otro restaurante?</h2>
        <p>Invita a otro negocio de comida, ambos ganan crédito publicitario. <strong>¡Más invitas, más ganas!</strong></p>
        
        <p style="margin-top: 30px;">¡Buen provecho! 🙌</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; margin-bottom: 15px;">📱 Síguenos:</p>
            <a href="https://facebook.com/geobooker" style="margin: 0 8px; color: #3b82f6;">📘 Facebook</a>
            <a href="https://instagram.com/geobooker" style="margin: 0 8px; color: #e1306c;">📸 Instagram</a>
            <a href="https://tiktok.com/@geobooker" style="margin: 0 8px; color: #000;">🎵 TikTok</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx</p>
        </div>
    </div>',
    'niche_food'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 4: NICHO - SALUD (Doctores, Clínicas, Farmacias)
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Nicho: Salud y Bienestar',
    '🏥 {{empresa}}: Que tus pacientes te encuentren cuando más te necesitan',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Hola {{nombre}}! 👋</h1>
        
        <p>Sabemos que <strong>{{empresa}}</strong> se dedica a cuidar la salud de las personas, y eso es admirable. 💙</p>
        
        <p>En <strong style="color: #3b82f6;">Geobooker</strong>, miles de usuarios buscan servicios de salud cercanos: consultorios, clínicas, farmacias, laboratorios y más.</p>
        
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">🩺 Beneficios para profesionales de salud:</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li><strong>📍 Ubicación precisa:</strong> Los pacientes llegan sin perderse.</li>
                <li><strong>🔓 Horario en tiempo real:</strong> Indica si tienes consultas disponibles.</li>
                <li><strong>💬 WhatsApp citas:</strong> Agendan directo contigo.</li>
                <li><strong>⭐ Perfil verificado:</strong> Genera confianza profesional.</li>
            </ul>
        </div>
        
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #065f46;"><strong>🎁 PROMO SALUD:</strong> Profesionales de salud tienen 50% de descuento en su primer mes Premium.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 Programa de Referidos</h2>
        <p>¿Conoces a otros profesionales de salud? Por cada colega que invites, ambos ganan beneficios. ¡La red de salud más fuerte de México!</p>
        
        <p style="margin-top: 30px;">¡Éxito y salud! 🙌</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280;">📱 Síguenos:</p>
            <a href="https://facebook.com/geobooker" style="margin: 0 8px; color: #3b82f6;">📘 Facebook</a>
            <a href="https://instagram.com/geobooker" style="margin: 0 8px; color: #e1306c;">📸 Instagram</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx</p>
        </div>
    </div>',
    'niche_health'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 5: NICHO - BELLEZA (Salones, Spas, Estéticas)
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Nicho: Belleza y Estética',
    '💅 {{empresa}}: ¡Haz que tus clientes se vean y se sientan increíbles!',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Hola {{nombre}}! ✨</h1>
        
        <p>Nos encanta lo que hace <strong>{{empresa}}</strong> para que las personas se sientan hermosas. 💖</p>
        
        <p>En <strong style="color: #3b82f6;">Geobooker</strong>, las personas buscan salones, spas, barberías y estéticas cerca de ellas.</p>
        
        <div style="background: linear-gradient(135deg, #ec4899 0%, #be185d 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">💄 Para negocios de belleza:</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li><strong>📸 Portafolio visual:</strong> Muestra tus mejores trabajos (10 fotos Premium).</li>
                <li><strong>🔓 Disponibilidad:</strong> Indica cuando tienes citas libres.</li>
                <li><strong>💬 WhatsApp citas:</strong> Reservaciones directas.</li>
                <li><strong>📍 Ubicación exacta:</strong> Que lleguen sin problemas.</li>
            </ul>
        </div>
        
        <div style="background: #fdf2f8; border-left: 4px solid #ec4899; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #9d174d;"><strong>💅 PROMO BELLEZA:</strong> Salones y estéticas: primer mes Premium al 50% de descuento.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 Referidos</h2>
        <p>¿Conoces otros salones o estilistas? Invítalos, ambos ganan. ¡La comunidad de belleza más grande de México!</p>
        
        <p style="margin-top: 30px;">¡Éxito y brillo! ✨</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="https://facebook.com/geobooker" style="margin: 0 8px; color: #3b82f6;">📘 Facebook</a>
            <a href="https://instagram.com/geobooker" style="margin: 0 8px; color: #e1306c;">📸 Instagram</a>
            <a href="https://tiktok.com/@geobooker" style="margin: 0 8px; color: #000;">🎵 TikTok</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx</p>
        </div>
    </div>',
    'niche_beauty'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 6: NICHO - SERVICIOS PROFESIONALES (Abogados, Contadores, etc.)
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Nicho: Servicios Profesionales',
    '💼 {{empresa}}: Que tus clientes encuentren tu expertise fácilmente',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Hola {{nombre}}! 👋</h1>
        
        <p>En <strong>{{empresa}}</strong> ofrecen servicios profesionales de calidad, y eso es justo lo que las personas buscan. 📊</p>
        
        <p><strong style="color: #3b82f6;">Geobooker</strong> conecta a usuarios con profesionales: abogados, contadores, arquitectos, notarios y más.</p>
        
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">📋 Para profesionales:</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li><strong>⭐ Perfil verificado:</strong> Transmite confianza y seriedad.</li>
                <li><strong>📍 Ubicación de oficina:</strong> Que lleguen sin problema.</li>
                <li><strong>🔓 Horarios en tiempo real:</strong> Agenda disponible o no.</li>
                <li><strong>💬 WhatsApp directo:</strong> Consultas y citas inmediatas.</li>
            </ul>
        </div>
        
        <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #3730a3;"><strong>💼 PROMO:</strong> Profesionistas independientes: 30% de descuento en plan anual Premium.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 Referidos Profesionales</h2>
        <p>¿Conoces colegas que necesiten más clientes? Refiere y ambos ganan crédito publicitario.</p>
        
        <p style="margin-top: 30px;">¡Éxito en tus proyectos! 🙌</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="https://facebook.com/geobooker" style="margin: 0 8px; color: #3b82f6;">📘 Facebook</a>
            <a href="https://instagram.com/geobooker" style="margin: 0 8px; color: #e1306c;">📸 Instagram</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx</p>
        </div>
    </div>',
    'niche_professional'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 7: NICHO - COMERCIO (Tiendas, Boutiques, Ferreterías)
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Nicho: Comercio y Retail',
    '🛍️ {{empresa}}: Que tus productos lleguen a más clientes locales',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Hola {{nombre}}! 🛒</h1>
        
        <p><strong>{{empresa}}</strong> tiene productos que la gente de tu zona necesita. ¡Hagamos que te encuentren!</p>
        
        <p>En <strong style="color: #3b82f6;">Geobooker</strong>, las personas buscan tiendas, boutiques, ferreterías y comercios cercanos.</p>
        
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">🏪 Para comercios:</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li><strong>📸 Catálogo visual:</strong> Muestra tus productos estrella.</li>
                <li><strong>🔓 "Abierto ahora":</strong> Que sepan si pueden ir en este momento.</li>
                <li><strong>📍 Ubicación exacta:</strong> Fácil de encontrar en el mapa.</li>
                <li><strong>💬 WhatsApp pedidos:</strong> Consultas y apartados instantáneos.</li>
            </ul>
        </div>
        
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #166534;"><strong>🛍️ PROMO COMERCIO:</strong> Primeros 30 comercios: distintivo "Tienda Local Verificada" GRATIS.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 Programa de Referidos</h2>
        <p>¿Conoces otras tiendas en tu zona? Invítalas, ambos ganan beneficios. ¡Comunidad comercial más fuerte!</p>
        
        <p style="margin-top: 30px;">¡Muchas ventas! 🙌</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="https://facebook.com/geobooker" style="margin: 0 8px; color: #3b82f6;">📘 Facebook</a>
            <a href="https://instagram.com/geobooker" style="margin: 0 8px; color: #e1306c;">📸 Instagram</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx</p>
        </div>
    </div>',
    'niche_retail'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;

-- ============================================================
-- PLANTILLA 8: NICHO - AUTOMOTRIZ (Talleres, Refaccionarias, Lavados)
-- ============================================================
INSERT INTO email_templates (name, subject, body_html, category)
VALUES (
    'Nicho: Automotriz',
    '🚗 {{empresa}}: Que los conductores te encuentren cuando más te necesitan',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h1 style="color: #1f2937;">¡Hola {{nombre}}! 🔧</h1>
        
        <p>En <strong>{{empresa}}</strong> ayudan a mantener los autos en forma. ¡Eso es esencial! 🚙</p>
        
        <p>Con <strong style="color: #3b82f6;">Geobooker</strong>, los conductores encuentran talleres, refaccionarias y servicios automotrices cercanos.</p>
        
        <div style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); color: white; padding: 20px; border-radius: 12px; margin: 25px 0;">
            <h2 style="margin-top: 0; color: white;">🔧 Para negocios automotrices:</h2>
            <ul style="margin-bottom: 0; padding-left: 20px;">
                <li><strong>🔓 "Abierto y disponible":</strong> Indica si puedes atender ahora.</li>
                <li><strong>📍 Ubicación precisa:</strong> Que lleguen fácil, especialmente en emergencias.</li>
                <li><strong>💬 WhatsApp citas:</strong> Agendan servicio al instante.</li>
                <li><strong>📸 Fotos de tu taller:</strong> Genera confianza profesional.</li>
            </ul>
        </div>
        
        <div style="background: #f1f5f9; border-left: 4px solid #64748b; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #334155;"><strong>🚗 PROMO AUTO:</strong> Talleres mecánicos: primer mes Premium a mitad de precio.</p>
        </div>
        
        <h2 style="color: #1f2937;">🤝 Referidos</h2>
        <p>¿Conoces otros talleres o refaccionarias? Ambos ganan al referir.</p>
        
        <p style="margin-top: 30px;">¡Éxito en tu negocio! 🙌</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <a href="https://facebook.com/geobooker" style="margin: 0 8px; color: #3b82f6;">📘 Facebook</a>
            <a href="https://instagram.com/geobooker" style="margin: 0 8px; color: #e1306c;">📸 Instagram</a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 15px;">geobooker.com.mx</p>
        </div>
    </div>',
    'niche_auto'
) ON CONFLICT (name) DO UPDATE SET subject = EXCLUDED.subject, body_html = EXCLUDED.body_html, category = EXCLUDED.category;
