import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { CONTACT_EMAILS } from '../config/contacts';

const PrivacyPolicyPage = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <SEO
        title="Aviso de privacidad | Geobooker"
        description="Conoce cómo tratamos y protegemos datos personales y empresariales en Geobooker."
        url="/privacy"
      />
      <main className="container mx-auto px-4 max-w-4xl">
        <article className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100">
          <header className="border-b pb-6 mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900">Aviso de privacidad</h1>
            <p className="mt-4 text-gray-600">
              Este aviso describe de forma general el tratamiento de datos en los sitios, aplicaciones y
              servicios operados bajo la marca Geobooker.
            </p>
            <p className="mt-3 text-sm text-gray-500">Última actualización: 8 de septiembre de 2026</p>
          </header>

          <div className="prose prose-blue max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900">1. Responsable y contacto</h2>
              <p>
                Geobooker, con operación en México, es responsable de los tratamientos que determina
                directamente. Para privacidad y derechos sobre datos personales escribe a{' '}
                <a className="text-blue-700 underline" href={`mailto:${CONTACT_EMAILS.soporte}`}>
                  {CONTACT_EMAILS.soporte}
                </a>{' '}
                con el asunto “Privacidad / eliminación de datos”.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">2. Datos que podemos tratar</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>identificación y cuenta: nombre, correo, perfil, autenticación y preferencias;</li>
                <li>información empresarial: negocio, industria, ubicación, sitio web y datos públicos;</li>
                <li>contacto comercial: cargo, correo, teléfono, idioma y canal preferido;</li>
                <li>uso y seguridad: dispositivo, IP, sesión, eventos, auditoría e incidentes;</li>
                <li>servicios contratados: campañas, pagos, facturación, soporte y entregables;</li>
                <li>CRM y mensajería: consentimiento, supresiones, actividades, mensajes y estados;</li>
                <li>integraciones: identificadores técnicos de Meta, WhatsApp u otros proveedores.</li>
              </ul>
              <p>
                No solicitamos contraseñas ni tokens de proveedores por formularios públicos. Los secretos de
                integración se conservan exclusivamente en componentes server-side autorizados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">3. Fuentes</h2>
              <p>
                Podemos obtener datos de la persona titular, su organización, interacciones con la plataforma,
                fuentes públicas, directorios, proveedores autorizados y clientes que utilizan herramientas CRM.
                La procedencia y fuente verificable se conservan cuando resulta necesaria para calidad,
                trazabilidad o atención de derechos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">4. Finalidades</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>crear y proteger cuentas;</li>
                <li>operar el directorio, mapas, perfiles y reclamaciones de negocios;</li>
                <li>prestar publicidad, Enterprise/B2B, CRM y Geobooker Leads;</li>
                <li>procesar campañas autorizadas y registrar su atribución;</li>
                <li>atender soporte, seguridad, fraude, obligaciones legales y fiscales;</li>
                <li>medir y mejorar el servicio mediante información agregada.</li>
              </ul>
              <p>
                Las señales de intención comercial se diseñan para análisis agregado; no para seguimiento
                invasivo individual ni para inferir datos sensibles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">5. CRM, clientes y mensajería</h2>
              <p>
                Si una organización cliente decide los destinatarios y finalidades de una campaña, esa
                organización puede actuar como responsable y Geobooker como proveedor técnico conforme al
                contrato. Aplicamos controles de permisos, consentimiento, supresión e idempotencia, pero cada
                cliente debe acreditar la licitud de sus listas y comunicaciones.
              </p>
              <p>
                Tener un teléfono público no equivale a consentimiento para WhatsApp. Las bajas y bloqueos deben
                respetarse en campañas futuras. No vendemos access tokens, secretos de integración ni el contenido
                privado de conversaciones.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">6. Proveedores y transferencias</h2>
              <p>
                Utilizamos proveedores de infraestructura, autenticación, pagos, mapas, analítica, correo y
                mensajería para operar el servicio. Pueden procesar datos en otros países bajo sus condiciones y
                las salvaguardas aplicables. No les autorizamos a usar los datos para fines propios incompatibles
                con el servicio contratado.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">7. Conservación y seguridad</h2>
              <p>
                Conservamos los datos durante el tiempo necesario para prestar el servicio y atender obligaciones
                legales, fiscales, contractuales, antifraude o de seguridad. Aplicamos medidas administrativas y
                técnicas según el riesgo, incluyendo controles de acceso, separación de ambientes, auditoría y
                secretos server-side. Ningún sistema es infalible, por lo que revisamos y mejoramos estos controles.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">8. Derechos y eliminación</h2>
              <p>
                Puedes solicitar acceso, rectificación, cancelación u oposición, así como revocar consentimiento
                cuando proceda. Consulta las{' '}
                <Link to="/data-deletion" className="font-semibold text-blue-700 underline">
                  instrucciones públicas de eliminación
                </Link>. Podemos solicitar información mínima para verificar identidad y proteger tus datos de
                solicitudes fraudulentas.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">9. Cambios</h2>
              <p>
                Publicaremos aquí los cambios y su fecha de vigencia. Cuando una modificación sea material,
                utilizaremos un aviso razonable dentro de la plataforma o por un canal registrado.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
