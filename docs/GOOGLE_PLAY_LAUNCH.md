# GUÍA DE LANZAMIENTO EN GOOGLE PLAY STORE
## Geobooker - Directorio Local

Geobooker está diseñado como una **Progressive Web App (PWA)** de alto rendimiento. Para lanzarla en Google Play Store, la mejor opción es utilizar **Trusted Web Activity (TWA)**.

---

## 1. REQUISITOS PREVIOS

### Activos Visuales
- [ ] **Icono de la App:** 512x512px (PNG 32-bit).
- [ ] **Gráfico de funciones:** 1024x500px.
- [ ] **Capturas de pantalla:**
    - Al menos 4 capturas de teléfono (1080x1920 o similar).
    - Al menos 4 capturas de tablet de 7" y 10".

### Técnico
- [ ] **Puntuación de Lighthouse:** Asegurar que la PWA pase todas las pruebas de "Installability".
- [ ] **Digital Asset Links:** Archivo `assetlinks.json` configurado para validación de dominio.
- [ ] **Cuenta de Desarrollador de Google:** ($25 USD pago único).

---

## 2. GENERACIÓN DEL PAQUETE (.AAB)

Recomiendo usar **Bubblewrap** (herramienta oficial de Google) o **PWA2APK**:

### Opción A: Bubblewrap (CLI)
1. Instalar: `npm i -g @bubblewrap/cli`
2. Inicializar: `bubblewrap init --manifest=https://geobooker.com.mx/manifest.json`
3. Seguir los pasos de configuración de colores e iconos.
4. Construir: `bubblewrap build`
5. Esto generará un archivo `app-release-bundle.aab`.

### Opción B: PWABuilder (Web)
1. Ve a [pwabuilder.com](https://www.pwabuilder.com/)
2. Ingresa `https://geobooker.com.mx`
3. Haz clic en **Package for Store** → **Android**.
4. Descarga el paquete generado.

---

## 3. CONFIGURACIÓN DE VERIFICACIÓN (CRÍTICO)

Para que la app no muestre la barra de direcciones del navegador (modo standalone real), debes configurar el archivo de validación:

1. El generador (Bubblewrap/PWABuilder) te dará una **Digital Asset Link statement**.
2. Debes subirla a tu servidor:
   - Ruta: `https://geobooker.com.mx/.well-known/assetlinks.json`
3. El contenido debe verse así (ejemplo):
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.geobooker.app",
    "sha256_cert_fingerprints": ["TU_FINGERPRINT_AQUÍ"]
  }
}]
```

---

## 4. CHECKLIST DE CONSOLA DE GOOGLE PLAY

1. **Ficha de Play Store:** Título, descripción corta (80 car.) y descripción larga (4000 car.).
2. **Clasificación de contenido:** Responder cuestionario (Geobooker es "Apta para todo público").
3. **Política de Privacidad:** Ya la tienes en `https://geobooker.com.mx/privacy`.
4. **Seguridad de los datos:** Declarar que la app recopila ubicación e información de contacto (para el registro de negocios).
5. **Prueba Cerrada:** Google requiere que 20 personas prueben la app por 14 días antes de lanzar a producción (regla para cuentas nuevas de 2024).

---

## 5. RECOMENDACIONES DE MARKETING

- **Keywords:** Directorio, Negocios, Cerca de mi, México, Ofertas, Geolocalización.
- **Categoría:** Mapas y navegación / Empresa.
- **Lanzamiento:** Considerar un pequeño presupuesto en Google Ads para los primeros 1000 usuarios y generar reseñas orgánicas.
