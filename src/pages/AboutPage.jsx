// src/pages/AboutPage.jsx
/**
 * About Us / ¿Quiénes Somos? page
 * Company information, mission, and team
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
    MapPin, Users, Globe, Heart, ArrowRight,
    Building2, Star, Sparkles, Target, Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AboutPage() {
    const { t, i18n } = useTranslation();
    const isSpanish = i18n.language?.startsWith('es');

    const stats = [
        { value: '1,000+', label: isSpanish ? 'Negocios Registrados' : 'Registered Businesses', icon: Building2 },
        { value: '50+', label: isSpanish ? 'Ciudades' : 'Cities', icon: MapPin },
        { value: '10K+', label: isSpanish ? 'Usuarios Activos' : 'Active Users', icon: Users },
        { value: '4.8★', label: isSpanish ? 'Calificación' : 'Rating', icon: Star },
    ];

    const values = [
        {
            icon: Target,
            title: isSpanish ? 'Nuestra Misión' : 'Our Mission',
            description: isSpanish
                ? 'Conectar a las personas con los negocios locales de su comunidad, impulsando la economía local y facilitando el descubrimiento de nuevos lugares.'
                : 'Connect people with local businesses in their community, boosting local economy and facilitating discovery of new places.'
        },
        {
            icon: Heart,
            title: isSpanish ? 'Lo que Nos Mueve' : 'What Drives Us',
            description: isSpanish
                ? 'Creemos que cada negocio local tiene una historia que contar. Geobooker es el puente que une estas historias con quienes las necesitan escuchar.'
                : 'We believe every local business has a story to tell. Geobooker is the bridge connecting these stories with those who need to hear them.'
        },
        {
            icon: Shield,
            title: isSpanish ? 'Nuestro Compromiso' : 'Our Commitment',
            description: isSpanish
                ? 'Transparencia, seguridad y apoyo incondicional a los emprendedores locales. Tu éxito es nuestro éxito.'
                : 'Transparency, security, and unconditional support for local entrepreneurs. Your success is our success.'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full filter blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full filter blur-3xl" />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Text content */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {isSpanish ? 'Conoce nuestra historia' : 'Learn our story'}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black mb-6">
                                {isSpanish ? '¿Quiénes Somos?' : 'About Us'}
                            </h1>

                            <p className="text-xl md:text-2xl text-white/90 max-w-xl">
                                {isSpanish
                                    ? 'Somos la plataforma que conecta a tu comunidad con los mejores negocios locales'
                                    : 'We are the platform connecting your community with the best local businesses'}
                            </p>
                        </div>

                        {/* Illustration area - Geobooker team/workers */}
                        <div className="hidden md:block">
                            <div className="relative">
                                {/* Main illustration container */}
                                <div className="w-72 h-56 rounded-2xl overflow-hidden shadow-2xl">
                                    <img
                                        src="/images/quienes-somos.jpg"
                                        alt="Equipo Geobooker"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Decorative badges */}
                                <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                    🇲🇽 Made in México
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* Values Section */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
                        {isSpanish ? 'Nuestros Valores' : 'Our Values'}
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        {values.map((value, index) => (
                            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                                    <value.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{value.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-16 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            {isSpanish ? 'Nuestra Historia' : 'Our Story'}
                        </h2>
                    </div>

                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <p className="text-lg text-gray-700 leading-relaxed mb-6">
                            {isSpanish
                                ? 'Geobooker nació de una idea simple: hacer que los negocios locales sean fáciles de encontrar. En un mundo donde las grandes cadenas dominan, creemos que los pequeños negocios merecen ser vistos.'
                                : 'Geobooker was born from a simple idea: make local businesses easy to find. In a world where big chains dominate, we believe small businesses deserve to be seen.'}
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed mb-6">
                            {isSpanish
                                ? 'Comenzamos en México, pero nuestra visión es global. Cada taquería, cada cafetería, cada tienda de barrio tiene una historia única. Nosotros les damos el mapa para que el mundo las encuentre.'
                                : 'We started in Mexico, but our vision is global. Every taco shop, every coffee place, every neighborhood store has a unique story. We give them the map so the world can find them.'}
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed font-semibold">
                            {isSpanish
                                ? '📍 Geobooker: Donde los negocios locales brillan.'
                                : '📍 Geobooker: Where local businesses shine.'}
                        </p>
                    </div>
                </div>
            </section>

            {/* Negocios que confían en nosotros */}
            <section className="py-16 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
                        {isSpanish ? 'Negocios que confían en Geobooker' : 'Businesses that trust Geobooker'}
                    </h2>
                    <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
                        {isSpanish
                            ? 'Desde cafeterías hasta talleres mecánicos, cientos de negocios ya son parte de nuestra comunidad'
                            : 'From coffee shops to auto repair, hundreds of businesses are already part of our community'}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Barista/Cafetería */}
                        <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[3/4]">
                            <img
                                src="/images/barista.jpg"
                                alt="Cafetería Geobooker"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">☕ {isSpanish ? 'Cafetería' : 'Coffee Shop'}</p>
                            </div>
                        </div>

                        {/* Mecánico */}
                        <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[3/4]">
                            <img
                                src="/images/mecanico.jpg"
                                alt="Taller Mecánico Geobooker"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">🔧 {isSpanish ? 'Taller Mecánico' : 'Auto Repair'}</p>
                            </div>
                        </div>

                        {/* Panadería */}
                        <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[3/4]">
                            <img
                                src="/images/panadera.jpg"
                                alt="Panadería Geobooker"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">🥖 {isSpanish ? 'Panadería' : 'Bakery'}</p>
                            </div>
                        </div>

                        {/* Estilistas */}
                        <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[3/4]">
                            <img
                                src="/images/estilistas.jpg"
                                alt="Estilistas Geobooker"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">💇 {isSpanish ? 'Estilistas' : 'Stylists'}</p>
                            </div>
                        </div>

                        {/* Electricista */}
                        <div className="group relative overflow-hidden rounded-xl shadow-lg aspect-[3/4]">
                            <img
                                src="/images/electricista.jpg"
                                alt="Electricista Geobooker"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">⚡ {isSpanish ? 'Electricista' : 'Electrician'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Inspirational Quote */}
            <section className="py-16 bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="text-5xl mb-6">💡</div>
                    <blockquote className="text-2xl md:text-3xl font-light text-white italic leading-relaxed mb-6">
                        {isSpanish
                            ? '"El secreto del éxito en los negocios no es hacer lo que otros hacen, sino ser diferente y hacerlo mejor."'
                            : '"The secret to success in business is not doing what others do, but being different and doing it better."'}
                    </blockquote>
                    <cite className="text-blue-300 font-semibold text-lg">
                        — Richard Branson
                    </cite>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
                        {isSpanish ? 'Geobooker en Números' : 'Geobooker by Numbers'}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl">
                                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                                    <stat.icon className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-3xl md:text-4xl font-black text-gray-900">{stat.value}</div>
                                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                        {isSpanish ? '¿Tienes un negocio?' : 'Have a business?'}
                    </h2>
                    <p className="text-gray-600 mb-8">
                        {isSpanish
                            ? 'Regístralo gratis en Geobooker y llega a miles de clientes potenciales'
                            : 'Register it for free on Geobooker and reach thousands of potential customers'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
                        >
                            {isSpanish ? 'Registrar mi Negocio' : 'Register my Business'}
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                        >
                            <Globe className="w-5 h-5" />
                            {isSpanish ? 'Explorar el Mapa' : 'Explore the Map'}
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
