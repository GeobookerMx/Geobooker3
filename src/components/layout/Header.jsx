import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path
      ? "text-yellow-300 font-semibold"
      : "text-white hover:text-yellow-200";

  return (
    <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-full shadow">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">GB</span>
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Geobooker</h1>
            <span className="text-xs opacity-80">Directorios Locales</span>
          </div>
        </Link>

        {/* MENU DESKTOP */}
        <nav className="hidden lg:flex items-center gap-8">
          <Link className={isActive("/")} to="/">Inicio</Link>
          <Link className={isActive("/businesses")} to="/businesses">Negocios</Link>
          <Link className={isActive("/categories")} to="/categories">Categorías</Link>

          <Link
            to="/business/register"
            className="bg-yellow-400 text-gray-900 px-5 py-2 rounded-full font-semibold shadow hover:bg-yellow-300 transition"
          >
            + Agregar negocio
          </Link>

          <Link
            to="/login"
            className="bg-white text-blue-700 px-4 py-2 rounded-full border border-blue-300 hover:bg-gray-100 transition font-medium"
          >
            Iniciar sesión
          </Link>
        </nav>

        {/* BOTÓN MOBILE */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 bg-blue-700 rounded-lg hover:bg-blue-600"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* MENU MOBILE */}
      {open && (
        <div className="lg:hidden bg-blue-700 border-t border-blue-600">
          <nav className="flex flex-col px-4 py-4 gap-3">
            <Link className={isActive("/")} to="/" onClick={() => setOpen(false)}>
              Inicio
            </Link>

            <Link className="text-white hover:text-yellow-200" to="/businesses" onClick={() => setOpen(false)}>
              Negocios
            </Link>

            <Link className="text-white hover:text-yellow-200" to="/categories" onClick={() => setOpen(false)}>
              Categorías
            </Link>

            <Link
              to="/business/register"
              onClick={() => setOpen(false)}
              className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-semibold text-center"
            >
              + Agregar negocio
            </Link>

            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="bg-white text-blue-700 px-4 py-2 rounded-lg border border-blue-300 text-center font-medium"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
