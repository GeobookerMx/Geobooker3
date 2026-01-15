// src/components/admin/EmailTester.jsx
// Componente simple para probar envío de emails con Resend

import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { sendEmail } from '../../services/emailService';

const EmailTester = () => {
    const [testEmail, setTestEmail] = useState('ventasgeobooker@gmail.com');
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState(null);

    const sendTestEmail = async () => {
        if (!testEmail) {
            setResult({ success: false, message: 'Por favor ingresa un email' });
            return;
        }

        setIsSending(true);
        setResult(null);

        try {
            const response = await sendEmail({
                to: testEmail,
                subject: '✅ Test CRM Geobooker - Email Funcionando',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">🎉 ¡Sistema de Email Activo!</h1>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Este es un email de prueba enviado desde tu CRM Geobooker usando <strong>Resend</strong>.
              </p>

              <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">✅ Sistema Configurado</h3>
                <ul style="margin: 0; padding-left: 20px; color: #555;">
                  <li>Resend API: Activo</li>
                  <li>Netlify Function: Desplegada</li>
                  <li>Límite: 100 emails/día (Free)</li>
                  <li>Base de datos: 10,000 contactos listos</li>
                </ul>
              </div>

              <p style="color: #666; font-size: 14px;">
                <strong>Próximos pasos:</strong>
              </p>
              <ol style="color: #666; font-size: 14px;">
                <li>Integrar con UnifiedCRM.jsx</li>
                <li>Crear cola de envío automática</li>
                <li>Dashboard de métricas</li>
              </ol>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://geobooker.com.mx" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">
                  Visitar Geobooker
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; margin: 0;">
                Enviado el: ${new Date().toLocaleString('es-MX')}<br>
                Desde: Geobooker CRM Test<br>
                ID de prueba: ${Date.now()}
              </p>
            </div>
          </div>
        `,
                from: 'Geobooker Test <onboarding@resend.dev>'
            });

            setResult(response);
        } catch (error) {
            setResult({
                success: false,
                error: error.message || 'Error al enviar email'
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                    <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Test de Email</h3>
                    <p className="text-sm text-gray-600">Prueba el sistema Resend</p>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email de  prueba
                    </label>
                    <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="tu@email.com"
                    />
                </div>

                <button
                    onClick={sendTestEmail}
                    disabled={isSending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Enviar Email de Prueba
                        </>
                    )}
                </button>

                {result && (
                    <div className={`p-3 rounded-lg flex items-start gap-2 ${result.success
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                        {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'
                                }`}>
                                {result.success ? '✅ Email enviado exitosamente' : '❌ Error al enviar email'}
                            </p>
                            {result.messageId && (
                                <p className="text-xs text-green-700 mt-1">
                                    ID: {result.messageId}
                                </p>
                            )}
                            {result.error && (
                                <p className="text-xs text-red-700 mt-1">
                                    {result.error}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="text-xs text-gray-500 bg-white/50 p-2 rounded border border-gray-200">
                    <p className="font-medium mb-1">✨ Capacidad actual:</p>
                    <ul className="space-y-0.5 ml-3">
                        <li>• 100 emails/día (Resend Free)</li>
                        <li>• Template profesional HTML</li>
                        <li>• Tracking en dashboard</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default EmailTester;
