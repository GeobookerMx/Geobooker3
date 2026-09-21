# Geobooker GeoScore — Fase 1 de arquitectura

Fecha: 2026-09-21  
Estado: diseño aprobado para implementación aislada; sin migraciones ni cambios productivos

## 1. Decisión de alcance

GeoScore V1 será un producto de inteligencia de ubicación para evaluar un punto comercial. No será una promesa de ventas, afluencia ni rentabilidad. El resultado deberá mostrar puntuación, factores, calidad de datos, procedencia y fecha de actualización.

El primer MVP se limita a:

- México.
- Tres verticales: cafetería, farmacia y autolavado.
- Punto elegido manualmente o mediante búsqueda de dirección.
- Radios de 500 m y 1 km.
- Un isócrono peatonal de 10 minutos, sólo cuando el proveedor de ruteo esté disponible.
- Competencia, complementariedad, densidad de negocios, población accesible y accesibilidad básica.
- Guardar y consultar análisis propios.

Quedan fuera del MVP: tráfico en tiempo real, predicción de ventas, recomendación automática de renta, comparación masiva de ubicaciones, automóvil/bicicleta, PDF comercial, señales individuales de usuarios y lanzamiento internacional.

## 2. Arquitectura objetivo

```text
PWA / iOS / Android
  -> GeoScore API / Edge Function autenticada
  -> motor de análisis versionado
  -> Postgres + PostGIS
     -> catálogos y mappings
     -> snapshots normalizados de fuentes
     -> análisis, factores y procedencia
  -> adaptadores externos server-side
     -> INEGI DENUE
     -> INEGI Censo/AGEB
     -> Overture/OSM
     -> ruteo/isócronas
```

Reglas:

- El navegador nunca recibe tokens de proveedores.
- El cliente solicita un análisis; no construye el score.
- Cada resultado guarda `model_version`, `data_snapshot_at`, fuentes y cobertura.
- La API responde desde caché para el mismo punto/categoría/modelo mientras siga vigente.
- Ninguna fuente externa puede bloquear la app principal: se aplican timeout, circuit breaker y resultado degradado.
- La función queda detrás de una bandera server-side fail-closed; una bandera Vite no es control suficiente.

## 3. Reutilización segura del sistema actual

| Activo actual | Decisión |
|---|---|
| PostGIS, búsquedas por radio e índices GiST | Reutilizar. |
| `import_batches`, `staging_denue`, `business_candidates` | Reutilizar como pipeline de ingestión, agregando procedencia/versionado. |
| `business_categories`, aliases y mappings | Reutilizar como taxonomía canónica. |
| `business_intent_logs` y `search_logs` | No incluir en el score inicial; preparar sólo señales agregadas con umbrales de privacidad. |
| Google Maps del buscador actual | No reemplazar en V1. GeoScore debe vivir aislado y usar una interfaz de proveedor de mapa. |
| `reportService.js` con jsPDF cliente | No reutilizar para informes oficiales; un PDF posterior deberá generarse server-side. |
| `shareService.js` | Reutilizar después para enlaces canónicos de análisis compartibles. |
| flags Vite actuales | Mantener para UI, pero añadir flag server-side antes de exponer APIs o datos. |

## 4. Deuda que debe resolverse antes del SQL de GeoScore

### 4.1 Geografía duplicada

Actualmente `businesses` puede tener `geog` y `location`. GeoScore no debe crear una tercera columna.

Decisión propuesta:

- `location geography(Point,4326)` será la columna canónica para entidades nuevas.
- Auditar tipos, nulabilidad, triggers, índices y RPC existentes en producción.
- Migrar lectores de `geog` de manera compatible antes de retirarla.
- No borrar ninguna columna en la primera migración.

### 4.2 Permisos móviles

GeoScore requiere ubicación puntual, no rastreo continuo.

- iOS: conservar `NSLocationWhenInUseUsageDescription`; retirar el permiso “Always” en el release móvil posterior a una auditoría nativa.
- Android/Capacitor: cambiar la intención de `always` a ubicación al usar la aplicación.
- Ofrecer selección manual del punto si la persona rechaza el permiso.
- No almacenar recorridos ni ubicación en segundo plano.

### 4.3 Exposición de datos

- Crear un esquema aislado `location_intelligence` o equivalente.
- RLS obligatorio y políticas por propietario/rol.
- Cálculo y escritura sólo mediante backend.
- No exponer staging crudo a `anon` o `authenticated`.
- Los datasets de proveedores deben conservar licencia, atribución, versión y fecha.

## 5. Entidades de datos propuestas

No ejecutar todavía; nombres sujetos a reconciliación con producción.

- `li_analyses`: punto, vertical, radios, score, confianza, modelo, estado y propietario.
- `li_analysis_factors`: factor, valor bruto, valor normalizado, peso, contribución y explicación.
- `li_analysis_sources`: fuente, versión, licencia, consultada/en caché, fecha y cobertura.
- `li_category_profiles`: pesos y reglas versionados por país/vertical.
- `li_source_snapshots`: manifiesto de cada carga; no duplica innecesariamente datos crudos.
- `li_isochrones`: geometría simplificada, modo, minutos, proveedor y expiración.
- `li_feature_flags`: activación server-side por entorno/rol/mercado.
- `li_audit_log`: ejecución, correlation ID, duración, errores sanitizados y versión del modelo.

Se deberá añadir una llave de idempotencia derivada de punto redondeado, vertical, parámetros y versión del modelo.

## 6. API inicial

- `POST /geoscore/analyses`: crea o devuelve análisis idempotente.
- `GET /geoscore/analyses/:id`: devuelve resultado sólo si el actor está autorizado.
- `GET /geoscore/catalog/categories?country=MX`: perfiles habilitados.
- `GET /geoscore/analyses/:id/map`: capas generalizadas para el mapa.
- `GET /geoscore/health`: estado sanitizado de fuentes y caché, sólo admin.

Límites iniciales:

- 10 análisis/día por usuario en piloto.
- Timeout total de 12 segundos; respuesta `partial` cuando una fuente no crítica falle.
- Coordenadas validadas y restringidas al país/mercado habilitado.
- Sin consultas arbitrarias, SQL, URLs o radios enviados por el cliente.

## 7. Privacidad y seguridad

- El score utiliza datos de establecimientos y agregados territoriales, no perfiles personales.
- Señales propias futuras sólo se agregan cuando el grupo cumpla un umbral mínimo (propuesta inicial: 20 eventos y al menos 10 dispositivos no identificables por celda/periodo).
- No guardar coordenadas GPS de uso único más allá de lo necesario para el análisis elegido por el usuario.
- No inferir atributos sensibles ni mostrar microdatos censales individualizables.
- Separar datos públicos/licenciados, datos derivados y datos propios.
- Registrar atribuciones visibles en mapa, ficha e informe.

## 8. Estrategia de mapa y ruteo

- No sustituir Google Maps en el producto actual durante el MVP.
- Implementar un `MapProvider` para que GeoScore pueda comenzar aislado con MapLibre u otro proveedor.
- No utilizar el Nominatim público para autocompletado o geocodificación masiva.
- Para piloto se permite geocodificación directa de bajo volumen con caché y proveedor configurable; para escala usar servicio contratado o instancia propia.
- Las isócronas deben calcularse server-side y almacenarse temporalmente. Si no están disponibles, mostrar radios, nunca inventar tiempo de traslado.

## 9. Fases de entrega

1. **Fase 1 — arquitectura y fuentes (completada):** alcance, reutilización, riesgos, modelo, privacidad y criterios de entrada.
2. **Fase 2 — base de datos y feature gate (3–5 días):** auditoría productiva, migraciones reversibles, RLS, catálogos y pruebas SQL.
3. **Fase 3 — ingestión y normalización (5–8 días):** DENUE, Censo/AGEB y una fuente global de POI, con manifests y deduplicación.
4. **Fase 4 — motor GeoScore V1 (6–10 días):** factores, confianza, explicabilidad, caché y pruebas de regresión.
5. **Fase 5 — experiencia web aislada (5–8 días):** selección de punto, mapa, resultado, estados degradados y accesibilidad.
6. **Fase 6 — piloto y calibración (5–10 días):** ciudades/verticales de referencia, falsos positivos, rendimiento y costos.
7. **Fase 7 — integración móvil y release gate (4–7 días):** permisos JIT, Capacitor, pruebas iOS/Android, observabilidad y rollback.

Estimación: MVP web útil en 4–6 semanas; versión completa del prompt original en 9–15 semanas de trabajo individual. GeoScore no debe retrasar una versión estable de Geobooker: se desarrolla detrás de bandera y se publica sólo después del piloto.

## 10. Criterios para iniciar Fase 2

- WhatsApp Center permanece estable y `WHATSAPP_SEND_ENABLED=false` hasta su piloto autorizado.
- Inventario productivo de `businesses.geog` y `businesses.location` confirmado.
- Fuente, licencia y atribución aceptadas para cada capa.
- Tres perfiles de categoría aprobados.
- Definición explícita de qué significa 0 y 100 y de los límites de cada factor.
- Presupuesto mensual y cuotas de proveedores definidos.
- Feature flag server-side y rollback aprobados.

## 11. Estado

**IMPLEMENTADO:** diseño, alcance MVP, mapa de reutilización y riesgos.  
**PARCIAL:** fuentes candidatas y modelo de score; requieren prueba de cobertura.  
**PENDIENTE:** migración, ingestión, motor, UI, piloto y mobile.  
**BLOQUEADO:** nada técnico; Fase 2 requiere auditoría read-only del esquema real antes de generar SQL.

