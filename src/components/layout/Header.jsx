import React, { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo.jsx";   // ✔ ESTA ES LA CORRECTA


export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-geoYellow shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">

        <Link to="/" className="flex items-center space-x-3">
          <BrandLogo size={48} className="hover:scale-105 transition-transform duration-200" />
        </Link>

        <button
          className="md:hidden flex flex-col items-center justify-center space-y-1"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir menú"
        >
          <span className={`block w-6 h-[3px] bg-geoPurple transition-transform ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-[3px] bg-geoPurple transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`block w-6 h-[3px] bg-geoPurple transition-transform ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>

        <nav className="hidden md:flex items-center space-x-8 font-brand">
          <Link to="/" className="text-geoPurple hover:text-geoPink transition-colors">Inicio</Link>
          <Link to="/categories" className="text-geoPurple hover:text-geoPink transition-colors">Categorías</Link>
          <Link to="/business/register" className="bg-geoPink text-white px-4 py-2 rounded-full hover:bg-geoPurple transition-colors">+ Registrar Negocio</Link>
        </nav>
      </div>

      {isOpen && (
        <div className="md:hidden bg-geoYellow shadow-inner border-t border-geoPurple/10 px-4 py-4 space-y-4 font-brand">
          <Link to="/" onClick={() => setIsOpen(false)} className="block text-geoPurple hover:text-geoPink">Inicio</Link>
          <Link to="/categories" onClick={() => setIsOpen(false)} className="block text-geoPurple hover:text-geoPink">Categorías</Link>
          <Link to="/business/register" onClick={() => setIsOpen(false)} className="block bg-geoPink text-white px-4 py-2 rounded-full w-max hover:bg-geoPurple transition">+ Registrar Negocio</Link>
        </div>
      )}
    </header>
  );
}
