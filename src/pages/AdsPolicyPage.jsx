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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Politicas de Publicidad y Terminos Legales</h1>
                    <p className="text-gray-500">Ultima actualizacion: Junio 2026</p>
                </div>

                <div className="prose prose-blue max-w-none text-gray-700 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">1. Estrategia Fiscal: Tasa 0% IVA (Exportacion)</h2>
                        <p>
                            Geobooker opera bajo la legislacion mexicana. De acuerdo con el <strong>Articulo 29 de la Ley del IVA</strong>,
                            la prestacion de servicios digitales a clientes residentes en el extranjero se considera <strong>exportacion de servicios</strong>,
                            por lo cual esta gravada a una tasa del <strong>0% de IVA</strong>.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Clientes en Mexico:</strong> Se aplicara el 16% de IVA sobre el monto facturado.</li>
                            <li><strong>Clientes Internacionales (Europa, USA, LATAM):</strong> Estan exentos de pagar IVA mexicano.</li>
                        </ul>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                            <p className="text-sm text-blue-800">
                                <strong>Nota para empresas de la UE:</strong> Recibiran un "Commercial Invoice". Es responsabilidad del anunciante declarar la operacion bajo el mecanismo de "Inversion del Sujeto Pasivo" (Reverse Charge) segun su legislacion local.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">2. Normas de Contenido</h2>
                        <p>Para garantizar una experiencia segura, prohibimos estrictamente:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Productos ilegales, drogas, armas o explosivos.</li>
                            <li>Contenido adulto explicito o servicios sexuales.</li>
                            <li>Discursos de odio, discriminacion o violencia.</li>
                            <li>Publicidad enganosa, curas milagrosas o esquemas piramidales.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">3. Segmentacion y Privacidad (GDPR)</h2>
                        <p>
                            Respetamos el Reglamento General de Proteccion de Datos (GDPR). Nuestra segmentacion es contextual y geografica, no invasiva.
                            No permitimos segmentar audiencias basandose en datos sensibles como raza, religion, orientacion sexual o salud.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 mb-4">4. Garantia de Servicio (Promocion Enterprise Global)</h2>
                        <p>
                            Durante nuestra promocion enterprise global de <strong>50% OFF vigente hasta el 31 de diciembre de 2026</strong>, Geobooker <strong>no garantiza metricas especificas</strong> de impresiones, clics o conversiones.
                        </p>
                        <p className="mt-3">
                            <strong>Revision previa y extension por fallas tecnicas:</strong> Toda pauta pasa por validacion editorial, territorial y fiscal con una ventana estimada de 12 a 72 horas antes de publicarse.  Si tu campana experimenta fallas tecnicas atribuibles a nuestra plataforma
                            (anuncio no visible, errores de carga, interrupciones del servicio), te ofreceremos una <strong>extension gratuita de hasta 15 dias</strong> proporcional al tiempo afectado.
                        </p>
                        <p className="mt-3">
                            <strong>Informe de rendimiento:</strong> Al finalizar tu pauta, recibiras un informe con las metricas reales de tu campana (impresiones, clics, CTR).
                            Esto es un compromiso de transparencia, no una garantia de resultados.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Nota:</strong> Esta politica de garantia puede cambiar conforme la plataforma crezca. Los terminos vigentes al momento de contratar seran los que apliquen a tu campana.
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdsPolicyPage;
