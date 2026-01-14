-- ==========================================================
-- SISTEMA DE CONTROL FISCAL - GEOBOOKER
-- Tablas para gestión de datos fiscales y facturas
-- ==========================================================

-- 1. TABLA DE CLIENTES FISCALES
-- Almacena los datos fiscales de cada cliente/empresa
CREATE TABLE IF NOT EXISTS fiscal_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Vinculación con usuario (puede ser NULL para clientes externos)
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    
    -- Datos fiscales mexicanos (CFDI)
    rfc TEXT,
    razon_social TEXT,
    regimen_fiscal TEXT,
    uso_cfdi TEXT DEFAULT 'G03', -- Gastos en general
    codigo_postal TEXT,
    
    -- Datos para clientes internacionales
    tax_id TEXT,
    company_name TEXT,
    billing_country TEXT DEFAULT 'MX',
    billing_address TEXT,
    billing_city TEXT,
    billing_state TEXT,
    
    -- Contacto
    contact_name TEXT,
    contact_phone TEXT,
    
    -- Metadatos
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_fiscal_clients_rfc ON fiscal_clients(rfc);
CREATE INDEX IF NOT EXISTS idx_fiscal_clients_email ON fiscal_clients(email);
CREATE INDEX IF NOT EXISTS idx_fiscal_clients_user ON fiscal_clients(user_id);

-- 2. TABLA DE FACTURAS EMITIDAS
-- Registro completo de cada factura/CFDI generado
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    campaign_id UUID REFERENCES ad_campaigns(id),
    fiscal_client_id UUID REFERENCES fiscal_clients(id),
    
    -- Identificadores de factura
    invoice_number TEXT, -- Folio interno: GEO-2026-0001
    cfdi_uuid TEXT, -- UUID del SAT
    cfdi_serie TEXT DEFAULT 'A',
    cfdi_folio TEXT,
    
    -- Archivos
    cfdi_xml_url TEXT,
    cfdi_pdf_url TEXT,
    
    -- Montos
    subtotal DECIMAL(12,2) NOT NULL,
    iva_rate DECIMAL(4,2) DEFAULT 16.00,
    iva_amount DECIMAL(12,2) DEFAULT 0,
    isr_retenido DECIMAL(12,2) DEFAULT 0,
    iva_retenido DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'MXN',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    
    -- Datos del pago
    payment_method TEXT DEFAULT 'TDC', -- TDC, Transferencia, OXXO
    payment_form TEXT DEFAULT '04', -- 04=Tarjeta, 03=Transferencia
    stripe_payment_id TEXT,
    
    -- Estados
    status TEXT DEFAULT 'pending', 
    -- pending, generated, sent, cancelled, refunded
    
    -- Fechas importantes
    invoice_date TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Notas y metadatos
    concept TEXT DEFAULT 'Servicios de publicidad digital',
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_invoices_campaign ON invoices(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(fiscal_client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Secuencia para folios automáticos
CREATE SEQUENCE IF NOT EXISTS invoice_folio_seq START 1;

-- 3. FUNCIÓN PARA GENERAR FOLIO AUTOMÁTICO
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_folio INTEGER;
    year_part TEXT;
BEGIN
    SELECT nextval('invoice_folio_seq') INTO new_folio;
    year_part := to_char(NOW(), 'YYYY');
    RETURN 'GEO-' || year_part || '-' || LPAD(new_folio::TEXT, 4, '0');
END;
$$;

-- 4. TRIGGER PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fiscal_clients_updated_at ON fiscal_clients;
CREATE TRIGGER update_fiscal_clients_updated_at
    BEFORE UPDATE ON fiscal_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. ROW LEVEL SECURITY
ALTER TABLE fiscal_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Políticas para fiscal_clients
DROP POLICY IF EXISTS "Admin full access fiscal_clients" ON fiscal_clients;
CREATE POLICY "Admin full access fiscal_clients" ON fiscal_clients
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users view own fiscal data" ON fiscal_clients;
CREATE POLICY "Users view own fiscal data" ON fiscal_clients
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own fiscal data" ON fiscal_clients;
CREATE POLICY "Users can create own fiscal data" ON fiscal_clients
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own fiscal data" ON fiscal_clients;
CREATE POLICY "Users can update own fiscal data" ON fiscal_clients
    FOR UPDATE USING (user_id = auth.uid());

-- Políticas para invoices
DROP POLICY IF EXISTS "Admin full access invoices" ON invoices;
CREATE POLICY "Admin full access invoices" ON invoices
    FOR ALL USING (
        EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users view own invoices" ON invoices;
CREATE POLICY "Users view own invoices" ON invoices
    FOR SELECT USING (
        fiscal_client_id IN (
            SELECT id FROM fiscal_clients WHERE user_id = auth.uid()
        )
    );

-- 6. VISTA RESUMEN FISCAL
CREATE OR REPLACE VIEW fiscal_summary AS
SELECT 
    DATE_TRUNC('month', i.invoice_date) as month,
    COUNT(*) as total_invoices,
    SUM(i.subtotal) as subtotal_total,
    SUM(i.iva_amount) as iva_total,
    SUM(i.total) as revenue_total,
    COUNT(CASE WHEN i.status = 'sent' THEN 1 END) as sent_count,
    COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN i.status = 'cancelled' THEN 1 END) as cancelled_count
FROM invoices i
WHERE i.invoice_date IS NOT NULL
GROUP BY DATE_TRUNC('month', i.invoice_date)
ORDER BY month DESC;

-- 7. PERMISOS
GRANT SELECT, INSERT, UPDATE ON fiscal_clients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON invoices TO authenticated;
GRANT SELECT ON fiscal_summary TO authenticated;
GRANT USAGE ON SEQUENCE invoice_folio_seq TO authenticated;

-- Confirmación
SELECT 'Sistema fiscal creado correctamente' as status;
