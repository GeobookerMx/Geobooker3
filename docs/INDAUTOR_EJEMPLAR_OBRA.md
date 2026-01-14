# GEOBOOKER.COM.MX
## Ejemplar de la Obra para Registro en INDAUTOR

---

## 1. INFORMACIÓN GENERAL

| Campo | Valor |
|-------|-------|
| **Nombre de la obra** | GEOBOOKER.COM.MX |
| **Tipo** | Programa de Cómputo (Plataforma Web) |
| **Versión** | 3.0 |
| **URL** | https://geobooker.com.mx |
| **Fecha de creación** | 2024 |
| **Fecha de primera publicación** | 2024 |
| **País de origen** | México |
| **Lenguajes de programación** | JavaScript (React), Node.js, SQL |

---

## 2. DESCRIPCIÓN DE LA OBRA

### 2.1 Síntesis
Geobooker es una plataforma web de publicidad geolocalizada y directorio de negocios locales desarrollada en México. Permite a los usuarios descubrir establecimientos comerciales mediante un mapa interactivo con filtros por categoría y ubicación. Los negocios pueden registrarse, gestionar su perfil, publicar anuncios geolocalizados y acceder a un sistema de marketing digital.

### 2.2 Funcionalidades Principales

1. **Mapa Interactivo Geolocalizado**
   - Visualización de negocios en mapa de Google Maps
   - Filtros por categoría, distancia y calificación
   - Geolocalización del usuario en tiempo real

2. **Sistema de Perfiles de Negocios**
   - Registro y gestión de información comercial
   - Galería de fotos y horarios
   - Sistema de calificaciones y reseñas

3. **Plataforma de Publicidad Digital**
   - Creación de campañas publicitarias geolocalizadas
   - Múltiples formatos: banners, popups, publicaciones patrocinadas
   - Panel de métricas y análisis de rendimiento

4. **Sistema de Pagos Integrado**
   - Procesamiento con Stripe
   - Suscripciones premium para negocios
   - Facturación electrónica

5. **Panel de Administración**
   - Gestión de usuarios y negocios
   - Moderación de contenido
   - Reportes y estadísticas

6. **CRM de Marketing**
   - Gestión de contactos empresariales
   - Campañas de email marketing
   - Seguimiento de leads

7. **Chatbot con Inteligencia Artificial**
   - Asistente virtual para usuarios
   - Integración con Gemini AI
   - Respuestas contextuales sobre negocios

---

## 3. ARQUITECTURA TÉCNICA

### 3.1 Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js, Netlify Functions |
| Base de datos | PostgreSQL (Supabase) |
| Autenticación | Supabase Auth, Google OAuth |
| Pagos | Stripe |
| Mapas | Google Maps API |
| Hosting | Netlify |
| IA | Google Gemini API |

### 3.2 Estructura de Archivos Principal

```
geobooker/
├── src/
│   ├── components/     # Componentes React reutilizables
│   ├── pages/          # Páginas de la aplicación
│   ├── lib/            # Utilidades y configuraciones
│   ├── locales/        # Traducciones (español/inglés)
│   └── App.jsx         # Componente principal
├── netlify/
│   └── functions/      # Funciones serverless
├── supabase/           # Esquemas de base de datos
└── public/             # Archivos estáticos
```

---

## 4. CAPTURAS DE PANTALLA

*(Adjuntar capturas de las siguientes secciones)*

1. Página principal con mapa interactivo
2. Perfil de negocio
3. Panel de creación de anuncios
4. Dashboard de administrador
5. Sistema de pagos
6. CRM de marketing

---

## 5. CÓDIGO FUENTE REPRESENTATIVO

### 5.1 Componente Principal (App.jsx)
```javascript
// Fragmento representativo del código fuente
import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from './router';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" />
    </>
  );
}

export default App;
```

### 5.2 Sistema de Geolocalización
```javascript
// Fragmento del sistema de mapas
const getUserLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }
    );
  }
};
```

---

## 6. INFORMACIÓN DEL AUTOR Y TITULAR

### 6.1 Datos del Autor
| Campo | Valor |
|-------|-------|
| **Nombre completo** | [COMPLETAR: Nombre del autor] |
| **Nacionalidad** | Mexicana |
| **Domicilio** | [COMPLETAR: Dirección en México] |
| **RFC** | [COMPLETAR] |
| **CURP** | [COMPLETAR] |
| **Correo electrónico** | [COMPLETAR] |

### 6.2 Datos del Titular de Derechos Patrimoniales
*(Completar si el titular es diferente al autor o si es una persona moral)*

| Campo | Valor |
|-------|-------|
| **Razón social** | [COMPLETAR si aplica] |
| **RFC** | [COMPLETAR] |
| **Representante legal** | [COMPLETAR si aplica] |

### 6.3 Actividad Empresarial del Autor
El autor se dedica profesionalmente al desarrollo de software, creación de aplicaciones web y servicios digitales. Esta obra forma parte de su portafolio de desarrollos tecnológicos originales.

---

## 7. DECLARACIÓN DE ORIGINALIDAD

Declaro bajo protesta de decir verdad que la obra denominada "GEOBOOKER.COM.MX" es una creación original, desarrollada íntegramente por el autor/autores declarados, sin copiar, adaptar o derivar de ninguna otra obra preexistente protegida por derechos de autor.

El código fuente, diseño, interfaces, algoritmos y estructuras de datos contenidos en esta obra son producto del trabajo intelectual original del autor.

---

## 8. NOTA IMPORTANTE SOBRE ALCANCE DEL REGISTRO

> **Este registro protege únicamente la obra "GEOBOOKER.COM.MX"** en su versión actual y sus actualizaciones futuras que mantengan la estructura esencial de la obra original.
>
> Para proteger otros desarrollos de software, aplicaciones web o servicios digitales creados por el autor, será necesario realizar registros independientes ante INDAUTOR para cada nueva obra.

---

**Fecha de elaboración del documento:** Enero 2025  
**Lugar:** México

---

*Este documento forma parte del expediente de registro de obra ante el Instituto Nacional del Derecho de Autor (INDAUTOR).*

