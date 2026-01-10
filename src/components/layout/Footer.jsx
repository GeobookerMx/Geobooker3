// src/components/layout/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import SafetyBanner from '../SafetyBanner';
import AppQRCode from '../common/AppQRCode';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* Banner de Seguridad Anti-Extorsión */}
      <SafetyBanner variant="footer" />

      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-12 mt-0">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Columna 1 - Logo, descripción y redes sociales */}
            <div className="col-span-1 md:col-span-2">
              <div className="mb-4">
                <img
                  src="/images/geobooker-logo.png"
                  alt="Geobooker"
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-gray-300 mb-6 max-w-md">
                El mejor directorio de negocios locales. Encuentra y descubre negocios cerca de ti de forma rápida y sencilla.
              </p>

              {/* Redes Sociales */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3 text-blue-400">Síguenos</h4>
                <div className="flex space-x-4">
                  <a
                    href="https://www.tiktok.com/@geobookermx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-700 hover:bg-pink-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                    aria-label="TikTok"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.facebook.com/Geobooker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                    aria-label="Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href="https://twitter.com/GeoBookermx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-700 hover:bg-black rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                    aria-label="X (Twitter)"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.youtube.com/@Geobooker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-700 hover:bg-red-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                    aria-label="YouTube"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/geobookermx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-700 hover:bg-gradient-to-br hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                    aria-label="Instagram"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/geobooker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-700 hover:bg-blue-700 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h4 className="font-semibold mb-3 text-blue-400">Contacto</h4>
                <div className="space-y-2">
                  <a
                    href="https://wa.me/5255267023368"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-300 hover:text-green-400 transition-colors group"
                  >
                    <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>+52 55 2670 2368</span>
                  </a>
                  <a
                    href="mailto:geobookerr@gmail.com"
                    className="flex items-center text-gray-300 hover:text-blue-400 transition-colors group"
                  >
                    <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>geobookerr@gmail.com</span>
                    <span className="ml-2 text-xs text-gray-500">(Soporte)</span>
                  </a>
                  <a
                    href="mailto:ventasgeobooker@gmail.com"
                    className="flex items-center text-gray-300 hover:text-purple-400 transition-colors group"
                  >
                    <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>ventasgeobooker@gmail.com</span>
                    <span className="ml-2 text-xs text-gray-500">(Ventas y Publicidad)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Columna 2 - Enlaces rápidos */}
            <div>
              <h3 className="font-semibold mb-4 text-blue-400">Enlaces rápidos</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Inicio
                  </Link>
                </li>
                <li>
                  <Link to="/categories" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Categorías
                  </Link>
                </li>
                <li>
                  <Link to="/business/register" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Agregar negocio
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link to="/advertise" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Publicidad para negocios
                  </Link>
                </li>
                <li>
                  <Link to="/guia-resico" className="text-gray-300 hover:text-green-400 hover:pl-2 transition-all duration-200 inline-block">
                    📋 Guía Alta SAT (RESICO)
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3 - Legal y Soporte */}
            <div>
              <h3 className="font-semibold mb-4 text-blue-400">Legal y Soporte</h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/privacy" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Política de privacidad
                  </Link>
                </li>
                <li>
                  <Link to="/legal/ads-policy" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Políticas de publicidad
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Términos de servicio
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Preguntas frecuentes
                  </Link>
                </li>
                <li>
                  <Link to="/seguridad" className="text-gray-300 hover:text-yellow-400 hover:pl-2 transition-all duration-200 inline-block">
                    🛡️ Seguridad y Emergencias
                  </Link>
                </li>
                <li>
                  <Link to="/legal/fiscal" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    💼 Información Fiscal
                  </Link>
                </li>
                <li>
                  <a href="mailto:soporte@geobooker.com.mx" className="text-gray-300 hover:text-white hover:pl-2 transition-all duration-200 inline-block">
                    → Soporte técnico
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Sección: Desarrollo de Apps */}
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-2xl p-6 mb-8 border border-purple-500/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                  <span className="text-3xl">📱</span>
                  <h3 className="text-xl font-bold text-white">¿Necesitas tu propia App?</h3>
                </div>
                <p className="text-gray-300 text-sm max-w-lg">
                  También desarrollamos <strong className="text-purple-300">aplicaciones web y móviles personalizadas</strong> para tu negocio.
                  PWA, sitios web, sistemas, landing pages y más.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link
                  to="/desarrollo-apps"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-center transition-all transform hover:scale-105 shadow-lg"
                >
                  📝 Solicitar cotización
                </Link>
                <a
                  href="mailto:geobookerr@gmail.com?subject=Cotización desarrollo de app"
                  className="text-gray-400 hover:text-white text-sm text-center transition-colors"
                >
                  o escríbenos: geobookerr@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Métodos de pago aceptados */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/50 rounded-xl px-6 py-4 flex flex-col md:flex-row items-center gap-4">
              <span className="text-gray-400 text-sm font-medium">Métodos de pago:</span>
              <div className="flex items-center gap-4">
                {/* OXXO Pay */}
                <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1.5 rounded-lg">
                  <span className="text-yellow-400 font-bold text-sm">🏪 OXXO Pay</span>
                </div>
                {/* Visa */}
                <div className="flex items-center gap-1 bg-blue-500/20 px-3 py-1.5 rounded-lg">
                  <span className="text-blue-400 font-bold text-sm">💳 Visa</span>
                </div>
                {/* Mastercard */}
                <div className="flex items-center gap-1 bg-orange-500/20 px-3 py-1.5 rounded-lg">
                  <span className="text-orange-400 font-bold text-sm">Mastercard</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800 rounded-2xl px-8 py-6 flex flex-col md:flex-row items-center gap-6">
              <AppQRCode size={100} darkMode={true} />
              <div className="text-center md:text-left">
                <h4 className="text-white font-bold text-lg mb-1">¡Comparte Geobooker!</h4>
                <p className="text-gray-400 text-sm">Escanea el QR con tu celular para abrir la app</p>
                <p className="text-blue-400 text-xs mt-1">geobooker.com.mx</p>
              </div>
            </div>
          </div>

          {/* Línea divisoria y copyright */}
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 text-sm">
              <p className="mb-4 md:mb-0">
                © {new Date().getFullYear()} Geobooker. Todos los derechos reservados.
              </p>
              <p className="text-xs">
                Hecho con ❤️ en México 🇲🇽
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
