import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Utensils, Coffee, ShoppingBag, Briefcase, Wrench, HeartPulse, Film, GraduationCap,
  ArrowRight, MapPin, Search
} from 'lucide-react';

// 8 Categorías con subcategorías para México
const CATEGORIES = [
  {
    id: 'restaurantes',
    name: 'Restaurantes & Comida',
    icon: Utensils,
    description: 'Deliciosos lugares para comer',
    color: 'from-red-500 to-orange-500',
    subcategories: ['Taquerías', 'Comida Corrida', 'Comida Rápida', 'Pizzerías', 'Mariscos', 'Comida Mexicana', 'Internacional', 'Postres/Heladerías']
  },
  {
    id: 'bares',
    name: 'Bares y Cafeterías',
    icon: Coffee,
    description: 'Relájate con un café o trago',
    color: 'from-amber-500 to-yellow-500',
    subcategories: ['Cafeterías', 'Bares/Cantinas', 'Cervecerías', 'Coctelerías', 'Antros/Clubs']
  },
  {
    id: 'tiendas',
    name: 'Tiendas & Comercios',
    icon: ShoppingBag,
    description: 'Encuentra lo que necesitas',
    color: 'from-blue-500 to-indigo-500',
    subcategories: ['Abarrotes', 'Minisúper', 'Ropa y Calzado', 'Papelerías', 'Electrónicos', 'Ferreterías', 'Mueblerías', 'Mascotas']
  },
  {
    id: 'servicios',
    name: 'Servicios Profesionales',
    icon: Briefcase,
    description: 'Expertos en lo que necesites',
    color: 'from-green-500 to-emerald-500',
    subcategories: ['Abogados', 'Contadores', 'Consultoría', 'Diseñadores', 'Notarías', 'Arquitectos', 'Recursos Humanos']
  },
  {
    id: 'hogar_autos',
    name: 'Hogar, Reparaciones & Autos',
    icon: Wrench,
    description: 'Talleres y servicios del hogar',
    color: 'from-gray-600 to-gray-800',
    subcategories: [
      'Taller Mecánico', 'Vulcanizadora', 'Alineación y Balanceo', 'Taller Eléctrico',
      'Motos', 'Tracto/Camiones', 'Diesel', 'Boutique Automotriz', 'Lavado de Autos',
      'Plomería', 'Electricista', 'Cerrajero', 'Carpintería', 'Herrería', 'Vidriería', 'Limpieza'
    ]
  },
  {
    id: 'salud',
    name: 'Salud y Belleza',
    icon: HeartPulse,
    description: 'Cuida de ti y tu bienestar',
    color: 'from-pink-500 to-rose-500',
    subcategories: ['Consultorios', 'Clínicas', 'Dentistas', 'Psicología', 'Spa/Masajes', 'Gimnasios', 'Barberías', 'Salones de Belleza', 'Farmacias']
  },
  {
    id: 'entretenimiento',
    name: 'Entretenimiento',
    icon: Film,
    description: 'Diversión y ocio local',
    color: 'from-purple-500 to-violet-500',
    subcategories: ['Cines', 'Teatros', 'Parques', 'Boliche/Billar', 'Karaoke', 'Canchas Deportivas', 'Eventos']
  },
  {
    id: 'educacion',
    name: 'Educación',
    icon: GraduationCap,
    description: 'Aprende y crece',
    color: 'from-teal-500 to-cyan-500',
    subcategories: ['Escuelas', 'Guarderías', 'Cursos y Talleres', 'Idiomas', 'Capacitación', 'Música/Danza']
  }
];

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
  };

  const handleSubcategoryClick = (sub) => {
    setSelectedSubcategory(sub === selectedSubcategory ? null : sub);
  };

  const handleSearch = () => {
    if (!selectedCategory) return;

    const params = new URLSearchParams();
    params.set('category', selectedCategory.id);
    if (selectedSubcategory) {
      params.set('subcategory', selectedSubcategory);
    }

    navigate(`/?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Explora por Categorías
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Filtra el mapa por tipo de negocio y descubre lugares cerca de ti en México
          </p>
        </div>

        {/* Grid de 8 categorías */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02]'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${cat.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm md:text-base mb-1">{cat.name}</h3>
                <p className="text-xs text-gray-500 hidden md:block">{cat.description}</p>
              </button>
            );
          })}
        </div>

        {/* Panel de subcategorías */}
        {selectedCategory && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Filtrar en <span className={`bg-gradient-to-r ${selectedCategory.color} bg-clip-text text-transparent`}>{selectedCategory.name}</span>
              </h3>
              <span className="text-sm text-gray-400">{selectedCategory.subcategories.length} subcategorías</span>
            </div>

            {/* Chips de subcategorías */}
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategory.subcategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => handleSubcategoryClick(sub)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selectedSubcategory === sub
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Resumen y botón */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                <span>
                  Buscando <strong>{selectedCategory.name}</strong>
                  {selectedSubcategory && <> → <strong>{selectedSubcategory}</strong></>}
                  {' '}cerca de ti
                </span>
              </div>

              <button
                onClick={handleSearch}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
              >
                <Search className="w-5 h-5" />
                Ver en el Mapa
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* CTA para registrar negocio */}
        <div className="text-center mt-12 p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
          <p className="text-gray-700 mb-4 text-lg">
            ¿No ves tu negocio o categoría?
          </p>
          <button
            onClick={() => navigate('/business/new')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition"
          >
            Registra tu Negocio en Geobooker
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;