// src/components/Layout/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna 1 - Logo y descripción */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">G</span>
              </div>
              <span className="text-xl font-bold">Geobooker</span>
            </div>
            <p className="text-gray-300 mb-4">
              El mejor directorio de negocios locales. Encuentra y descubre
              negocios cerca de ti.
            </p>
          </div>

          {/* Columna 2 - Enlaces rápidos */}
          <div>
            <h3 className="font-semibold mb-4">Enlaces rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white">
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  to="/business/register"
                  className="text-gray-300 hover:text-white"
                >
                  Agregar negocio
                </Link>
              </li>
              <li>
                <Link
                  to="/search"
                  className="text-gray-300 hover:text-white"
                >
                  Buscar negocios
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3 - Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-white">
                  Política de privacidad
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-white">
                  Términos de servicio
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-gray-300 hover:text-white">
                  Preguntas frecuentes
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-300">
          <p>© {new Date().getFullYear()} Geobooker. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
