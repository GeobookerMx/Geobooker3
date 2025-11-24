import React from 'react';
import { useApp } from "../contexts/AppContext"; // <--- CORRECTA (un solo "..")
import { Link } from 'react-router-dom'; // Para navegación a resultados de búsqueda
import { 
  Utensils, // 🍽️ Restaurantes
  MapPin,   // 📍 Comercios/Tiendas
  Briefcase, // 💼 Servicios Profesionales
  HeartPulse, // ❤️ Salud y Belleza
  Film,     // 🎬 Entretenimiento
  GraduationCap // 🎓 Educación
} from 'lucide-react'; // Iconos de Lucide (asumiendo que lo instalaste con npm i lucide-react)

const CategoriesPage = () => {
  const { dispatch } = useApp(); // Del AppContext para setear selectedCategory

  // Categorías alineadas con Supabase y Geobooker (con iconos y rutas)
  const categories = [
    {
      id: 'restaurantes',
      name: 'Restaurantes',
      icon: Utensils,
      description: 'Deliciosos lugares para comer y compartir',
      color: 'from-red-500 to-orange-500', // Gradiente cálido para comida
      route: '/search?category=restaurantes'
    },
    {
      id: 'tiendas',
      name: 'Tiendas & Comercios',
      icon: MapPin,
      description: 'Encuentra lo que necesitas cerca de ti',
      color: 'from-blue-500 to-indigo-500', // Azul para compras
      route: '/search?category=tiendas'
    },
    {
      id: 'servicios',
      name: 'Servicios Profesionales',
      icon: Briefcase,
      description: 'Expertos en lo que necesites',
      color: 'from-green-500 to-emerald-500', // Verde para profesionalismo
      route: '/search?category=servicios'
    },
    {
      id: 'salud',
      name: 'Salud y Belleza',
      icon: HeartPulse,
      description: 'Cuida de ti y tu bienestar',
      color: 'from-pink-500 to-rose-500', // Rosa para cuidado personal
      route: '/search?category=salud'
    },
    {
      id: 'entretenimiento',
      name: 'Entretenimiento',
      icon: Film,
      description: 'Diversión y ocio local',
      color: 'from-purple-500 to-violet-500', // Morado para diversión
      route: '/search?category=entretenimiento'
    },
    {
      id: 'educacion',
      name: 'Educación',
      icon: GraduationCap,
      description: 'Aprende y crece cerca',
      color: 'from-yellow-500 to-amber-500', // Amarillo para aprendizaje
      route: '/search?category=educacion'
    },
    // Agrega más si quieres, alineadas con CATEGORIES de supabase.js
    {
      id: 'bares',
      name: 'Bares y Cafeterías',
      icon: Utensils, // Reusa el ícono de comida
      description: 'Relájate con un trago o café',
      color: 'from-amber-500 to-yellow-500',
      route: '/search?category=bares'
    }
  ];

  // Función para manejar clics: setea categoría en context y navega
  const handleCategoryClick = (category) => {
    dispatch({ type: 'SET_CATEGORY', payload: category.id }); // Actualiza el estado global
    // Opcional: Muestra un toast o alerta
    console.log(`Buscando en categoría: ${category.name}`); // Temporal para debug
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gradient-to-br from-light to-white">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
          Explora por Categorías
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Descubre negocios locales en México. Encuentra restaurantes, servicios y mucho más cerca de ti.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.id}
              to={category.route} // Navega a resultados con query param
              onClick={() => handleCategoryClick(category)} // Actualiza context
              className="group" // Para hover effects
              aria-label={`Explorar ${category.name}`}
            >
              <div className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden`}>
                {/* Fondo gradiente con icono */}
                <div className={`w-full h-16 bg-gradient-to-r ${category.color} rounded-xl mb-4 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                {/* Nombre y descripción */}
                <h3 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-600 group-hover:text-secondary-dark">
                  {category.description}
                </p>
                
                {/* Botón sutil */}
                <button className="mt-4 w-full bg-gradient-to-r from-primary to-secondary text-white text-sm font-medium py-2 px-4 rounded-lg hover:shadow-md transition-all opacity-0 group-hover:opacity-100">
                  Ver Resultados
                </button>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Llamado a acción inferior */}
      <div className="text-center mt-12">
        <p className="text-gray-600 mb-4">
          ¿No ves tu categoría? {' '}
          <Link to="/add-business" className="text-primary hover:text-secondary font-semibold underline">
            Registra la tuya
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default CategoriesPage; // 