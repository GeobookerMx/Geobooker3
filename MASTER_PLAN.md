# 🚀 Geobooker - Master Plan de Lanzamiento (Fase Final)

Este documento es tu mapa de ruta definitivo. La arquitectura técnica, el motor de base de datos y la aplicación nativa están **100% operativos y blindados**. 

A partir de este punto, las tareas restantes son operativas y estratégicas.

---

## 📱 Fase 1: Certificación Apple (Build 30)
> **Objetivo:** Pasar la revisión final de App Store Connect.

- [x] **Arquitectura Nativa iOS:** Listener `appUrlOpen` inyectado a nivel raíz.
- [x] **Soporte PKCE:** Autenticación fluida con Google/Apple usando In-App Browser.
- [x] **Inconsistencias de Bundle ID resueltas:** `capacitor.config.json` e `Info.plist` alineados.
- [x] **Ajustes de UI Móvil:** Scroll horizontal corregido y botón de "Volver al Mapa" implementado.
- [ ] **Aprobación de TestFlight (Tú):** Descargar el Build 30 en el iPhone y verificar inicio de sesión con Google.
- [ ] **Enviar a Revisión a Apple (Tú):** Hacer clic en "Submit for Review" en App Store Connect con las cuentas de demostración.

---

## 🏭 Fase 2: Inyección de Base de Datos Nacional (DENUE)
> **Objetivo:** Poblar el mapa de todo México utilizando los datos oficiales del INEGI.

- [x] **Herramienta de Importación Creada:** Panel `src/pages/admin/BulkImport.jsx` operativo.
- [x] **Mapeo Automático de Íconos:** 25 subcategorías (farmacias, hospitales, talleres, etc.) en `categoryIcons.js`.
- [ ] **Descargar CSVs del DENUE (Tú):** Ir al portal de INEGI y descargar los bloques de los estados faltantes.
- [ ] **Subir Archivos (Tú):** Entrar al panel de administrador en la web de Geobooker, ir a Importación Masiva y subir los CSV de los estados pendientes. *(Los negocios entrarán como "seed_denue" de forma automática).*

---

## 📈 Fase 3: Operación Comercial (Post-Lanzamiento)
> **Objetivo:** Comenzar la tracción y reclamación de negocios.

- [ ] **Campaña B2B:** Empezar a contactar a los negocios que ya están en el mapa (DENUE) para que hagan clic en "Reclamar Negocio" y se conviertan en usuarios activos.
- [ ] **Monetización Activa:** Ofrecer planes premium y herramientas de anuncios para los negocios que reclamen su perfil.
- [ ] **SEO y Indexación:** Solicitar la indexación de las rutas dinámicas (`/business/[slug]`) en Google Search Console para tráfico orgánico.

---

¡Geobooker está técnicamente listo para conquistar el mercado!
