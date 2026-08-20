// src/components/admin/EmailTester.jsx
// Prueba controlada de envío con Resend usando el layout profesional del CRM.

import React, { useMemo, useState } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Power } from 'lucide-react';
import { sendEmail } from '../../services/mailService';

const DEFAULT_RECIPIENTS = 'jpvanesss85@gmail.com\ngeobookerr@gmail.com';

const splitRecipients = (value = '') => (
    value
        .split(/[\n,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
);

const isLikelyEmail = (value = '') => /^\S+@\S+\.\S+$/.test(value);

const buildTestHtml = () => `
  <h2 style="margin:0 0 16px;color:#0f172a;">Prueba CRM Geobooker completada</h2>
  <p>
    Este es un correo de prueba enviado desde el CRM de <strong>Geobooker</strong>
    usando el dominio verificado <strong>hola@geobooker.com.mx</strong>.
  </p>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;margin:20px 0;">
    <p style="margin:0 0 8px;font-weight:700;color:#1d4ed8;">Validaciones de esta prueba</p>
    <ul style="margin:0;padding-left:18px;color:#334155;line-height:1.7;">
      <li>Resend conectado al dominio verificado geobooker.com.mx.</li>
      <li>Remitente oficial: Geobooker Ads &lt;hola@geobooker.com.mx&gt;.</li>
      <li>Footer profesional con enlaces y QR de descarga Android/iPhone.</li>
      <li>Webhook preparado para registrar entregas, aperturas, clics, rebotes y quejas.</li>
    </ul>
  </div>
  <p>
    Si este correo llega correctamente, el siguiente paso es revisar eventos en Resend
    y en Supabase para confirmar trazabilidad real.
  </p>
  <p style="margin-top:24px;color:#475569;">
    Atentamente,<br />
    <strong>Equipo Geobooker Ads</strong>
  </p>
`;

export default function EmailTester() {
    const [testerEnabled, setTesterEnabled] = useState(false);
    const [recipientsInput, setRecipientsInput] = useState(DEFAULT_RECIPIENTS);
    const [isSending, setIsSending] = useState(false);
    const [results, setResults] = useState([]);

    const recipients = useMemo(() => [...new Set(splitRecipients(recipientsInput))], [recipientsInput]);
    const invalidRecipients = recipients.filter((email) => !isLikelyEmail(email));
    const suspiciousRecipients = recipients.filter((email) => email.endsWith('@gmail.com.mx'));
    const canSend = testerEnabled && recipients.length > 0 && invalidRecipients.length === 0 && !isSending;

    const handleTesterToggle = () => {
        setTesterEnabled((previous) => {
            const next = !previous;
            if (!next) {
                setResults([]);
                setIsSending(false);
            }
            return next;
        });
    };

    const sendTestEmail = async () => {
        if (!testerEnabled) {
            setResults([{
                success: false,
                email: '',
                error: 'Activa primero el tester profesional.'
            }]);
            return;
        }

        if (!canSend) {
            setResults([{
                success: false,
                email: '',
                error: invalidRecipients.length
                    ? `Corrige estos correos: ${invalidRecipients.join(', ')}`
                    : 'Agrega al menos un destinatario.'
            }]);
            return;
        }

        setIsSending(true);
        setResults([]);

        const nextResults = [];
        for (const email of recipients) {
            const response = await sendEmail({
                to: email,
                subject: 'Prueba CRM Geobooker - Resend verificado',
                html: buildTestHtml()
            });

            nextResults.push({
                email,
                success: response.success,
                emailId: response.emailId,
                error: response.error
            });
            setResults([...nextResults]);
        }

        setIsSending(false);
    };

    return (
        <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-600 p-2">
                        <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Test profesional de email</h3>
                        <p className="text-sm text-gray-600">
                            Envía una prueba con Resend, footer Geobooker y QR de descarga.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleTesterToggle}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        testerEnabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                    <Power className="h-4 w-4" />
                    {testerEnabled ? 'Desactivar tester profesional' : 'Activar tester profesional'}
                </button>
            </div>

            {!testerEnabled ? (
                <div className="rounded-xl border border-blue-200 bg-white/70 p-4 text-sm text-blue-900">
                    El tester está apagado por seguridad. Actívalo solo cuando quieras enviar una prueba real;
                    después puedes desactivarlo y el CRM seguirá funcionando sin dejar el botón de envío expuesto.
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Correos de prueba
                        </label>
                        <textarea
                            value={recipientsInput}
                            onChange={(event) => setRecipientsInput(event.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            placeholder="correo1@dominio.com, correo2@dominio.com"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Puedes separar correos por coma, punto y coma o salto de línea. Se envían uno por uno.
                        </p>
                    </div>

                    {suspiciousRecipients.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            Revisa estos correos: <strong>{suspiciousRecipients.join(', ')}</strong>. Gmail normalmente usa <strong>@gmail.com</strong>, no <strong>@gmail.com.mx</strong>.
                        </div>
                    )}

                    {invalidRecipients.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                            Formato inválido: {invalidRecipients.join(', ')}
                        </div>
                    )}

                    <button
                        onClick={sendTestEmail}
                        disabled={!canSend}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando prueba...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Enviar prueba profesional
                            </>
                        )}
                    </button>

                    {results.length > 0 && (
                        <div className="space-y-2">
                            {results.map((result) => (
                                <div
                                    key={result.email || result.error}
                                    className={`flex items-start gap-2 rounded-lg border p-3 ${result.success
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-red-200 bg-red-50'
                                        }`}
                                >
                                    {result.success ? (
                                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                                    ) : (
                                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                                            {result.success ? `Enviado a ${result.email}` : `Error ${result.email ? `en ${result.email}` : ''}`}
                                        </p>
                                        {result.emailId && (
                                            <p className="mt-1 text-xs text-green-700">ID Resend: {result.emailId}</p>
                                        )}
                                        {result.error && (
                                            <p className="mt-1 text-xs text-red-700">{result.error}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="rounded border border-gray-200 bg-white/60 p-3 text-xs text-gray-600">
                        <p className="mb-1 font-medium">Configuración esperada:</p>
                        <ul className="ml-3 space-y-0.5">
                            <li>• Remitente: hola@geobooker.com.mx</li>
                            <li>• Límite CRM actual: 100 emails/día</li>
                            <li>• Footer: botones + QR Android/iPhone</li>
                            <li>• Tracking: Resend webhook → Supabase</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
