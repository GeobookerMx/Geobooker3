# APPLE SECRET ROTATION — Geobooker

Fecha de rotación requerida: **antes del 2027-02-01** (expiración actual del JWT)
Razón: Los archivos `apple-client-secret.txt`, `apple-jwt-secret.txt` y
`apple-secret-output.txt` fueron trackeados en Git en el commit `b37b247`
(diciembre 2025). Ahora ya están fuera del índice (commit `499b0dc`), pero
permanecen en el historial. Rotar las credenciales antes de publicar en App
Store Connect es la acción correcta.

## Datos del JWT actual (NO sensibles — solo identificadores)

- `kid`: `26SZL2T9H2` (Key ID visible en Apple Developer)
- `iss` (Team ID): `QCN4SYVAQ4`
- `sub` (App/Service ID): `mx.com.geobooker.auth`
- Expiración: `2027-01-17` (campo `exp` en payload)

## Pasos para rotar en Apple Developer Console

1. Ve a https://developer.apple.com
2. Inicia sesión con la cuenta del Team ID `QCN4SYVAQ4`
3. Ve a **Certificates, Identifiers & Profiles** → **Keys**
4. Revoca la llave con Key ID `26SZL2T9H2` (buscarla por nombre o ID)
5. Crea una nueva llave con los mismos permisos (Sign in with Apple)
6. Descarga el archivo `.p8` — **solo se puede descargar una vez**
7. Genera un nuevo Client Secret JWT con `node generate-apple-jwt.js`
8. Actualiza las variables en Supabase Auth dashboard:
   - Setting: **Apple OAuth** → actualizar `Client Secret`
9. Elimina los archivos locales `apple-*.txt` del directorio del proyecto
10. Verifica que `.gitignore` los siga cubriendo ✅ (ya verificado)

## Verificación post-rotación

- Login con Apple en la app (iOS y web) funciona
- Callback `/auth/callback` completa correctamente
- Ningún archivo `apple-*.txt` nuevo llega al repositorio

## Nota sobre el historial de Git

Los archivos siguen en el historial del commit `b37b247`. Si el repositorio
es **privado**, el riesgo es bajo mientras el JWT expire en 2027 y se rote
antes de esa fecha. Si en algún momento el repo se hace público o se
sospecha acceso no autorizado, se debe limpiar el historial con:

```bash
# SOLO si el repo se hace público o hay sospecha de acceso:
git filter-repo --path apple-client-secret.txt --invert-paths
git filter-repo --path apple-jwt-secret.txt --invert-paths
git filter-repo --path apple-secret-output.txt --invert-paths
# Después force-push y notificar a todos los colaboradores
```

**Esto requiere `git-filter-repo` instalado y coordinación del equipo.**
No ejecutar sin respaldo previo.
