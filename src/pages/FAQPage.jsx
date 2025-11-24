import React from 'react';

const FAQPage = () => {
  const faqs = [
    {
      question: "¿Cómo registro mi negocio en Geobooker?",
      answer: "Puedes registrar tu negocio haciendo clic en 'Agregar Negocio' en el menú principal y completando el formulario."
    },
    {
      question: "¿Es gratuito usar Geobooker?",
      answer: "Sí, el registro básico es gratuito. Ofrecemos planes premium con funcionalidades adicionales."
    },
    {
      question: "¿Cómo contacto con soporte?",
      answer: "Puedes contactarnos a través del formulario de contacto o escribiéndonos a soporte@geobooker.com"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Preguntas Frecuentes</h1>
      <div className="bg-white rounded-lg shadow-md">
        {faqs.map((faq, index) => (
          <div key={index} className="border-b border-gray-200 last:border-b-0">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQPage; //