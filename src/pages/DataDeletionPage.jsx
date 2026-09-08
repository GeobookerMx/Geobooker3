import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogIn, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../contexts/AuthContext';
import { CONTACT_EMAILS } from '../config/contacts';

const DataDeletionPage = () => {
  const { user } = useAuth();
  const deletionSubject = encodeURIComponent('Privacidad / eliminación de datos');
  const deletionEmail = `mailto:${CONTACT_EMAILS.soporte}?subject=${deletionSubject}`;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO
        title="Eliminación de datos | Geobooker"
        description="Instrucciones públicas para eliminar una cuenta o solicitar la eliminación de datos personales tratados por Geobooker."
        url="/data-deletion"
      />
      <main className="container mx-auto max-w-4xl px-4">
        <article className="rounded-3xl border border-gray-100 bg-white p-7 shadow-xl md:p-12">
          <header className="border-b pb-7">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
              <Trash2 className="h-7 w-7 text-red-700" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Solicitud gratuita</p>
            <h1 className="mt-2 text-4xl font-extrabold text-gray-900">Eliminación de cuenta y datos</h1>
            <p className="mt-4 text-gray-600">
              Esta página es pública y explica cómo solicitar que Geobooker elimine una cuenta o datos
              personales, incluidos datos asociados a integraciones de Meta, Facebook o WhatsApp.
            </p>
            <p className="mt-3 text-sm text-gray-500">Última actualización: 8 de septiembre de 2026</p>
          </header>

          <div className="mt-8 space-y-9 text-gray-700">
            <section>
              <h2 className="text-2xl font-bold text-gray-900">Opción 1: eliminación dentro de Geobooker</h2>
              <p className="mt-3">
                Si puedes entrar a tu cuenta, inicia el flujo autenticado. Por seguridad deberás confirmar la
                acción desde tu propia sesión.
              </p>
              <Link
                to={user ? '/delete-account' : '/login'}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
              >
                {user ? <Trash2 className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                {user ? 'Eliminar mi cuenta' : 'Iniciar sesión para eliminarla'}
              </Link>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">Opción 2: solicitud por correo</h2>
              <p className="mt-3">
                Si no puedes iniciar sesión, si utilizaste una integración de Meta o si tus datos aparecen como
                contacto comercial, escribe desde el correo relacionado con tus datos. Incluye tu nombre, el
                correo o teléfono que deseas localizar, la empresa remitente si aplica y una descripción clara
                de lo que solicitas. No envíes contraseñas, códigos, tokens ni documentos innecesarios.
              </p>
              <a
                href={deletionEmail}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
              >
                <Mail className="h-5 w-5" />
                Escribir a {CONTACT_EMAILS.soporte}
              </a>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600" /> Datos incluidos
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5">
                  <li>cuenta, perfil y preferencias vinculadas;</li>
                  <li>identificadores recibidos mediante una integración de Meta;</li>
                  <li>tokens de conexión bajo control de Geobooker;</li>
                  <li>datos de contacto, conversaciones o actividad que legalmente proceda cancelar;</li>
                  <li>vínculos entre tu identidad y espacios de trabajo de CRM.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-gray-200 p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <ShieldCheck className="h-5 w-5 text-blue-700" /> Verificación y límites
                </h2>
                <p className="mt-4">
                  Podemos pedir información mínima para acreditar identidad y evitar que otra persona borre tus
                  datos. Cierta evidencia fiscal, antifraude, de seguridad o de cumplimiento puede conservarse
                  bloqueada durante el plazo legal aplicable. Te explicaremos cualquier negativa total o parcial.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">Si eres contacto de un cliente de CRM</h2>
              <p className="mt-3">
                Cuando una empresa cliente decide qué comunicaciones enviarte, esa empresa puede ser la
                responsable principal de tus datos y Geobooker actuar como proveedor técnico. Puedes solicitar la
                baja directamente al remitente o escribirnos indicando quién te contactó; aplicaremos la
                supresión correspondiente y canalizaremos la solicitud sin reutilizar tus datos para otra
                finalidad.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900">Plazos y confirmación</h2>
              <p className="mt-3">
                Confirmaremos la recepción por el canal proporcionado. Cuando resulte aplicable la legislación
                mexicana de protección de datos, comunicaremos la determinación dentro del plazo legal y haremos
                efectiva la solicitud procedente dentro del periodo correspondiente. Los respaldos protegidos se
                depuran conforme a su ciclo de retención y no se usan para operaciones ordinarias.
              </p>
            </section>

            <section className="rounded-2xl bg-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900">Documentos relacionados</h2>
              <div className="mt-3 flex flex-wrap gap-4">
                <Link to="/privacy" className="font-semibold text-blue-700 underline">Aviso de privacidad</Link>
                <Link to="/terms" className="font-semibold text-blue-700 underline">Términos de servicio</Link>
                <Link to="/support" className="font-semibold text-blue-700 underline">Soporte</Link>
              </div>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default DataDeletionPage;
