// src/pages/FAQPage.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import SEO from '../components/SEO';

const FAQPage = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const faqKeys = [
    'register', 'cost', 'support', 'howSearch', 'location',
    'advertise', 'premium', 'invoice', 'deleteAccount', 'security',
    'international', 'reviews', 'oxxo', 'referral', 'languages'
  ];

  const faqs = faqKeys.map(key => ({
    question: t(`faq.items.${key}.q`),
    answer: t(`faq.items.${key}.a`)
  }));

  // JSON-LD FAQPage schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return (
    <>
      <SEO
        title={t('faq.title')}
        description={t('faq.description')}
      />

      {/* Inject FAQPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <HelpCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              {t('faq.title')}
            </h1>
            <p className="text-gray-600 text-lg">{t('faq.subtitle')}</p>
          </div>

          {/* FAQ Accordion */}
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${isOpen ? 'border-blue-200 shadow-md' : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-gray-800 font-semibold pr-4">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contact CTA */}
          <div className="mt-10 text-center bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('faq.stillHaveQuestions')}</h2>
            <p className="text-gray-600 mb-4">{t('faq.contactUs')}</p>
            <a
              href="mailto:soporte@geobooker.com"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {t('faq.emailSupport')}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQPage;