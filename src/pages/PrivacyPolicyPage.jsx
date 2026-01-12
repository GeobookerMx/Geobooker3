import React from 'react';
import SEO from '../components/SEO';

const PrivacyPolicyPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <SEO
        title="Aviso de Privacidad - Geobooker"
        description="Conoce cómo protegemos tus datos personales y empresariales en Geobooker."
      />
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">
            Aviso de Privacidad
          </h1>

          <div className="prose prose-blue max-w-none text-gray-600 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Identidad y Domicilio del Responsable</h2>
              <p>
                Geobooker, con domicilio en México, es el responsable del tratamiento de sus datos personales
                y empresariales recopilados a través de nuestra plataforma geobooker.com.mx.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Datos que Recopilamos</h2>
              <p>
                Para la operación del directorio comercial y servicios de marketing, recopilamos:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Datos de Identificación del Negocio:</strong> Nombre comercial, razón social, dirección física, giro e industria.</li>
                <li><strong>Datos de Contacto Corporativo:</strong> Nombre del representante o contacto clave, puesto, correos electrónicos corporativos y números telefónicos.</li>
                <li><strong>Datos de Localización:</strong> Ciudad, colonia, código postal y coordenadas geográficas para el mapa.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Finalidades del Tratamiento</h2>
              <p>Sus datos son utilizados para las siguientes finalidades primarias:</p>
              <ol className="list-decimal pl-6 space-y-2 mt-4">
                <li>Inclusión en el directorio comercial público de Geobooker para mejorar su visibilidad SEO.</li>
                <li>Gestión de solicitudes de reclamación de perfil por parte de los dueños reales.</li>
                <li>Envío de comunicaciones comerciales y propuestas de valor relacionadas con la plataforma.</li>
              </ol>
            </section>

            <section className="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-500 italic">
              <h2 className="text-xl font-bold text-blue-900 mb-2">Compromiso Antiespam</h2>
              <p className="text-blue-800">
                En Geobooker respetamos su privacidad. Todas nuestras comunicaciones masivas incluyen un enlace de
                <strong> "Unsubscribe" (Darse de baja)</strong> visible y de un solo clic, cumpliendo con las
                normativas internacionales de protección de datos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Derechos ARCO</h2>
              <p>
                Usted tiene derecho a acceder, rectificar, cancelar u oponerse al tratamiento de sus datos.
                Para ejercer estos derechos, puede enviar un correo a <strong>legal@geobooker.com.mx</strong>.
              </p>
            </section>

            <section className="text-sm text-gray-400 border-t pt-8">
              Última actualización: Enero 2026. Al utilizar Geobooker, usted acepta los términos descritos en este aviso.
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;