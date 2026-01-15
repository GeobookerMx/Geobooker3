// Test de envío de email con Resend
// Ejecutar: node test-email.js

const testEmail = async () => {
    try {
        console.log('🚀 Enviando email de prueba...\n');

        const response = await fetch('https://geobooker.com.mx/.netlify/functions/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: 'ventasgeobooker@gmail.com', // Cambiar a tu email de prueba
                subject: '✅ Test CRM Geobooker - Resend Funcionando',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">🎉 ¡Email de Prueba Exitoso!</h1>
            <p>Este email fue enviado desde tu CRM Geobooker usando <strong>Resend</strong>.</p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #667eea;">✅ Sistema Configurado</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Resend API: Activo</li>
                <li>Netlify Function: Desplegada</li>
                <li>Límite: 100 emails/día (Free)</li>
                <li>Base de datos: 10,000 contactos listos</li>
              </ul>
            </div>

            <p><strong>Próximos pasos:</strong></p>
            <ol>
              <li>Integrar con UnifiedCRM.jsx</li>
              <li>Crear cola de envío automática</li>
              <li>Dashboard de métricas</li>
            </ol>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #888; font-size: 12px;">
              Enviado el: ${new Date().toLocaleString('es-MX')}<br>
              Desde: Geobooker CRM Test
            </p>
          </div>
        `,
                from: 'Geobooker Test <onboarding@resend.dev>'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ EMAIL ENVIADO EXITOSAMENTE!\n');
            console.log('📧 Detalles:');
            console.log(`   To: ventasgeobooker@gmail.com`);
            console.log(`   Message ID: ${data.messageId}`);
            console.log(`   Status: ${data.message}\n`);
            console.log('🔍 Revisa tu inbox: ventasgeobooker@gmail.com');
            console.log('📊 Monitoreo en: https://resend.com/emails\n');
        } else {
            console.error('❌ ERROR al enviar email:');
            console.error(`   ${data.error}\n`);
        }

    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
};

// Ejecutar test
testEmail();
