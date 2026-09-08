import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { CONTACT_EMAILS } from '../config/contacts';

const UPDATED_AT = '8 de septiembre de 2026';

const TermsOfServicePage = () => {
  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <SEO
        title="Términos de servicio | Geobooker"
        description="Términos aplicables al directorio, publicidad, CRM, Geobooker Leads y canales de comunicación de Geobooker."
        url="/terms"
      />
      <main className="container mx-auto px-4 max-w-4xl">
        <article className="bg-white p-7 md:p-12 rounded-3xl shadow-xl border border-gray-100">
          <header className="border-b pb-6 mb-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Documento público</p>
            <h1 className="text-4xl font-extrabold text-gray-900 mt-2">Términos de servicio</h1>
            <p className="text-gray-600 mt-4">
              Estos términos regulan el uso de los sitios, aplicaciones y servicios operados bajo la marca
              Geobooker. Al crear una cuenta, contratar un servicio o utilizar la plataforma, aceptas estos
              términos y el <Link to="/privacy" className="text-blue-700 underline">Aviso de privacidad</Link>.
            </p>
            <p className="text-sm text-gray-500 mt-3">Última actualización: {UPDATED_AT}</p>
          </header>

          <div className="prose prose-blue max-w-none text-gray-700 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900">1. Servicios incluidos</h2>
              <p>
                Geobooker ofrece búsqueda y directorio de negocios, perfiles comerciales, publicidad
                geolocalizada, herramientas Enterprise/B2B y, conforme sean habilitados, CRM, Geobooker Leads,
                importación de datos, seguimiento comercial, analítica y comunicación por correo o WhatsApp.
                Algunas funciones pueden estar en prueba, requerir aprobación o no estar disponibles en todos
                los países.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">2. Cuentas y uso autorizado</h2>
              <p>
                Debes proporcionar información correcta, proteger tus credenciales y usar la plataforma sólo
                con fines lícitos. Eres responsable de las acciones realizadas desde tu cuenta y de mantener
                actualizados los permisos de las personas de tu organización. No puedes intentar acceder a
                otros espacios de trabajo, eludir controles de seguridad, extraer datos de forma abusiva ni
                introducir código, archivos o contenido malicioso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">3. Directorio y datos de terceros</h2>
              <p>
                Parte de la información comercial puede provenir de negocios, usuarios o fuentes públicas y
                proveedores autorizados. Geobooker procura normalizar y actualizar esa información, pero no
                garantiza que horarios, teléfonos, disponibilidad, precios o datos publicados por terceros sean
                siempre exactos. Los titulares pueden solicitar corrección, reclamación o baja mediante los
                canales publicados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">4. CRM, Leads y datos de clientes</h2>
              <p>
                Quien utilice CRM o Geobooker Leads debe contar con una finalidad legítima y, cuando sea
                exigible, consentimiento válido para cargar, segmentar o contactar personas. También debe
                respetar bajas, listas de supresión, límites territoriales y legislación aplicable. Está
                prohibido cargar listas obtenidas ilícitamente, datos sensibles innecesarios o usar el servicio
                para vigilancia, discriminación o acoso.
              </p>
              <p>
                En servicios administrados o para clientes empresariales, las responsabilidades sobre el
                tratamiento de datos, conservación, instrucciones y transferencias podrán detallarse en un
                contrato y acuerdo de tratamiento de datos. Estos términos no sustituyen esos anexos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">5. Correo y WhatsApp</h2>
              <p>
                El uso de canales de mensajería está sujeto a consentimiento, elegibilidad del destinatario,
                plantillas aprobadas cuando correspondan y políticas del proveedor, incluidas las de Meta y
                WhatsApp. Un número disponible públicamente no constituye por sí solo autorización para enviar
                mensajes. Geobooker puede impedir o suspender campañas cuando falten evidencias, exista una baja,
                se excedan límites o haya riesgo legal, de seguridad o reputacional.
              </p>
              <p>
                La entrega, lectura o disponibilidad de mensajes depende de redes y proveedores externos; por
                ello no se garantiza la entrega de cada comunicación ni resultados comerciales específicos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">6. Publicidad, pagos y resultados</h2>
              <p>
                Campañas, inventario, alcance, territorios, moneda, impuestos, duración y entregables se definen
                en la orden o propuesta correspondiente. La publicación está sujeta a revisión creativa y de
                cumplimiento. Salvo acuerdo escrito, Geobooker no garantiza ventas, reuniones, conversiones,
                posiciones permanentes ni un volumen exacto de resultados. Los reembolsos y cancelaciones se
                regirán por la orden contratada y la legislación aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">7. Contenido y propiedad intelectual</h2>
              <p>
                Conservas los derechos que tengas sobre el contenido que aportas. Nos autorizas a alojarlo,
                procesarlo y mostrarlo únicamente en la medida necesaria para prestar el servicio contratado.
                No debes aportar contenido que infrinja derechos de terceros. El software, diseño, marcas y
                materiales propios de Geobooker permanecen protegidos por la normativa aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">8. Automatización e inteligencia artificial</h2>
              <p>
                Algunas funciones pueden clasificar, resumir o recomendar acciones automáticamente. Sus salidas
                son auxiliares y pueden contener errores; las decisiones comerciales, legales, crediticias o de
                contacto deben ser revisadas por una persona autorizada. No se deben introducir secretos,
                credenciales ni datos sensibles innecesarios en asistentes o campos de texto libre.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">9. Suspensión y terminación</h2>
              <p>
                Podemos limitar o suspender funciones ante abuso, impago, incidentes de seguridad, incumplimiento
                de políticas o requerimientos legales. Puedes dejar de usar el servicio y solicitar la eliminación
                de tu cuenta y datos conforme a nuestras{' '}
                <Link to="/data-deletion" className="text-blue-700 underline">instrucciones de eliminación</Link>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">10. Disponibilidad y responsabilidad</h2>
              <p>
                Procuramos mantener una plataforma segura y disponible, pero pueden existir interrupciones,
                mantenimiento o fallas de terceros. En la medida permitida por la ley, cada parte responde por
                sus propios actos y Geobooker no será responsable de decisiones tomadas exclusivamente con base
                en datos de terceros, estimaciones o resultados automatizados.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">11. Cambios y legislación aplicable</h2>
              <p>
                Podemos actualizar estos términos para reflejar cambios del servicio o regulatorios. Publicaremos
                la fecha vigente y, cuando el cambio sea material, mostraremos un aviso razonable. Se aplicarán
                las leyes de México, sin limitar los derechos irrenunciables que correspondan a usuarios de otras
                jurisdicciones.
              </p>
            </section>

            <section className="rounded-2xl bg-blue-50 border border-blue-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900">12. Contacto</h2>
              <p>
                Para dudas sobre estos términos escribe a{' '}
                <a className="text-blue-700 underline" href={`mailto:${CONTACT_EMAILS.soporte}`}>
                  {CONTACT_EMAILS.soporte}
                </a>. Para privacidad o eliminación de datos utiliza el mismo canal con el asunto
                “Privacidad / eliminación de datos”.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
