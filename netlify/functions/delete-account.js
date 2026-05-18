// netlify/functions/delete-account.js
// ✅ Apple Guideline 5.1.1(v): Eliminación REAL de cuenta
// Esta función usa service_role para eliminar al usuario de Supabase Auth.
// NUNCA exponer service_role en el frontend.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  // Solo POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Leer Authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No authorization token provided' }) };
  }
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    // 1. Verificar que el token es válido usando el cliente anon
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired token' }) };
    }

    const userId = user.id;
    const userEmail = user.email;

    // 2. Cliente admin con service_role para operaciones privilegiadas
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Marcar negocios del usuario como eliminados
    await supabaseAdmin
      .from('businesses')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('owner_id', userId);

    // 4. Anonimizar perfil de usuario
    await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: '[Cuenta Eliminada]',
        first_name: null,
        last_name: null,
        phone: null,
        avatar_url: null,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // 5. Registrar solicitud de eliminación como procesada
    await supabaseAdmin
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        email: userEmail,
        reason: 'user_initiated_in_app',
        status: 'processed',
        requested_at: new Date().toISOString(),
        processed_at: new Date().toISOString()
      });

    // 6. Eliminar al usuario de Supabase Auth (acción irreversible)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error eliminando usuario de Auth:', deleteError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error al eliminar cuenta: ' + deleteError.message })
      };
    }

    console.log(`✅ Usuario ${userId} eliminado correctamente de Supabase Auth`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Cuenta eliminada correctamente' })
    };

  } catch (error) {
    console.error('Error en delete-account:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor: ' + error.message })
    };
  }
};
