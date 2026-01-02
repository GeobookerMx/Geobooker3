import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdsPolicyPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden p-8 md:p-12">
                <div className="mb-8">
                    <Link to="/advertise" className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a Publicidad
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Políticas de Publicidad y Términos Legales</h1>
                    <p className="text-gray-500">Última actualización: Diciembre 2025</p>
                </div>

                <div className="prose prose-blue max-w-none text-gray-700 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">1. Estrategia Fiscal: Tasa 0% IVA (Exportación)</h2>
                        <p>
                            Geobooker opera bajo la legislación mexicana. De acuerdo con el <strong>Artículo 29 de la Ley del IVA</strong>,
                            la prestación de servicios digitales a clientes residentes en el extranjero se considera <strong>exportación de servicios</strong>,
                            por lo cual está gravada a una tasa del <strong>0% de IVA</strong>.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Clientes en México:</strong> Se aplicará el 16% de IVA sobre el monto facturado.</li>
                            <li><strong>Clientes Internacionales (Europa, USA, LATAM):</strong> Están exentos de pagar IVA mexicano.</li>
                        </ul>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                            <p className="text-sm text-blue-800">
                                <strong>Nota para empresas de la UE:</strong> Recibirán un "Commercial Invoice". Es responsabilidad del anunciante declarar la operación bajo el mecanismo de "Inversión del Sujeto Pasivo" (Reverse Charge) según su legislación local.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">2. Normas de Contenido</h2>
                        <p>Para garantizar una experiencia segura, prohibimos estrictamente:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Productos ilegales, drogas, armas o explosivos.</li>
                            <li>Contenido adulto explícito o servicios sexuales.</li>
                            <li>Discursos de odio, discriminación o violencia.</li>
                            <li>Publicidad engañosa ("Curas milagrosas", esquemas piramidales).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">3. Segmentación y Privacidad (GDPR)</h2>
                        <p>
                            Respetamos el Reglamento General de Protección de Datos (GDPR). Nuestra segmentación es contextual y geográfica, no invasiva.
                            No permitimos segmentar audiencias basándose en datos sensibles como raza, religión, orientación sexual o salud.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">4. Garantía de Servicio (Fase de Lanzamiento)</h2>
                        <p>
                            Durante nuestra fase de lanzamiento (promoción 70% OFF hasta marzo 2026), Geobooker <strong>no garantiza métricas específicas</strong> de impresiones, clics o conversiones.
                        </p>
                        <p className="mt-3">
                            <strong>Extensión por fallas técnicas:</strong> Si tu campaña experimenta fallas técnicas atribuibles a nuestra plataforma
                            (anuncio no visible, errores de carga, interrupciones del servicio), te ofreceremos una <strong>extensión gratuita de hasta 15 días</strong> proporcional al tiempo afectado.
                        </p>
                        <p className="mt-3">
                            <strong>Informe de rendimiento:</strong> Al finalizar tu pauta, recibirás un informe con las métricas reales de tu campaña (impresiones, clics, CTR).
                            Esto es un compromiso de transparencia, no una garantía de resultados.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Nota:</strong> Esta política de garantía puede cambiar conforme la plataforma crezca. Los términos vigentes al momento de contratar serán los que apliquen a tu campaña.
                            </p>
                        </div>
                    </section>
                </div>

            </div>
        </div>
    );
};

export default AdsPolicyPage;
