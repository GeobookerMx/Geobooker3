// src/components/layout/NavBar.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md">
      <div className="mx-auto px-4 py-3 flex justify-between items-center">
        {/* LOGO */}
        <Link to="/" className="text-2xl font-bold text-blue-600">
          Geobooker
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex space-x-6">
          <Link to="/categories" className="text-gray-700 hover:text-blue-600">
            Categorías
          </Link>
          <Link to="/business/register" className="text-gray-700 hover:text-blue-600">
            Registrar negocio
          </Link>
          <Link to="/login" className="text-gray-700 hover:text-blue-600">
            Ingresar
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-gray-700"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white px-4 pb-4 space-y-3 shadow">
          <Link to="/categories" className="block text-gray-700 hover:text-blue-600">
            Categorías
          </Link>
          <Link to="/business/register" className="block text-gray-700 hover:text-blue-600">
            Registrar negocio
          </Link>
          <Link to="/login" className="block text-gray-700 hover:text-blue-600">
            Ingresar
          </Link>
        </div>
      )}
    </nav>
  );
}
