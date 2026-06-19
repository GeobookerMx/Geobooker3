import React from "react";

export default function EnterprisePromoTerms() {
  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm border border-red-200 p-6">
      <div className="flex items-start mb-3">
        <span className="text-sm font-black text-red-600 mr-3">PROMO</span>
        <h3 className="text-lg font-bold text-gray-900">
          Terminos y Condiciones - Promocion Global Enterprise 70% OFF
        </h3>
      </div>

      <ul className="text-sm text-gray-700 space-y-2">
        <li>
          • <strong>Descuento del 70%</strong> aplicable a precios globales enterprise durante la vigencia promocional.
        </li>
        <li>
          • La tarifa promocional se respeta para campanas contratadas dentro del periodo activo y confirmadas por pago.
        </li>
        <li>
          • Esta promocion es valida para contratos iniciados <strong>hasta el 1 de septiembre de 2026</strong>.
        </li>
        <li>
          • Al finalizar el periodo promocional, el precio regresa a la tarifa regular vigente.
        </li>
        <li>
          • No acumulable con otras promociones. Sujeto a disponibilidad de espacios.
        </li>
        <li>
          • <strong>Garantia de servicio:</strong> Durante esta fase promocional no garantizamos metricas especificas de impresiones o clics.
          Si tu campana experimenta fallas tecnicas de nuestra plataforma, te ofreceremos una <strong>extension gratuita de hasta 15 dias</strong>
          proporcional al tiempo afectado.
        </li>
        <li>
          • <strong>Transparencia:</strong> Al finalizar tu pauta, recibiras un informe con las metricas reales de rendimiento de tu campana
          (impresiones, clics y CTR). Sin promesas, solo datos reales.
        </li>
        <li>
          • Los espacios se asignan por orden de contratacion. Cada espacio tiene un <strong>cupo maximo</strong> de anunciantes simultaneos
          para evitar saturacion.
        </li>
      </ul>
    </div>
  );
}
