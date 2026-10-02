import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Sparkles,
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  Gift,
  Share2,
  Download,
  Loader2,
  Globe2,
  FileText,
  Smartphone,
  Eye,
  MessageCircle,
  Printer,
  X,
  BadgeCheck,
  Copy,
  ExternalLink,
  LogIn,
  Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { supabase } from '../../lib/supabase';
import { APP_LINKS } from '../../config/appLinks';

const COUNTRY_OPTIONS = [
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'AE', name: 'Dubai / EAU', flag: '🇦🇪' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' }
];

const INTERNATIONAL_LOCATIONS = {
  MX: [
    { name: 'CDMX - Polanco', lat: '19.433890', lng: '-99.191250', city: 'Ciudad de México' },
    { name: 'CDMX - Roma / Condesa', lat: '19.416200', lng: '-99.167800', city: 'Ciudad de México' },
    { name: 'CDMX - Centro Histórico', lat: '19.432608', lng: '-99.133209', city: 'Ciudad de México' },
    { name: 'Guadalajara - Providencia', lat: '20.692300', lng: '-103.382100', city: 'Guadalajara' },
    { name: 'Monterrey - San Pedro', lat: '25.657200', lng: '-100.366700', city: 'Monterrey' },
    { name: 'Puebla - Angelópolis', lat: '19.030500', lng: '-98.232500', city: 'Puebla' },
    { name: 'Cancún - Zona Hotelera', lat: '21.139100', lng: '-86.753300', city: 'Cancún' }
  ],
  GB: [
    { name: 'London - Soho / Oxford St', lat: '51.513600', lng: '-0.136500', city: 'London' },
    { name: 'London - Covent Garden', lat: '51.511700', lng: '-0.124000', city: 'London' },
    { name: 'London - Mayfair', lat: '51.509500', lng: '-0.149700', city: 'London' },
    { name: 'London - Shoreditch Tech', lat: '51.523000', lng: '-0.078000', city: 'London' },
    { name: 'Manchester - Northern Quarter', lat: '53.483000', lng: '-2.235000', city: 'Manchester' }
  ],
  ES: [
    { name: 'Madrid - Gran Vía / Centro', lat: '40.420000', lng: '-3.705000', city: 'Madrid' },
    { name: 'Madrid - Barrio de Salamanca', lat: '40.430000', lng: '-3.680000', city: 'Madrid' },
    { name: 'Barcelona - Eixample', lat: '41.390000', lng: '2.160000', city: 'Barcelona' },
    { name: 'Barcelona - Gràcia', lat: '41.402000', lng: '2.158000', city: 'Barcelona' },
    { name: 'Valencia - Ciutat Vella', lat: '39.475000', lng: '-0.377000', city: 'Valencia' }
  ],
  US: [
    { name: 'Miami - Brickell Financial', lat: '25.761700', lng: '-80.191800', city: 'Miami, FL' },
    { name: 'Miami - Wynwood Arts', lat: '25.804200', lng: '-80.198900', city: 'Miami, FL' },
    { name: 'New York - SoHo / Manhattan', lat: '40.723300', lng: '-74.003000', city: 'New York, NY' },
    { name: 'Los Angeles - Santa Monica', lat: '34.019500', lng: '-118.491200', city: 'Los Angeles, CA' },
    { name: 'Houston - The Galleria', lat: '29.739700', lng: '-95.464900', city: 'Houston, TX' }
  ],
  FR: [
    { name: 'Paris - Le Marais', lat: '48.857500', lng: '2.358000', city: 'Paris' },
    { name: 'Paris - Champs-Élysées', lat: '48.869800', lng: '2.307500', city: 'Paris' },
    { name: 'Lyon - Presqu\'île', lat: '45.764000', lng: '4.835700', city: 'Lyon' }
  ],
  DE: [
    { name: 'Berlin - Mitte / Alexanderplatz', lat: '52.520000', lng: '13.405000', city: 'Berlin' },
    { name: 'Munich - Altstadt', lat: '48.137000', lng: '11.575000', city: 'Munich' },
    { name: 'Frankfurt - Innenstadt', lat: '50.110900', lng: '8.682100', city: 'Frankfurt' }
  ],
  AE: [
    { name: 'Dubai - Downtown / Burj Khalifa', lat: '25.197200', lng: '55.274400', city: 'Dubai' },
    { name: 'Dubai - Marina / JBR', lat: '25.077200', lng: '55.133200', city: 'Dubai' },
    { name: 'Dubai - DIFC Financial Center', lat: '25.210000', lng: '55.280000', city: 'Dubai' }
  ],
  JP: [
    { name: 'Tokyo - Shibuya Crossing', lat: '35.659500', lng: '139.700500', city: 'Tokyo' },
    { name: 'Tokyo - Ginza Commercial', lat: '35.671900', lng: '139.764800', city: 'Tokyo' },
    { name: 'Tokyo - Shinjuku Central', lat: '35.693800', lng: '139.703400', city: 'Tokyo' }
  ],
  CO: [
    { name: 'Bogotá - Zona T / El Retiro', lat: '4.667500', lng: '-74.053800', city: 'Bogotá' },
    { name: 'Bogotá - Chapinero Alto', lat: '4.648000', lng: '-74.060000', city: 'Bogotá' },
    { name: 'Medellín - El Poblado / Provenza', lat: '6.208500', lng: '-75.567000', city: 'Medellín' },
    { name: 'Medellín - Laureles', lat: '6.244000', lng: '-75.592000', city: 'Medellín' }
  ],
  AR: [
    { name: 'Buenos Aires - Palermo Soho', lat: '-34.588000', lng: '-58.430000', city: 'Buenos Aires' },
    { name: 'Buenos Aires - Recoleta', lat: '-34.587000', lng: '-58.393000', city: 'Buenos Aires' },
    { name: 'Buenos Aires - Puerto Madero', lat: '-34.611000', lng: '-58.364000', city: 'Buenos Aires' }
  ],
  CL: [
    { name: 'Santiago - Providencia', lat: '-33.426000', lng: '-70.612000', city: 'Santiago' },
    { name: 'Santiago - Las Condes / El Golf', lat: '-33.415000', lng: '-70.598000', city: 'Santiago' }
  ],
  AU: [
    { name: 'Sydney - CBD / George St', lat: '-33.868800', lng: '151.209300', city: 'Sydney' },
    { name: 'Sydney - Surry Hills', lat: '-33.886000', lng: '151.212000', city: 'Sydney' },
    { name: 'Melbourne - CBD / Flinders', lat: '-37.817500', lng: '144.967100', city: 'Melbourne' }
  ]
};

const COMMERCIAL_VERTICALS = [
  { key: 'restaurant', name: 'Restaurante / Alimentos', icon: '🍽️', desc: 'Comida rápida, formal, cafeterías y bares' },
  { key: 'cafe', name: 'Cafetería / Coffee Shop', icon: '☕', desc: 'Cafés de especialidad, panaderías y postres' },
  { key: 'pharmacy', name: 'Farmacia / Salud', icon: '💊', desc: 'Farmacias, consultorios y ópticas' },
  { key: 'gym', name: 'Gimnasio / Fitness', icon: '🏋️', desc: 'Centros deportivos, crossfit y yoga' },
  { key: 'car_wash', name: 'Autolavado / Taller', icon: '🚗', desc: 'Lavados, detallado y refacciones' },
  { key: 'local_retail', name: 'Comercio / Retail Local', icon: '🛍️', desc: 'Boutiques, minisúpers, papelerías y regalos' }
];

const GEOSCORE_STUDY_COUNT_KEY = 'geoscore_market_study_count';
const GEOSCORE_LEAD_PROFILE_KEY = 'geoscore_market_study_lead_profile';

const readStoredLeadProfile = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(GEOSCORE_LEAD_PROFILE_KEY) || 'null');
  } catch {
    return null;
  }
};

export default function GeoScorePublicPage() {
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [vertical, setVertical] = useState('restaurant');
  const [lat, setLat] = useState('19.433890');
  const [lng, setLng] = useState('-99.191250');
  const [locationName, setLocationName] = useState('CDMX - Polanco');
  const [radiusMeters, setRadiusMeters] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [issuingCert, setIssuingCert] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [leadProfile, setLeadProfile] = useState(readStoredLeadProfile);
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [funnelReason, setFunnelReason] = useState('pdf_download');
  const [pendingPdfDownload, setPendingPdfDownload] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    emailMarketingConsent: false,
    whatsappContactConsent: false
  });

  const openFunnelModal = (reason = 'pdf_download', { pendingDownload = false } = {}) => {
    setFunnelReason(reason);
    setPendingPdfDownload(Boolean(pendingDownload));
    setShowFunnelModal(true);
  };

  const getStudyCount = () => {
    try {
      return Number(localStorage.getItem(GEOSCORE_STUDY_COUNT_KEY) || '0');
    } catch {
      return 0;
    }
  };

  const incrementStudyCount = () => {
    const nextCount = getStudyCount() + 1;
    try {
      localStorage.setItem(GEOSCORE_STUDY_COUNT_KEY, String(nextCount));
    } catch {
      // Local storage can be unavailable in private contexts.
    }
    return nextCount;
  };

  const trackAppDownloadIntent = async (target) => {
    try {
      await supabase.from('app_download_events').insert({
        event_type: 'download_intent',
        target,
        platform_hint: target === 'ios_store' ? 'ios' : target === 'android_store' ? 'android' : 'pwa',
        source: 'geoscore_funnel',
        campaign: 'geoscore_market_study',
        country_code: selectedCountry,
        attribution_snapshot: {
          locationName,
          businessTypeKey: vertical,
          score: scoreResult?.score ?? null,
          grade: scoreResult?.grade ?? null
        }
      });
    } catch (err) {
      console.warn('GeoScore app download intent tracking failed:', err);
    }
  };

  const saveGeoScoreLead = async (actionIntent = 'market_study') => {
    const normalizedEmail = leadForm.email.trim().toLowerCase();
    const normalizedPhone = leadForm.phone.trim();
    const fullName = leadForm.fullName.trim();

    if (!fullName || (!normalizedEmail && !normalizedPhone)) {
      toast.error('Agrega tu nombre y al menos correo o telefono para personalizar el estudio.');
      return false;
    }

    if (normalizedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      toast.error('Revisa el formato del correo.');
      return false;
    }

    setSavingLead(true);
    const profile = {
      fullName,
      email: normalizedEmail,
      phone: normalizedPhone,
      businessName: leadForm.businessName.trim(),
      emailMarketingConsent: leadForm.emailMarketingConsent,
      whatsappContactConsent: leadForm.whatsappContactConsent
    };

    try {
      await supabase.from('geoscore_market_study_leads').insert({
        full_name: profile.fullName,
        email: profile.email || null,
        phone: profile.phone || null,
        business_name: profile.businessName || null,
        country_code: selectedCountry,
        location_name: locationName,
        business_type_key: vertical,
        lat: Number(lat),
        lng: Number(lng),
        radius_meters: Number(radiusMeters),
        score: scoreResult?.score ?? null,
        grade: scoreResult?.grade ?? null,
        study_count: Math.max(1, getStudyCount()),
        action_intent: actionIntent,
        email_marketing_consent: Boolean(profile.emailMarketingConsent),
        whatsapp_contact_consent: Boolean(profile.whatsappContactConsent),
        consent_text: profile.emailMarketingConsent || profile.whatsappContactConsent
          ? 'Acepto recibir informacion de Geobooker sobre mi estudio, visibilidad o herramientas para negocios. Puedo darme de baja cuando quiera.'
          : null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: {
          certificateToken: certificate?.certificateToken || null,
          source: 'geoscore_public_funnel'
        }
      });

      localStorage.setItem(GEOSCORE_LEAD_PROFILE_KEY, JSON.stringify(profile));
      setLeadProfile(profile);
      toast.success('Datos guardados para personalizar tu estudio.');
      return true;
    } catch (err) {
      console.warn('GeoScore lead save failed:', err);
      toast.error('No se pudo guardar el contacto. Puedes continuar con tu estudio.');
      return false;
    } finally {
      setSavingLead(false);
    }
  };

  const handleLeadSubmit = async () => {
    const saved = await saveGeoScoreLead(funnelReason);
    if (!saved) return;
    setShowFunnelModal(false);
    if (pendingPdfDownload) {
      setPendingPdfDownload(false);
      handleDownloadPDF({ force: true });
    }
  };

  const handleWhatsAppShare = () => {
    if (!scoreResult) return;
    const verticalName = COMMERCIAL_VERTICALS.find(v => v.key === vertical)?.name || vertical;
    const text = `📊 *ESTUDIO DE MERCADO OFICIAL - GEOBOOKER GEOSCORE™*\n\n` +
      `📍 *Ubicación:* ${locationName} (${selectedCountry})\n` +
      `🏢 *Giro Evaluado:* ${verticalName}\n` +
      `🎯 *Radio de Influencia:* ${radiusMeters}m | Coordenadas: ${lat}, ${lng}\n\n` +
      `🏆 *RESULTADO GLOBAL:* ${scoreResult.score}/100 (Grado ${scoreResult.grade})\n\n` +
      `💡 *Diagnóstico:* ${scoreResult.recommendation || 'Zona analizada exitosamente.'}\n\n` +
      `📌 *Pilares Comerciales:*\n` +
      `• Competencia Directa: ${scoreResult.breakdown?.competition?.score ?? 0} pts (${scoreResult.breakdown?.competition?.count ?? 0} negocios)\n` +
      `• Sinergia Comercial: ${scoreResult.breakdown?.complementarity?.score ?? 0} pts\n` +
      `• Densidad de Zona: ${scoreResult.breakdown?.density?.score ?? 0} pts (${scoreResult.breakdown?.density?.totalNearby ?? 0} negocios)\n\n` +
      `🔗 Consulta o genera tu estudio gratis en: https://geobooker.com.mx/geoscore`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    const firstLoc = INTERNATIONAL_LOCATIONS[countryCode]?.[0];
    if (firstLoc) {
      setLat(firstLoc.lat);
      setLng(firstLoc.lng);
      setLocationName(firstLoc.name);
    }
    setScoreResult(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es compatible con tu navegador');
      return;
    }
    toast.loading('Obteniendo ubicación GPS...', { id: 'gps' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocationName('Mi ubicación actual');
        toast.success('Ubicación GPS fijada', { id: 'gps' });
      },
      () => {
        toast.error('No se pudo acceder a tu ubicación. Selecciona una ciudad.', { id: 'gps' });
      },
      { timeout: 8000 }
    );
  };

  const handleCalculateScore = async () => {
    setLoading(true);
    setScoreResult(null);
    try {
      // 1. Intentar calcular via Edge Function
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: {
          action: 'calculate_score',
          businessTypeKey: vertical,
          countryCode: selectedCountry,
          lat: Number(lat),
          lng: Number(lng),
          radiusMeters: Number(radiusMeters)
        }
      });

      if (error) {
        let message = error.message || 'No se pudo consultar el motor GeoScore';
        try {
          const body = await error.context?.clone?.().json();
          message = body?.message || body?.error || message;
        } catch {
          // Network errors do not always include a JSON response.
        }
        throw new Error(message);
      }

      if (data?.scoreResult) {
        setScoreResult(data.scoreResult);
        const st = data.scoreResult.status;
        if (st === 'success') {
          const studyCount = incrementStudyCount();
          toast.success('¡Estudio de Mercado Express generado!');
          if (studyCount > 2 && !leadProfile) openFunnelModal('repeat_usage');
        } else if (st === 'preliminary') {
          incrementStudyCount();
          toast('GeoScore Preliminar calculado — muestra reducida.', { icon: '⚠️' });
        } else {
          // no_coverage / unsupported_country
          toast.error(data.scoreResult.recommendation || 'GeoScore no está disponible para esta zona.');
        }
        return;
      }
      throw new Error('El motor GeoScore devolvió una respuesta vacía');
    } catch (err) {
      console.error('GeoScore calculate error:', err);
      toast.error(err.message || 'Error al calcular. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!scoreResult || scoreResult.status !== 'success') return;
    setIssuingCert(true);
    try {
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: {
          action: 'issue_certificate',
          businessTypeKey: vertical,
          countryCode: selectedCountry,
          locationName,
          lat: Number(lat),
          lng: Number(lng),
          radiusMeters: Number(radiusMeters)
        }
      });

      if (error) {
        let message = error.message || 'No se pudo emitir el certificado';
        try {
          const body = await error.context?.clone?.().json();
          message = body?.message || body?.error || message;
        } catch {
          // Network errors do not always include a JSON response.
        }
        throw new Error(message);
      }

      if (data?.scoreResult) setScoreResult(data.scoreResult);
      if (!data?.certificate?.certificateToken) {
        throw new Error('El backend no devolvió un certificado verificable');
      }

      setCertificate(data.certificate);
      toast.success(`¡Certificado ${data.certificate.certificateToken} emitido!`);
    } catch (err) {
      console.error('Certificate issuance error:', err);
      toast.error(err.message || 'No se pudo emitir el certificado. Intenta nuevamente.');
    } finally {
      setIssuingCert(false);
    }
  };

  const handleDownloadPDF = async (options = {}) => {
    if (!scoreResult) return;
    const forceDownload = options?.force === true;
    if (!forceDownload && !leadProfile) {
      openFunnelModal('pdf_download', { pendingDownload: true });
      return;
    }
    try {
      const doc = new jsPDF();

      // --- Header ---
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('GEOBOOKER GEOSCORE™', 14, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Certificado Oficial de Viabilidad Comercial', 14, 26);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 33);

      // Certificate number (if issued)
      if (certificate) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Certificado Nº ${certificate.certificateToken}`, 120, 26);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Válido hasta: ${new Date(certificate.expiresAt).toLocaleDateString('es-MX')}`, 120, 33);
      }

      // --- QR Code (if certificate exists) ---
      if (certificate) {
        try {
          const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
            width: 100, margin: 1, color: { dark: '#0f172a', light: '#ffffff' }
          });
          doc.addImage(qrDataUrl, 'PNG', 155, 48, 40, 40);
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text('Escanea para verificar', 159, 92);
        } catch { /* QR generation failed silently */ }
      }

      // --- Location Info ---
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`Ubicación: ${locationName} (${selectedCountry})`, 14, 55);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Giro: ${COMMERCIAL_VERTICALS.find(v => v.key === vertical)?.name || vertical}`, 14, 63);
      doc.text(`Radio: ${radiusMeters}m · Coordenadas: ${lat}, ${lng}`, 14, 69);
      if (leadProfile?.fullName) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Solicitante: ${leadProfile.fullName}`, 14, 76);
        doc.setFont('helvetica', 'normal');
        doc.text(`Contacto: ${[leadProfile.email, leadProfile.phone].filter(Boolean).join(' · ') || 'No especificado'}`, 14, 82);
      }

      // --- Score Box ---
      const scoreBoxY = leadProfile?.fullName ? 90 : 78;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, scoreBoxY, 130, 32, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('RESULTADO GLOBAL GEOSCORE:', 20, scoreBoxY + 12);
      doc.setFontSize(24);
      doc.setTextColor(37, 99, 235);
      doc.text(`${scoreResult.score}/100`, 20, scoreBoxY + 26);
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text(`Grado ${scoreResult.grade}`, 80, scoreBoxY + 26);

      // --- Diagnosis ---
      const diagnosisY = scoreBoxY + 44;
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnóstico Estratégico:', 14, diagnosisY);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(scoreResult.recommendation || '', 180);
      doc.text(splitText, 14, diagnosisY + 6);

      // --- 5 Pillars ---
      const pillarsY = diagnosisY + 6 + splitText.length * 5 + 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Desglose de los 5 Pilares Comerciales:', 14, pillarsY);
      doc.setFont('helvetica', 'normal');
      doc.text(`1. Competencia Directa: ${scoreResult.breakdown?.competition?.score ?? 0} pts (${scoreResult.breakdown?.competition?.count ?? 0} competidores)`, 18, pillarsY + 8);
      doc.text(`2. Sinergia Comercial: ${scoreResult.breakdown?.complementarity?.score ?? 0} pts (${scoreResult.breakdown?.complementarity?.count ?? 0} comercios ancla)`, 18, pillarsY + 16);
      doc.text(`3. Densidad Total: ${scoreResult.breakdown?.density?.score ?? 0} pts (${scoreResult.breakdown?.density?.totalNearby ?? 0} negocios en radio)`, 18, pillarsY + 24);
      doc.text(`4. Accesibilidad: ${scoreResult.breakdown?.accessibility?.score ?? 0} pts`, 18, pillarsY + 32);
      doc.text(`5. Confianza: ${scoreResult.breakdown?.confidence?.score ?? 0}%`, 18, pillarsY + 40);

      // --- Verification footer ---
      doc.setDrawColor(200, 210, 220);
      doc.line(14, 260, 196, 260);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      if (certificate) {
        doc.text(`Certificado: ${certificate.certificateToken} · Hash: ${certificate.verificationHash?.substring(0, 24)}...`, 14, 267);
        doc.text(`Verifica en: ${certificate.verificationUrl}`, 14, 273);
      }
      doc.text('Estudio gratuito de Geobooker · geobooker.com.mx · Válido hasta Enero 2027', 14, 280);
      doc.text('Este documento es un indicador exploratorio. No garantiza ventas ni rentabilidad.', 14, 286);

      const fileName = `GeoScore_${certificate?.certificateToken || locationName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const blobUrl = URL.createObjectURL(doc.output('blob'));
        try {
          await Share.share({
            title: `Certificado GeoScore™ - ${locationName}`,
            text: `📊 Certificado GeoScore™ ${certificate?.certificateToken || ''} para ${locationName}\nCalificación: ${scoreResult.score}/100 (Grado ${scoreResult.grade})`,
            url: certificate?.verificationUrl || window.location.href,
            dialogTitle: 'Guardar o Compartir Certificado GeoScore™'
          });
        } catch (shareErr) {
          console.warn('Share cancelled or not available:', shareErr);
        }
        window.open(blobUrl, '_blank');
        toast.success('¡Certificado generado!');
      } else {
        doc.save(fileName);
        toast.success('¡PDF descargado en tu carpeta de Descargas!');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('No se pudo generar el PDF');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `GeoScore para ${locationName}`,
      text: `Consulté el Estudio de Mercado Express gratuito de Geobooker para ${locationName} y obtuve calificación ${scoreResult?.grade || 'A'} (${scoreResult?.score || 0}/100).`,
      url: window.location.href
    };

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          ...shareData,
          dialogTitle: 'Compartir Estudio GeoScore™'
        });
        return;
      } catch (e) {
        console.warn('Capacitor share dismissed:', e);
      }
    }

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Promo Hero Header */}
      <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge Gratuito */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-emerald-300 mb-6 backdrop-blur-md animate-pulse">
            <Gift className="h-4 w-4" />
            <span>ESTUDIO DE MERCADO EXPRESS — 100% GRATUITO HASTA ENERO 2027</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            Conoce el <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">GeoScore™</span> de tu ubicación comercial
          </h1>
          <p className="mt-4 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto">
            Evalúa la viabilidad comercial de cualquier punto en México, España, EE. UU., Colombia, Argentina y Chile. Analiza competencia, flujo potencial y densidad de mercado al instante.
          </p>
        </div>
      </div>

      {/* Main Interactive Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Left Column: Form & Configuration */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-cyan-400" /> Configura tu Estudio
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Selecciona el país, giro y las coordenadas a evaluar.
            </p>

            {/* Country Selector */}
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5 text-cyan-400" /> 1. País / Mercado
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {COUNTRY_OPTIONS.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryChange(c.code)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all ${
                      selectedCountry === c.code
                        ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Picker */}
            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Giro Comercial</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {COMMERCIAL_VERTICALS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setVertical(v.key)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      vertical === v.key
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200 shadow-sm'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-lg">{v.icon}</span>
                    <span className="text-xs font-bold truncate">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Cities for selected country */}
            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Polos Comerciales en {COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.name}</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(INTERNATIONAL_LOCATIONS[selectedCountry] || []).map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      setLat(loc.lat);
                      setLng(loc.lng);
                      setLocationName(loc.name);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      locationName === loc.name
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-emerald-400" /> Usar mi ubicación GPS
                </button>
              </div>
            </div>

            {/* Radio Slider */}
            <div className="mt-6">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400">4. Radio de Mercado</span>
                <span className="font-bold text-cyan-400">{radiusMeters === '500' ? '500 m (Peatonal)' : radiusMeters === '1000' ? '1 km (Estándar)' : `${Number(radiusMeters)/1000} km`}</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="500"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="mt-2 w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleCalculateScore}
              disabled={loading}
              className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 p-4 font-black text-white text-base shadow-lg shadow-blue-500/25 hover:from-cyan-400 hover:to-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {loading ? 'Analizando mercado internacional...' : 'Calcular GeoScore Express Gratis'}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              ⚡ Sin costo · Válido para emprendedores e inversionistas hasta Enero 2027
            </p>
          </div>

          {/* Right Column: Results Screen */}
          <div className="lg:col-span-7 space-y-6">
            {!scoreResult && !loading && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center backdrop-blur-md">
                <div className="inline-flex rounded-2xl bg-blue-500/10 p-4 text-cyan-400 mb-4">
                  <Compass className="h-10 w-10 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white">Tu estudio está listo para generarse</h3>
                <p className="mt-2 text-slate-400 max-w-md mx-auto text-sm">
                  Haz clic en el botón para calcular en tiempo real los 5 pilares de viabilidad comercial para tu negocio.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Competidores directos</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sinergia comercial</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cobertura multi-país</span>
                </div>
              </div>
            )}

            {scoreResult && (scoreResult.status === 'no_coverage' || scoreResult.status === 'unsupported_country') && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-6 text-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <h3 className="font-bold text-white">Sin cobertura en esta zona</h3>
                    <p className="mt-1 text-sm text-slate-300">{scoreResult.recommendation}</p>
                    {scoreResult.status === 'no_coverage' && (
                      <p className="mt-3 text-xs text-amber-200">Prueba seleccionando una de las zonas predefinidas o aumenta el radio de mercado.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(scoreResult?.status === 'success' || scoreResult?.status === 'preliminary') && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in duration-500">
                
                {/* Result Hero Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
                  <div>
                    {scoreResult.status === 'preliminary' ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 mb-2 border border-amber-500/30">
                        <AlertTriangle className="h-3.5 w-3.5" /> GEOSCORE PRELIMINAR — MUESTRA REDUCIDA ({selectedCountry})
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
                        <ShieldCheck className="h-3.5 w-3.5" /> ESTUDIO EXPRESS COMPLETADO ({selectedCountry})
                      </div>
                    )}
                    <h3 className="text-2xl font-black text-white">{locationName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Radio de análisis: {scoreResult.metrics?.radiusMeters || radiusMeters} metros</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GeoScore</p>
                      <p className="text-4xl font-black text-white">{scoreResult.score}<span className="text-sm font-normal text-slate-400">/100</span></p>
                    </div>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl font-black text-2xl shadow-inner ${
                      scoreResult.grade?.startsWith('A')
                        ? 'bg-emerald-500 text-slate-950'
                        : scoreResult.grade === 'B'
                        ? 'bg-blue-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {scoreResult.grade}
                    </div>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <p className="font-bold flex items-center gap-2 text-cyan-300">
                    <Sparkles className="h-4 w-4" /> Diagnóstico Estratégico:
                  </p>
                  <p className="mt-1 text-slate-200">{scoreResult.recommendation}</p>
                </div>

                {/* 5 Pillars Breakdown Cards */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pilares de Análisis Comercial:</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
                      <span className="text-xs text-slate-400 font-medium">Competencia Directa</span>
                      <p className="text-2xl font-black text-white mt-1">{scoreResult.breakdown?.competition?.score ?? 0}<span className="text-xs text-slate-400 font-normal"> pts</span></p>
                      <span className="text-[11px] text-cyan-300">{scoreResult.breakdown?.competition?.count ?? 0} competidores</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
                      <span className="text-xs text-slate-400 font-medium">Sinergia Comercial</span>
                      <p className="text-2xl font-black text-white mt-1">{scoreResult.breakdown?.complementarity?.score ?? 0}<span className="text-xs text-slate-400 font-normal"> pts</span></p>
                      <span className="text-[11px] text-emerald-300">{scoreResult.breakdown?.complementarity?.count ?? 0} comercios ancla</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
                      <span className="text-xs text-slate-400 font-medium">Densidad de Zona</span>
                      <p className="text-2xl font-black text-white mt-1">{scoreResult.breakdown?.density?.score ?? 0}<span className="text-xs text-slate-400 font-normal"> pts</span></p>
                      <span className="text-[11px] text-indigo-300">{scoreResult.breakdown?.density?.totalNearby ?? 0} negocios en radio</span>
                    </div>
                  </div>
                </div>

                {/* Strengths & Risks */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Fortalezas de la Zona
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-emerald-200">
                      {(scoreResult.strengths || []).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Puntos a Considerar
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-amber-200">
                      {(scoreResult.risks || []).map((r, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">• {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Certificate Issuance — solo para scores certificables (5+ negocios) */}
                {!certificate && scoreResult?.isCertifiable && (
                  <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <BadgeCheck className="h-4 w-4" /> Emitir Certificado Verificable
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Genera un certificado oficial con código único, QR de verificación y hash de integridad SHA-256.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleIssueCertificate}
                        disabled={issuingCert}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                      >
                        {issuingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        {issuingCert ? 'Emitiendo...' : 'Emitir Certificado Gratis'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Aviso para scores preliminares — no certificables */}
                {!certificate && scoreResult?.isPreliminary && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> GeoScore Preliminar
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1.5">{scoreResult.disclaimer}</p>
                    {(scoreResult.warnings || []).map((w, i) => (
                      <p key={i} className="text-[11px] text-amber-200 mt-1">• {w}</p>
                    ))}
                  </div>
                )}

                {/* Issued Certificate Card */}
                {certificate && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-black text-emerald-300">Certificado Emitido</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400">Número:</span>
                        <p className="font-black text-white text-sm">{certificate.certificateToken}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Válido hasta:</span>
                        <p className="font-bold text-slate-200">{new Date(certificate.expiresAt).toLocaleDateString('es-MX')}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        to={`/certificate/${certificate.certificateToken}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" /> Verificar Online
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(certificate.verificationUrl);
                          toast.success('¡Enlace de verificación copiado!');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        <Copy className="h-3 w-3" /> Copiar Enlace
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions & Next Steps */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCertificateModal(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition-colors shadow-sm"
                    >
                      <Eye className="h-4 w-4 text-cyan-400" /> Ver Certificado
                    </button>

                    <button
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors shadow-sm"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" /> WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/20 transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4 text-blue-400" /> PDF {certificate ? 'Certificado' : 'Estudio'}
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <Share2 className="h-4 w-4" /> Compartir
                    </button>
                  </div>

                  <Link
                    to="/business/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:from-emerald-400 hover:to-teal-500 transition-all"
                  >
                    Registrar mi Negocio Gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Funnel Modal */}
        {showFunnelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:p-6">
              <button
                type="button"
                onClick={() => {
                  setShowFunnelModal(false);
                  if (pendingPdfDownload) {
                    setPendingPdfDownload(false);
                    handleDownloadPDF({ force: true });
                  }
                }}
                className="absolute right-4 top-4 rounded-full bg-slate-900 p-2 text-slate-400 hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="pr-10">
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-cyan-300">
                  <Sparkles className="h-3.5 w-3.5" /> Siguiente paso recomendado
                </span>
                <h3 className="mt-3 text-2xl font-black text-white">
                  {funnelReason === 'pdf_download' ? 'Personaliza tu PDF antes de descargarlo' : 'Ya generaste varios estudios GeoScore'}
                </h3>
                <p className="mt-1 text-sm text-slate-300">
                  Guarda tu estudio con tus datos, compartelo con tu equipo o registra tu negocio para recibir seguimiento. No enviaremos campañas si no das consentimiento.
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-sm font-black text-white">Datos para el estudio y CRM</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-300">
                      Nombre
                      <input
                        value={leadForm.fullName}
                        onChange={(event) => setLeadForm(prev => ({ ...prev, fullName: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="Tu nombre"
                        maxLength={160}
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-300">
                      Negocio
                      <input
                        value={leadForm.businessName}
                        onChange={(event) => setLeadForm(prev => ({ ...prev, businessName: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="Nombre del negocio"
                        maxLength={180}
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-300">
                      Correo
                      <input
                        type="email"
                        value={leadForm.email}
                        onChange={(event) => setLeadForm(prev => ({ ...prev, email: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="correo@empresa.com"
                        maxLength={254}
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-300">
                      Telefono
                      <input
                        value={leadForm.phone}
                        onChange={(event) => setLeadForm(prev => ({ ...prev, phone: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                        placeholder="+52..."
                        maxLength={50}
                      />
                    </label>
                  </div>

                  <div className="mt-3 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={leadForm.emailMarketingConsent}
                        onChange={(event) => setLeadForm(prev => ({ ...prev, emailMarketingConsent: event.target.checked }))}
                        className="mt-0.5"
                      />
                      <span>Acepto recibir informacion por correo sobre mi estudio, visibilidad y herramientas para negocios.</span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={leadForm.whatsappContactConsent}
                        onChange={(event) => setLeadForm(prev => ({ ...prev, whatsappContactConsent: event.target.checked }))}
                        className="mt-0.5"
                      />
                      <span>Acepto que Geobooker me contacte por WhatsApp sobre este estudio. Puedo darme de baja cuando quiera.</span>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleLeadSubmit}
                      disabled={savingLead}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {savingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Guardar y continuar
                    </button>
                    {pendingPdfDownload && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowFunnelModal(false);
                          setPendingPdfDownload(false);
                          handleDownloadPDF({ force: true });
                        }}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                      >
                        Descargar sin personalizar
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Link
                    to="/login?source=geoscore_funnel"
                    className="flex items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-100 hover:bg-blue-500/20"
                  >
                    <LogIn className="h-5 w-5 text-blue-300" />
                    <span><strong className="block text-sm">Iniciar sesion</strong><span className="text-xs text-blue-200/80">Guarda tus estudios y certificados.</span></span>
                  </Link>
                  <Link
                    to="/business/register?source=geoscore_funnel"
                    className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-100 hover:bg-emerald-500/20"
                  >
                    <Building2 className="h-5 w-5 text-emerald-300" />
                    <span><strong className="block text-sm">Registrar mi negocio</strong><span className="text-xs text-emerald-200/80">Convierte el estudio en perfil visible.</span></span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-left text-slate-100 hover:bg-slate-800"
                  >
                    <Share2 className="h-5 w-5 text-cyan-300" />
                    <span><strong className="block text-sm">Compartir herramienta</strong><span className="text-xs text-slate-400">Enviala a socios, clientes o contactos.</span></span>
                  </button>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      <Smartphone className="h-5 w-5 text-cyan-300" /> Descargar app
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a
                        href={APP_LINKS.androidStoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAppDownloadIntent('android_store')}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-bold text-emerald-300 hover:bg-slate-800"
                      >
                        Android
                      </a>
                      <a
                        href={APP_LINKS.iosStoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackAppDownloadIntent('ios_store')}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-center text-xs font-bold text-blue-300 hover:bg-slate-800"
                      >
                        iOS
                      </a>
                    </div>
                    <Link
                      to="/download?source=geoscore_funnel"
                      onClick={() => trackAppDownloadIntent('hub')}
                      className="mt-2 flex items-center justify-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                    >
                      Ver PWA y opciones <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📜 MODAL: Certificado Oficial GeoScore™ en Pantalla */}
        {showCertificateModal && scoreResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-8 shadow-2xl text-slate-100 my-8">

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowCertificateModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Certificate Header */}
              <div className="border-b border-slate-800 pb-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-full">
                  {certificate ? 'CERTIFICADO VERIFICABLE' : 'CERTIFICADO OFICIAL DE VIABILIDAD COMERCIAL'}
                </span>
                <h3 className="text-2xl font-black text-white mt-3">
                  GEOBOOKER GEOSCORE™
                </h3>
                {certificate && (
                  <p className="text-sm font-black text-indigo-400 mt-1 tracking-wide">
                    {certificate.certificateToken}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  Estudio de Mercado Express Internacional · Emitido el {certificate ? new Date(certificate.issuedAt).toLocaleDateString('es-MX') : new Date().toLocaleDateString('es-MX')}
                </p>
              </div>

              {/* Certificate Body */}
              <div className="mt-6 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Ubicación:</span>
                    <p className="font-bold text-white text-sm">{locationName} ({selectedCountry})</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Giro Evaluado:</span>
                    <p className="font-bold text-white text-sm">{COMMERCIAL_VERTICALS.find(v => v.key === vertical)?.name || vertical}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Radio de Influencia:</span>
                    <p className="font-semibold text-slate-200">{radiusMeters} metros</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Coordenadas GPS:</span>
                    <p className="font-semibold text-slate-200">{lat}, {lng}</p>
                  </div>
                </div>

                {/* Big Score Box */}
                <div className="bg-gradient-to-br from-blue-950/60 via-slate-800 to-slate-900 border border-blue-500/40 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Calificación Global:</span>
                    <div className="text-4xl font-black text-cyan-400 mt-1">
                      {scoreResult.score}<span className="text-base text-slate-400 font-normal">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Grado:</span>
                    <div className="text-3xl font-black text-emerald-400 mt-1">
                      Grado {scoreResult.grade}
                    </div>
                  </div>
                </div>

                {/* Strategic Diagnosis */}
                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Diagnóstico Estratégico:</span>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1.5 leading-relaxed">
                    {scoreResult.recommendation}
                  </p>
                </div>

                {/* 5 Pillars Breakdown */}
                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Desglose de Pilares:</span>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Competencia:</span>
                      <div className="font-bold text-white">{scoreResult.breakdown?.competition?.score ?? 0} pts ({scoreResult.breakdown?.competition?.count ?? 0})</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Sinergia:</span>
                      <div className="font-bold text-white">{scoreResult.breakdown?.complementarity?.score ?? 0} pts ({scoreResult.breakdown?.complementarity?.count ?? 0})</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Densidad:</span>
                      <div className="font-bold text-white">{scoreResult.breakdown?.density?.score ?? 0} pts ({scoreResult.breakdown?.density?.totalNearby ?? 0})</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition-all shadow-md"
                  >
                    <MessageCircle className="h-4 w-4" /> Enviar a WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCertificateModal(false);
                      handleDownloadPDF();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 px-4 py-2 text-xs font-bold transition-all"
                  >
                    <Download className="h-4 w-4 text-cyan-400" /> Descargar PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold transition-all"
                  >
                    <Printer className="h-4 w-4" /> Imprimir
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📱 Mobile App Download Promotion Card */}
        <div className="mt-12 rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-lg flex-shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Smartphone className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-0.5 rounded-full mb-1.5">
                  ⭐ App Oficial Geobooker
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Lleva GeoScore™ y el Radar de Negocios en tu Celular
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                  Accede a estudios de mercado en tiempo real, mapas interactivos, alertas de clientes y directorio comercial desde tu dispositivo móvil.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 flex-shrink-0 w-full md:w-auto justify-start md:justify-end">
              <a
                href={APP_LINKS.androidStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-white px-5 py-2.5 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10 group"
              >
                <svg className="w-6 h-6 fill-current text-emerald-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a2.316 2.316 0 0 1-.61-.395V2.21c.214-.144.425-.28.609-.396zM15.207 13.414l2.586 2.586-12.01 6.933 9.424-9.519zm0-2.828L5.783 1.067l12.01 6.933-2.586 2.586zm1.414 1.414l3.586-2.071c1.077-.622 1.077-1.636 0-2.258L16.621 7.67l-2.828 2.828 2.828 2.502z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Disponible en</div>
                  <div className="text-xs font-black text-white">Google Play</div>
                </div>
              </a>

              <a
                href={APP_LINKS.iosStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-white px-5 py-2.5 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/10 group"
              >
                <svg className="w-6 h-6 fill-current text-slate-200 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-1.97.6-2.6 1.34-.56.64-1.04 1.7-0.91 2.72.99.08 1.98-.46 2.59-1.21z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Descargar en</div>
                  <div className="text-xs font-black text-white">App Store</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
