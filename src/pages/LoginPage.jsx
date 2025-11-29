import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí integrarás la autenticación con Supabase después
    console.log('Datos de login:', formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('login.title')}</h1>
      <p className="text-gray-600 mb-8">{t('login.subtitle')}</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 font-medium mb-2">{t('login.email')}</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('login.emailPlaceholder')}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">{t('login.password')}</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('login.passwordPlaceholder')}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold"
        >
          {t('login.loginButton')}
        </button>

        <div className="text-center mt-4">
          <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">
            {t('login.forgotPassword')}
          </a>
        </div>
      </form>
    </div>
  );
};

export default LoginPage;