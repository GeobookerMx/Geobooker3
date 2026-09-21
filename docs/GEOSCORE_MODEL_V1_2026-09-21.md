# GeoScore — modelo V1 explicable

Fecha: 2026-09-21  
Estado: especificación para calibración; no usar aún para decisiones comerciales reales

## Resultado

El motor devuelve:

- `score`: entero 0–100.
- `confidence`: 0–100, separado del score.
- `classification`: desfavorable, limitada, prometedora o fuerte.
- contribución de cada factor y explicación comprensible;
- advertencias por datos faltantes, antiguos o de baja cobertura;
- versión del modelo, fuentes y snapshot.

El score mide ajuste relativo dentro de un perfil de negocio y mercado. No debe compararse directamente entre países o categorías con modelos distintos.

## Fórmula base

```text
raw_score = Σ(normalized_factor_i × effective_weight_i)
effective_weight_i = configured_weight_i × coverage_i × freshness_i
score = round(100 × raw_score / Σ(effective_weight_i))
```

Si la suma de pesos efectivos cae debajo del umbral mínimo, el resultado será `insufficient_data`, no un número inventado.

## Factores V1

| Factor | Peso inicial | Interpretación |
|---|---:|---|
| Demanda potencial | 25 | Población accesible y señales territoriales pertinentes. |
| Competencia | 20 | Saturación y proximidad de competidores, con curva distinta por vertical. |
| Complementariedad | 15 | Presencia de giros que pueden generar visitas o conveniencia. |
| Accesibilidad | 15 | Red vial/peatonal, conectividad y cobertura de isócrona. |
| Densidad/centralidad comercial | 15 | Concentración saludable de actividad, evitando asumir que más siempre es mejor. |
| Calidad y actualidad del dato | 10 | Cobertura, antigüedad, acuerdo entre fuentes y anomalías. |

Los pesos son configuración versionada, no constantes hardcodeadas. La suma inicial es 100.

## Normalización

- Usar percentiles por ciudad/mercado y vertical cuando exista muestra suficiente.
- Aplicar winsorización para que un valor extremo no domine.
- Competencia usa una curva no lineal: poca competencia puede validar demanda; exceso reduce el score.
- Distancias usan bandas y decaimiento, no sólo conteos dentro de un círculo.
- Radios y polígonos deben calcularse con PostGIS; H3 es índice auxiliar para agregación/caché, no reemplazo de point-in-polygon exacto.

## Confianza

```text
confidence = 0.35 coverage
           + 0.25 freshness
           + 0.20 source_agreement
           + 0.20 sample_sufficiency
```

Umbrales propuestos:

- 80–100: alta.
- 60–79: media.
- 40–59: baja; mostrar advertencia prominente.
- menor a 40: insuficiente; no presentar recomendación positiva/negativa.

## Clasificación

- 0–39: desfavorable.
- 40–59: limitada.
- 60–79: prometedora.
- 80–100: fuerte.

La etiqueta sólo se muestra cuando `confidence >= 60`. Estos cortes se calibrarán con casos conocidos y no se comercializarán como probabilidad de éxito.

## Ejemplo de explicación

```json
{
  "score": 72,
  "confidence": 68,
  "classification": "prometedora",
  "model_version": "mx-cafe-1.0.0",
  "factors": [
    {
      "key": "competition",
      "normalized_value": 0.64,
      "weight": 0.20,
      "contribution": 12.8,
      "explanation": "Competencia moderada dentro de 1 km; valida demanda sin saturación extrema."
    }
  ],
  "warnings": [
    "Los datos de población corresponden al Censo 2020.",
    "No existe medición de tráfico peatonal para este punto."
  ]
}
```

## Guardrails de producto

- No afirmar “ventas esperadas”, “retorno garantizado” ni “mejor ubicación” sin evidencia validada.
- No sustituir estudio financiero, visita física, uso de suelo, renta o permisos.
- Mostrar siempre fecha, cobertura, procedencia y limitaciones.
- No usar teléfono, email, identidad o historial individual como factor.
- No reentrenar o cambiar pesos automáticamente con pocos resultados comerciales.
- Un cambio de pesos crea nueva versión; los análisis anteriores no se reescriben.

## Validación necesaria

Para cada vertical y ciudad:

1. Seleccionar ubicaciones fuertes, medias y débiles conocidas.
2. Ejecutar el modelo sin conocer la etiqueta humana.
3. Revisar errores con especialistas locales.
4. Medir estabilidad frente a pequeños movimientos del pin.
5. Comparar snapshots y detectar cambios artificiales por una fuente.
6. Aprobar pesos y umbrales antes del piloto externo.

## Criterios de aceptación del motor

- Misma entrada/modelo/snapshot produce mismo resultado.
- Ningún factor individual aporta más de 30 puntos.
- Resultado parcial identifica exactamente la fuente ausente.
- P95 del cálculo en caché menor a 800 ms; nuevo análisis menor a 12 s.
- 100% de resultados conserva procedencia y versión.
- RLS evita leer análisis de otro usuario.
- Logs no contienen coordenadas completas salvo cuando sean indispensables y con retención definida.

