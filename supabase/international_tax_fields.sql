-- ==============================================================================
-- MIGRACIÓN: CAMPOS FISCALES PARA CAMPAÑAS INTERNACIONALES
-- ==============================================================================
-- Agrega campos para manejo correcto de IVA y exportaciones
-- ==============================================================================

-- 1. Estado fiscal de la campaña
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'pending';
-- Valores posibles:
-- 'pending': Pendiente de verificación
-- 'domestic_mx': Cliente mexicano, IVA 16%
-- 'export_0_iva': Exportación, tasa 0%
-- 'eu_reverse_charge': Cliente UE con Reverse Charge

-- 2. TAX ID del cliente verificado
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS client_tax_id TEXT;

ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS tax_id_verified BOOLEAN DEFAULT false;

-- 3. País del cliente (para facturación)
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS billing_country TEXT;

-- 4. Tipo de documento fiscal emitido
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS invoice_type TEXT;
-- 'cfdi_ingreso': Factura mexicana normal
-- 'cfdi_export': CFDI de exportación
-- 'invoice_intl': Invoice internacional

-- 5. Referencia a la factura
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- 6. Comentarios para documentación
COMMENT ON COLUMN ad_campaigns.tax_status IS 'Estado fiscal: pending, domestic_mx, export_0_iva, eu_reverse_charge';
COMMENT ON COLUMN ad_campaigns.client_tax_id IS 'RFC (México), VAT ID (UE), EIN (USA)';
COMMENT ON COLUMN ad_campaigns.billing_country IS 'País de facturación del cliente (ISO 3166-1 alpha-2)';

-- ==============================================================================
-- NOTA FISCAL IMPORTANTE:
-- 
-- Para clientes EXTRANJEROS (fuera de México):
-- - IVA tasa 0% (exportación de servicios digitales)
-- - Emitir CFDI tipo Exportación
-- - No se retiene ISR
-- 
-- Para clientes MEXICANOS:
-- - IVA 16%
-- - Si es persona moral: retención ISR 1.25%
-- - CFDI tipo Ingreso normal
-- ==============================================================================
