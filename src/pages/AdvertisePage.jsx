// src/pages/AdvertisePage.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import {
  Monitor,
  Smartphone,
  Globe,
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Info,
} from "lucide-react";

/**
 * Metadatos adicionales por espacio publicitario.
 * Se combinan con lo que viene de la BD (ad_spaces).
 */
const AD_SPACE_META = {
  impulso_local: {
    prioridad: "Local",
    tipoLabel: "Tarjeta patrocinada en ciudad y categoría",
    badge: "Más popular",
    idealPara:
      "Negocios locales que quieren aparecer primero en búsquedas de su ciudad y categoría.",
    features: [
      "Tarjeta patrocinada en resultados de búsqueda",
      "Presencia en página de ciudad y categoría",
      "CTA directo: WhatsApp, llamar, ruta",
      "Badge de 'Patrocinado' visible",
      "Métricas: impresiones, clics, CTR, taps WhatsApp",
      "Duración: 30 días"
    ]
  },
  sponsor_ciudad: {
    prioridad: "Premium",
    tipoLabel: "Hero principal + tarjeta + pin en mapa",
    badge: "Máxima visibilidad",
    idealPara:
      "Negocios que quieren dominar su ciudad o categoría con presencia premium.",
    features: [
      "Hero banner principal en página de ciudad",
      "Tarjeta patrocinada incluida",
      "Pin destacado en el mapa interactivo",
      "Presencia en carrusel de destacados",
      "Métricas avanzadas + reporte PDF mensual",
      "Duración: 30 días"
    ]
  },
  enterprise: {
    prioridad: "Enterprise",
    tipoLabel: "Multi-ciudad, multi-sucursal, campañas regionales/globales",
    badge: "Máximo alcance",
    idealPara:
      "Cadenas, franquicias y marcas que necesitan presencia en múltiples ciudades o países.",
    features: [
      "Cobertura multi-ciudad y multi-país",
      "Dashboard corporativo con KPIs por sucursal",
      "Campañas segmentadas por zona y categoría",
      "Reportes semanales personalizados",
      "Account manager dedicado",
      "Soporte IVA 0% para clientes internacionales"
    ]
  },
};

// Datos de respaldo si la BD falla
const MOCK_SPACES = [
  {
    id: "1",
    name: "impulso_local",
    display_name: "Impulso Local",
    type: "local",
    price_monthly: 990,
    size_desktop: "Responsive",
    size_mobile: "Responsive",
    description: "Aparece en los primeros resultados de tu ciudad y categoría. Incluye CTA directo a WhatsApp, llamada o ruta.",
    max_slots: 20,
    duration_label: "30 días",
  },
  {
    id: "2",
    name: "sponsor_ciudad",
    display_name: "Sponsor de Ciudad",
    type: "premium",
    price_monthly: 2990,
    size_desktop: "970x250",
    size_mobile: "320x100",
    description: "Domina tu ciudad con hero banner principal, tarjeta patrocinada y pin destacado en el mapa.",
    max_slots: 3,
    duration_label: "30 días",
  },
  {
    id: "3",
    name: "enterprise",
    display_name: "Enterprise / Multi-Ciudad",
    type: "enterprise",
    price_monthly: 9900,
    size_desktop: "Personalizado",
    size_mobile: "Personalizado",
    description: "Cobertura multi-ciudad y multi-país. Dashboard corporativo con KPIs por sucursal. Cotización personalizada.",
    max_slots: 5,
    duration_label: "Cotización",
  },
];

/**
 * Configuración de promoción de lanzamiento
 */
const PROMO_CONFIG = {
  discountPercent: 50,
  endDate: new Date('2026-08-01T23:59:59'),
  isActive: () => new Date() < PROMO_CONFIG.endDate
};

const IVA_RATE = 0.16;

/**
 * Helper para formatear el precio visible al usuario
 * - Para Resultados Patrocinados usamos la descripción PPC
 * - Para el resto usamos price_monthly con descuento de lanzamiento
 * - Todos los precios muestran +IVA
 */
function getPricingLabel(space) {
  const meta = AD_SPACE_META[space.name];

  // Enterprise es por cotización
  if (space.name === 'enterprise') {
    return {
      display: 'Desde $9,900 MXN / mes',
      original: null,
      hasDiscount: false,
      ivaDisplay: 'Cotización personalizada',
      isEnterprise: true
    };
  }

  const price = Number(space.price_monthly || 0);
  if (!price || Number.isNaN(price)) return { display: "Consultar precio", original: null, hasDiscount: false };

  if (PROMO_CONFIG.isActive()) {
    const discountedPrice = Math.round(price * (1 - PROMO_CONFIG.discountPercent / 100));
    const ivaAmount = Math.round(discountedPrice * IVA_RATE);
    const totalWithIva = discountedPrice + ivaAmount;
    return {
      display: `$${discountedPrice.toLocaleString("es-MX")} MXN / mes`,
      original: `$${price.toLocaleString("es-MX")} MXN`,
      hasDiscount: true,
      discountPercent: PROMO_CONFIG.discountPercent,
      ivaDisplay: `+ $${ivaAmount.toLocaleString("es-MX")} IVA = $${totalWithIva.toLocaleString("es-MX")} total`,
      totalWithIva
    };
  }

  const ivaAmount = Math.round(price * IVA_RATE);
  const totalWithIva = price + ivaAmount;
  return {
    display: `$${price.toLocaleString("es-MX")} MXN / mes`,
    original: null,
    hasDiscount: false,
    ivaDisplay: `+ $${ivaAmount.toLocaleString("es-MX")} IVA = $${totalWithIva.toLocaleString("es-MX")} total`,
    totalWithIva
  };
}

/**
 * Devuelve metadatos enriquecidos combinando BD + tabla meta
 */
function enrichSpace(space) {
  const meta = AD_SPACE_META[space.name] || {};
  return {
    ...space,
    prioridad:
      meta.prioridad ||
      (space.type === "1ra_plana"
        ? "1ra plana"
        : space.type === "2da_plana"
          ? "2da plana"
          : space.type),
    tipoLabel: meta.tipoLabel || "Espacio publicitario",
    badge: meta.badge || null,
    idealPara:
      meta.idealPara ||
      "Espacio de visibilidad para conectar con clientes en Geobooker.",
    pricingLabel: getPricingLabel(space),
  };
}

const AdvertisePage = () => {
  const [adSpaces, setAdSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      console.log("Cargando espacios publicitarios...");
      const { data, error } = await supabase
        .from("ad_spaces")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        console.warn("No hay datos en DB, usando MOCK_SPACES");
        setAdSpaces(MOCK_SPACES.map(enrichSpace));
      } else {
        setAdSpaces(data.map(enrichSpace));
      }
    } catch (err) {
      console.error("Error cargando espacios, usando respaldo:", err);
      setAdSpaces(MOCK_SPACES.map(enrichSpace));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSpace = (spaceId) => {
    navigate(`/advertise/create?space=${spaceId}`);
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* PROMO BANNER STICKY */}
      {PROMO_CONFIG.isActive() && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <span className="font-bold">¡PROMO ESPECIAL! 50% OFF en todos los espacios</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="opacity-90">Válido hasta:</span>
              <span className="bg-white/20 backdrop-blur px-3 py-1 rounded font-bold">
                1 de Agosto 2026
              </span>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <div className="bg-[#1e3a8a] text-white py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-400 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
            Publicítate en <span className="text-yellow-300">Geobooker</span> y
            haz crecer tu negocio
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Aparece en la primera plana, en resultados patrocinados y en
            posiciones clave cuando tus clientes están buscando servicios como
            los tuyos.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center bg-blue-800/60 px-4 py-2 rounded-full border border-blue-400">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-xs md:text-sm font-medium">
                Segmentación por país e idioma
              </span>
            </div>
            <div className="flex items-center bg-blue-800/60 px-4 py-2 rounded-full border border-blue-400">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-xs md:text-sm font-medium">
                Resultados medibles (impresiones, clics, CTR)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 py-16">

        {/* TÍTULO DE ESPACIOS - AHORA PRIMERO */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Elige el espacio ideal para tu marca
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Cada espacio está diseñado para un momento distinto del usuario:
            cuando entra a la plataforma, cuando busca algo específico o
            mientras navega entre resultados.
          </p>
        </div>

        {/* CARDS DE ESPACIOS - AHORA PRIMERO */}
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : adSpaces.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-red-300">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Sistema en mantenimiento
            </h3>
            <p className="text-gray-600 mb-6">
              No se encontraron espacios publicitarios activos.
            </p>
            <p className="text-xs text-gray-400 bg-gray-100 p-2 inline-block rounded">
              Admin: Ejecuta <code>supabase/seed_ads_data.sql</code> en el SQL
              Editor.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {adSpaces.map((space) => (
              <div
                key={space.id}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow flex flex-col relative group"
              >
                {/* Badge popular */}
                {space.name === "impulso_local" && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                    MÁS POPULAR
                  </div>
                )}

                <div className="p-7 flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`p-3 rounded-xl ${space.type === "enterprise"
                        ? "bg-purple-100 text-purple-600"
                        : space.type === "premium"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-600"
                        }`}
                    >
                      {space.type === "enterprise" ? (
                        <Globe className="w-6 h-6" />
                      ) : space.type === "premium" ? (
                        <Monitor className="w-6 h-6" />
                      ) : (
                        <TrendingUp className="w-6 h-6" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wide">
                      {space.prioridad}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {space.display_name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    {space.tipoLabel}
                  </p>

                  {space.badge && (
                    <p className="inline-flex items-center text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mb-3">
                      {space.badge}
                    </p>
                  )}

                  <p className="text-gray-600 text-sm mb-5 min-h-[40px]">
                    {space.description ||
                      "Espacio premium de alta visibilidad para maximizar tu alcance."}
                  </p>

                  {/* Precio visible con descuento + IVA */}
                  <div className="mb-4">
                    <p className="text-[11px] uppercase text-gray-500 font-semibold">
                      Inversión mensual
                    </p>
                    {space.pricingLabel.hasDiscount && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                          -{space.pricingLabel.discountPercent}% PROMO
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-2">
                      {space.pricingLabel.original && (
                        <span className="text-sm text-gray-400 line-through">
                          {space.pricingLabel.original}
                        </span>
                      )}
                      <p className="text-lg font-bold text-green-600">
                        {space.pricingLabel.display}
                      </p>
                    </div>
                    {space.pricingLabel.ivaDisplay && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        {space.pricingLabel.isEnterprise
                          ? space.pricingLabel.ivaDisplay
                          : `🇲🇽 México: ${space.pricingLabel.ivaDisplay}`}
                      </p>
                    )}
                    {!space.pricingLabel.isEnterprise && (
                      <p className="text-[10px] text-blue-500 mt-0.5">
                        🌍 Internacional: IVA 0% (exportación de servicios)
                      </p>
                    )}
                  </div>

                  {/* Características - Features list */}
                  <ul className="space-y-2 mb-4 text-xs text-gray-600 flex-1">
                    {(AD_SPACE_META[space.name]?.features || []).map((feature, idx) => (
                      <li key={idx} className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {typeof space.max_slots !== "undefined" && (
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        Cupo: {space.max_slots} espacios disponibles
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-6 bg-gray-50 mt-auto border-t border-gray-100">
                  {space.name === 'enterprise' ? (
                    <a
                      href="/enterprise"
                      className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center justify-center group-hover:scale-[1.02] transform text-sm"
                    >
                      Solicitar cotización
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </a>
                  ) : (
                    <button
                      onClick={() => handleSelectSpace(space.id)}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center group-hover:scale-[1.02] transform text-sm"
                    >
                      Crear campaña
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STATS - MOVIDO ABAJO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-16 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 mb-1">25+</h3>
            <p className="text-gray-500 font-medium text-sm">
              Países alcanzados
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 mb-1">1M+</h3>
            <p className="text-gray-500 font-medium text-sm">
              Impresiones mensuales proyectadas
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-4xl font-bold text-gray-900 mb-1">3X</h3>
            <p className="text-gray-500 font-medium text-sm">
              Retorno promedio estimado
            </p>
          </div>
        </div>

        {/* BENEFICIOS ENTERPRISE - NUEVO */}
        <div className="my-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full mb-4">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">Beneficios Enterprise</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Más que Publicidad: Una Plataforma Completa
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Al publicitarte en Geobooker, accedes a herramientas empresariales avanzadas
              para gestionar y hacer crecer tu negocio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Beneficio 1: Abre y Cierra Digitalmente */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">⏰</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Abre y Cierra Digitalmente
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Controla el horario de tu negocio desde cualquier dispositivo.
                Tus clientes siempre sabrán  si estás disponible.
              </p>
            </div>

            {/* Beneficio 2: Siempre en el Mapa */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border-2 border-green-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-green-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Siempre en el Mapa
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Tu negocio visible 24/7 en el mapa interactivo de Geobooker.
                Nunca pierdas un cliente potencial.
              </p>
            </div>

            {/* Beneficio 3: Multi-Ubicación */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border-2 border-purple-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🏢</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Multi-Ubicación
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Gestiona múltiples sucursales desde un solo dashboard.
                Reportes unificados y control centralizado.
              </p>
            </div>

            {/* Beneficio 4: Programa de Referidos */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border-2 border-amber-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="bg-amber-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🎁</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Programa de Referidos
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Sistema de referidos integrado: tus clientes invitan, tú ganas.
                Recompensas automáticas y tracking en tiempo real.
              </p>
            </div>
          </div>

          {/* CTA Enterprise */}
          <div className="mt-10 text-center">
            <Link
              to="/enterprise"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all hover:scale-105"
            >
              Conocer Planes Enterprise
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              Herramientas avanzadas para empresas que quieren crecer
            </p>
          </div>
        </div>

        {/* AVISOS IMPORTANTES - MOVIDO ABAJO */}
        <div className="max-w-4xl mx-auto mb-10 grid md:grid-cols-3 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div>
                <h4 className="font-semibold text-amber-800 text-sm">Revisión: 24-48 hrs</h4>
                <p className="text-xs text-amber-700 mt-1">Tu campaña será revisada antes de publicarse para asegurar que cumple con nuestras políticas.</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧾</span>
              <div>
                <h4 className="font-semibold text-blue-800 text-sm">Facturación automática</h4>
                <p className="text-xs text-blue-700 mt-1">Recibirás tu factura por email cuando tu campaña entre en pauta activa.</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h4 className="font-semibold text-amber-800 text-sm">Precios + IVA (México)</h4>
                <p className="text-xs text-amber-700 mt-1">
                  <strong>Clientes en México:</strong> Todos los precios están sujetos a +16% IVA adicional.
                  <strong>Clientes internacionales:</strong> Tasa 0% IVA (exportación).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MINI MANUAL OPERATIVO / NOTAS */}
        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {/* Flujo operativo */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              ¿Cómo funciona la contratación de anuncios?
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                Eliges el espacio publicitario que mejor se adapta a tu
                objetivo: visibilidad, clics o impacto.
              </li>
              <li>
                Creas tu campaña con imagen, texto, URL y llamada a la acción
                (CTA).
              </li>
              <li>
                Tu campaña entra en estado{" "}
                <span className="font-semibold">"Pendiente de revisión"</span>{" "}
                para validar que cumpla las políticas de contenido.
              </li>
              <li>
                Una vez aprobada por el equipo de Geobooker, pasa a estado{" "}
                <span className="font-semibold">"Activa"</span> y comienza a
                mostrarse a los usuarios según la segmentación definida.
              </li>
              <li>
                Puedes ver métricas de impresiones, clics y CTR para optimizar
                futuras campañas.
              </li>
            </ol>
          </div>

          {/* Notas legales / IVA */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start mb-2">
              <Info className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
              <h3 className="text-lg font-bold text-gray-900">
                Notas importantes sobre precios e impuestos
              </h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>
                • Los precios mostrados son de referencia y pueden variar según
                la duración de la campaña, la segmentación y promociones
                vigentes.
              </li>
              <li>
                • <strong>Clientes en México:</strong> Los precios mostrados son <strong>+ IVA (16%)</strong>. El IVA se agrega al momento del pago y corre por cuenta del cliente. El total a pagar se mostrará antes de confirmar.
              </li>
              <li>
                • <strong>Clientes internacionales:</strong> Tasa 0% de IVA por ser <strong>exportación de servicios digitales</strong> conforme al Artículo 29 de la Ley del IVA mexicana.
              </li>
              <li>
                • En <strong>Resultados Patrocinados</strong> aplicamos modelo
                de <strong>Pago por Clic (PPC)</strong>: el cobro se basa en los
                clics generados, con un valor desde $1.50 MXN por clic.
              </li>
              <li>
                • <strong>Facturación:</strong> Una vez que tu campaña sea aprobada y entre en pauta, recibirás tu factura al correo registrado. La factura incluirá el desglose de impuestos correspondiente.
              </li>
            </ul>
          </div>

          {/* Términos de la Promoción de Lanzamiento */}
          {PROMO_CONFIG.isActive() && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm border border-red-200 p-6">
              <div className="flex items-start mb-3">
                <span className="text-2xl mr-2">🎉</span>
                <h3 className="text-lg font-bold text-gray-900">
                  Términos y Condiciones - Promoción de Lanzamiento 50% OFF
                </h3>
              </div>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>
                  • <strong>Descuento del 50%</strong> aplicable a Impulso Local y Sponsor de Ciudad durante los primeros 3 meses de contrato.
                </li>
                <li>
                  • El periodo de 3 meses comienza a partir de la <strong>fecha de pago confirmado</strong>.
                </li>
                <li>
                  • Esta promoción es válida para contratos iniciados <strong>hasta el 1 de Agosto de 2026</strong>.
                </li>
                <li>
                  • Al finalizar los 3 meses promocionales, el precio regresa a la tarifa regular vigente.
                </li>
                <li>
                  • No acumulable con otras promociones. Sujeto a disponibilidad de espacios.
                </li>
                <li>
                  • <strong>Garantía de Servicio:</strong> Durante esta fase de lanzamiento, <strong>no garantizamos métricas específicas</strong> de impresiones o clics.
                  Sin embargo, si tu campaña experimenta <strong>fallas técnicas</strong> de nuestra plataforma (anuncio no visible, errores de carga, etc.),
                  te ofreceremos una <strong>extensión gratuita de hasta 15 días</strong> proporcional al tiempo afectado.
                </li>
                <li>
                  • <strong>Transparencia:</strong> Al finalizar tu pauta, recibirás un informe con las métricas de rendimiento real de tu campaña
                  (impresiones, clics, CTR). Sin promesas, solo datos reales.
                </li>
                <li>
                  • Los espacios se asignan por orden de contratación. Cada espacio tiene un <strong>cupo máximo</strong> de anunciantes simultáneos
                  para evitar saturación.
                </li>
              </ul>

            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN ENTERPRISE / GLOBAL */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-sm text-blue-300 px-4 py-2 rounded-full mb-6">
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Publicidad Global</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Eres una marca internacional o empresa grande?
          </h2>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg">
            Tenemos planes especiales para eventos globales como <strong className="text-yellow-400">FIFA 2026</strong>,
            Super Bowl, Olimpiadas y más. Segmentación por país, idioma y categoría.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10 text-left">
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="text-3xl mb-3">🌎</div>
              <h4 className="font-bold text-white mb-2">Segmentación Global</h4>
              <p className="text-gray-400 text-sm">Por país, ciudad, idioma y categoría de negocio. Alcance en 50+ ciudades.</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="text-3xl mb-3">🎯</div>
              <h4 className="font-bold text-white mb-2">Piloto 30 Días Gratis</h4>
              <p className="text-gray-400 text-sm">Prueba sin riesgo para marcas selectas. Mide resultados antes de comprometerte.</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="text-3xl mb-3">📊</div>
              <h4 className="font-bold text-white mb-2">Informes Personalizados</h4>
              <p className="text-gray-400 text-sm">Reportes semanales de impresiones, clics, CTR y conversiones estimadas.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/enterprise"
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              Ver Planes Enterprise
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/enterprise/contact"
              className="text-gray-300 hover:text-white px-6 py-4 rounded-xl font-medium border border-gray-600 hover:border-gray-400 transition-colors"
            >
              Contactar un asesor
            </Link>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="bg-white py-10 px-4 text-center border-t border-gray-200">
        <p className="text-gray-500 text-sm">
          ¿Dudas? Escríbenos a <a href="mailto:ventasgeobooker@gmail.com" className="text-blue-600 hover:underline">ventasgeobooker@gmail.com</a>
        </p>
      </div>
    </div>
  );
};

export default AdvertisePage;
