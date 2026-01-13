import React from 'react';

const TermsOfServicePage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Términos de Servicio</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">
          Bienvenido a Geobooker. Al utilizar nuestra plataforma geobooker.com.mx ("el Sitio"), usted acepta cumplir con los siguientes Términos y Condiciones de Uso.
        </p>

        <section className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 underline decoration-blue-500">1. Naturaleza del Servicio</h2>
            <p className="text-gray-600">
              Geobooker es una plataforma de directorio que facilita el contacto entre usuarios y negocios. Geobooker no es dueño de los negocios listados (excepto donde se indique) ni garantiza la calidad de los servicios prestados por terceros.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 underline decoration-blue-500">2. Geobooker Ads y Pagos</h2>
            <div className="text-gray-600 space-y-2">
              <p>• <strong>Pagos:</strong> Los servicios publicitarios se pagan por adelantado mediante Stripe u otros métodos autorizados.</p>
              <p>• <strong>Facturación:</strong> Todas las solicitudes de facturación deben realizarse en el mismo mes de la compra enviando los datos fiscales a ventas@geobooker.com.mx.</p>
              <p>• <strong>Reembolsos:</strong> Debido a la naturaleza digital del servicio de publicidad, una vez que el anuncio ha sido aprobado y publicado, no se realizarán reembolsos.</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 underline decoration-blue-500">3. Responsabilidad sobre Información de Terceros</h2>
            <p className="text-gray-600">
              Geobooker utiliza servicios de terceros como <strong>Google Places API</strong> y <strong>Apify</strong> para proporcionar información de negocios. No nos hacemos responsables por la exactitud, horarios, teléfonos o veracidad de los datos provenientes de estos proveedores externos.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 underline decoration-blue-500">4. Registro y Verificación (Premium)</h2>
            <p className="text-gray-600">
              El pago de la suscripción Premium otorga el derecho a beneficios visuales y mejores posiciones, pero no exime al negocio de cumplir con las reglas de comunidad de Geobooker. Nos reservamos el derecho de revocar el estado Premium ante comportamientos fraudulentos.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 underline decoration-blue-500">5. Moderación de Contenido</h2>
            <p className="text-gray-600">
              Geobooker se reserva el derecho de eliminar negocios, comentarios o anuncios que promuevan actividades ilegales, violencia, discriminación o que infrinjan derechos de terceros sin previo aviso.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 underline decoration-blue-500">6. Jurisdicción y Ley Aplicable</h2>
            <p className="text-gray-600">
              Para cualquier controversia legal relacionada con Geobooker, las partes acuerdan someterse a las leyes aplicables en <strong>México</strong> y a la jurisdicción de los tribunales competentes en México, renunciando a cualquier otro fuero.
            </p>
          </div>
        </section>

        <div className="mt-8 pt-6 border-t text-sm text-gray-400">
          Última actualización: Enero 2026. Al continuar navegando, usted acepta estos términos.
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;//