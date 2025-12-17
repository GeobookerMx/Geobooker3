# 🌍 Guía de Cumplimiento Fiscal y Pagos Internacionales

## Marco Legal: Geobooker como Exportadora de Software

### ✅ IVA en Exportación de Servicios Digitales (México)

> **Marco Legal**: Ley del IVA, Artículo 29, Fracción IV

**Los servicios digitales exportados desde México están exentos de IVA (tasa 0%)** cuando:
1. El cliente está domiciliado en el extranjero
2. El servicio se aprovecha 100% fuera de México
3. El pago se recibe desde el extranjero

**Implicaciones para Geobooker:**
- Campañas de clientes extranjeros → **Tasa 0% IVA**
- Campañas de clientes mexicanos → **16% IVA**
- Debemos emitir CFDI de exportación para clientes internacionales

---

## 💳 Flujo de Pagos por Región

### Stripe: Soporte Multi-Moneda

```
┌─────────────────────────────────────────────────────────────┐
│                  GEOBOOKER PAYMENTS                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   CLIENTE          STRIPE           GEOBOOKER               │
│   ───────          ──────           ─────────               │
│                                                              │
│   🇺🇸 USD    ──→   Charge USD  ──→  Recibe MXN/USD         │
│   🇪🇺 EUR    ──→   Charge EUR  ──→  Recibe MXN/USD         │
│   🇲🇽 MXN    ──→   Charge MXN  ──→  Recibe MXN             │
│   🇧🇷 BRL    ──→   Charge BRL  ──→  Recibe MXN/USD         │
│                                                              │
│   * Stripe convierte automáticamente                        │
│   * Fee: ~2.9% + $0.30 USD por transacción                  │
│   * Wire transfer disponible para enterprise                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Métodos de Pago por Región

| Región | Métodos Aceptados | Moneda |
|--------|-------------------|--------|
| 🇺🇸 USA/Canada | Visa, Mastercard, Amex, ACH | USD/CAD |
| 🇪🇺 Europa | Visa, MC, SEPA, Bancontact | EUR/GBP |
| 🇲🇽 México | Visa, MC, OXXO, SPEI | MXN |
| 🇧🇷 Brasil | Visa, MC, Boleto, PIX | BRL |
| 🇦🇷 Argentina | Visa, MC, Mercado Pago | ARS/USD |
| 🌐 Otros | Visa, Mastercard | USD |

---

## 📋 Requisitos Fiscales por País del Cliente

### 1. Estados Unidos 🇺🇸
- **Requisito del cliente**: W-8BEN-E (formulario de retención)
- **IVA/Sales Tax**: No aplica (B2B digital services)
- **Factura**: Invoice en inglés, sin IVA
- **Retención**: 0% si hay tratado fiscal México-USA

### 2. Unión Europea 🇪🇺
- **Requisito del cliente**: VAT ID (número de IVA europeo)
- **IVA**: Reverse Charge (cliente paga IVA en su país)
- **Factura**: Invoice con "Reverse Charge" indicado
- **Nota**: Validar VAT ID en VIES de la UE

### 3. Canadá 🇨🇦
- **IVA (GST/HST)**: No aplica para servicios digitales B2B
- **Factura**: Invoice en inglés
- **Nota**: Similar a USA

### 4. LATAM (Excepto México)
- **Brasil**: NFSe electrónica no requerida (exportación)
- **Argentina**: Factura tipo E (exportación)
- **Colombia, Chile, Perú**: Invoice + certificado de residencia
- **IVA**: Generalmente 0% por exportación

### 5. México 🇲🇽
- **Factura**: CFDI obligatorio
- **IVA**: 16%
- **Retención ISR**: 1.25% si cliente es persona moral
- **RESICO**: Verificar régimen del cliente

---

## 🏛️ Obligaciones de Geobooker ante el SAT

### 1. Registro como Exportador de Servicios
- [ ] Inscripción en el RFC con actividad de exportación
- [ ] Registro en el Padrón de Exportadores Sectorial (si aplica)

### 2. Facturación
| Tipo de Cliente | Factura | IVA |
|-----------------|---------|-----|
| México persona física | CFDI | 16% |
| México persona moral | CFDI + Retención 1.25% | 16% |
| Extranjero | CFDI Exportación | 0% |

### 3. CFDI de Exportación
```
Tipo de Comprobante: Ingreso
Uso CFDI: G01 - Adquisición de mercancías
Clave de Producto: 43232900 - Servicios de publicidad en internet
Método de Pago: PPD (Pago en parcialidades o diferido) o PUE
Tipo de Cambio: El del día de facturación (DOF)
```

### 4. Declaraciones
- **Mensual**: Declarar ingresos por exportación con IVA 0%
- **Anual**: Incluir en DIOT (Declaración de Operaciones con Terceros)
- **Informativa**: Operaciones con partes relacionadas del extranjero

---

## ⚠️ Consideraciones Especiales

### Limitaciones de Cupo (Ya Implementado)
- Solo vendemos espacios publicitarios disponibles
- El sistema valida disponibilidad antes de checkout
- Dashboard muestra ocupación por espacio

### Regulaciones de Publicidad por País

| País | Restricciones |
|------|---------------|
| 🇺🇸 USA | Alcohol: Age gates requeridos |
| 🇪🇺 UE | GDPR compliance en creativos |
| 🇲🇽 México | PROFECO: No publicidad engañosa |
| 🇧🇷 Brasil | CONAR: Regulación de bebidas |

### Prohibiciones Globales
- ❌ Tabaco
- ❌ Armas
- ❌ Apuestas (sin licencia)
- ❌ Contenido para adultos
- ❌ Productos ilegales

---

## 🔧 Implementación Técnica Recomendada

### 1. Agregar campo `tax_status` a campañas:
```sql
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'pending';
-- 'pending', 'domestic_mx', 'export_0_iva', 'eu_reverse_charge'

ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS tax_id_verified BOOLEAN DEFAULT false;
```

### 2. Flujo de Checkout con Validación Fiscal:
1. Cliente selecciona país
2. Si país ≠ México → Solicitar TAX ID/VAT
3. Validar TAX ID (API VIES para EU, formato para otros)
4. Aplicar pricing sin IVA (export)
5. Generar factura apropiada

### 3. Stripe Tax (Opcional)
Stripe ofrece Stripe Tax para calcular impuestos automáticamente:
- Detecta ubicación del cliente
- Aplica IVA/GST/VAT correcto
- Genera reportes para declaraciones

---

## ✅ Próximos Pasos

1. [ ] Consultar con contador sobre Padrón de Exportadores
2. [ ] Implementar campo `tax_status` en ad_campaigns
3. [ ] Agregar validación de VAT ID europeo (API VIES)
4. [ ] Crear plantilla de Invoice para exportación
5. [ ] Configurar Stripe Tax (opcional)
6. [ ] Agregar términos legales de publicidad en /enterprise
