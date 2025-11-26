import React, { useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-geoYellow shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">

        {/* LOGO */}
        <Link to="/" className="flex items-center space-x-3">
          <BrandLogo className="hover:scale-105 transition-transform duration-200" />
        </Link>

        {/* HAMBURGER BUTTON (MOBILE) */}
        <button
          className="md:hidden flex flex-col items-center justify-center space-y-1"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir menú"
        >
          <span
            className={`block w-6 h-[3px] bg-geoPurple transition-transform ${
              isOpen ? "rotate-45 translate-y-2" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-[3px] bg-geoPurple transition-opacity ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          ></span>
          <span
            className={`block w-6 h-[3px] bg-geoPurple transition-transform ${
              isOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          ></span>
        </button>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center space-x-8 font-brand">
          <Link to="/" className="text-geoPurple hover:text-geoPink transition-colors">
            Inicio
          </Link>

          <Link to="/categories" className="text-geoPurple hover:text-geoPink transition-colors">
            Categorías
          </Link>

          <Link
            to="/business/register"
            className="bg-geoPink text-white px-4 py-2 rounded-full hover:bg-geoPurple transition-colors"
          >
            + Registrar Negocio
          </Link>
        </nav>
      </div>

      {/* MOBILE MENU */}
      {isOpen && (
        <div className="md:hidden bg-geoYellow shadow-inner border-t border-geoPurple/10 px-4 py-4 space-y-4 font-brand animate-fadeIn">
          <Link
            to="/"
            className="block text-geoPurple hover:text-geoPink"
            onClick={() => setIsOpen(false)}
          >
            Inicio
          </Link>

          <Link
            to="/categories"
            className="block text-geoPurple hover:text-geoPink"
            onClick={() => setIsOpen(false)}
          >
            Categorías
          </Link>

          <Link
            to="/business/register"
            className="block bg-geoPink text-white px-4 py-2 rounded-full w-max hover:bg-geoPurple transition"
            onClick={() => setIsOpen(false)}
          >
            + Registrar Negocio
          </Link>
        </div>
      )}
    </header>
  );
}
