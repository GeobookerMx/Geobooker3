# 🧾 Guía: Obtener Certificados SAT (CSD) para Facturación

## Tu situación: RESICO Persona Física ✅

Perfecto, como **Persona Física con Actividad Empresarial bajo RESICO**, puedes emitir facturas electrónicas (CFDI).

---

## 📋 Lo que necesitas pedirle a tu Contadora:

### Email/WhatsApp para tu Contadora:

```
Hola [Nombre],

Necesito los siguientes archivos para poder emitir facturas 
electrónicas desde mi plataforma web (Geobooker):

1. Archivo .cer (Certificado del CSD)
2. Archivo .key (Llave privada del CSD)
3. Contraseña de la llave privada

Nota: Necesito el CSD (Certificado de Sello Digital), 
NO la e.firma (FIEL). Son diferentes.

Si no tengo CSD, necesito que me ayudes a generarlo 
desde el portal del SAT.

Gracias!
```

---

## ¿Qué es CSD vs e.firma?

| Concepto | Uso | Archivos |
|----------|-----|----------|
| **e.firma (FIEL)** | Trámites SAT, declaraciones | .cer, .key |
| **CSD (Sello Digital)** | Firmar facturas | .cer, .key (diferentes) |

**Importante:** Necesitas el **CSD**, no la e.firma.

---

## Si NO tienes CSD, cómo obtenerlo:

### Paso 1: Entrar al Portal del SAT

1. Ve a [sat.gob.mx](https://www.sat.gob.mx)
2. Click en **"Trámites del RFC"**
3. Selecciona **"Genera tu Certificado de Sello Digital"**

### Paso 2: Iniciar sesión con e.firma

- Necesitas tu e.firma (FIEL) activa
- Ingresa tu .cer, .key y contraseña de e.firma

### Paso 3: Generar el CSD

1. El sistema genera automáticamente los archivos
2. **Guarda los 3 archivos en lugar seguro:**
   - `tu_rfc.cer` (Certificado)
   - `tu_rfc.key` (Llave privada)  
   - Anota la contraseña

### Paso 4: Verificar vigencia

- El CSD tiene vigencia de 4 años
- Puedes verificarlo en el portal SAT

---

## 🔒 Seguridad de tus Archivos

### ⚠️ NUNCA:
- ❌ Envíes estos archivos por email sin cifrar
- ❌ Los subas a repositorios públicos (GitHub)
- ❌ Los compartas con terceros no autorizados

### ✅ SÍ:
- ✅ Guárdalos en carpeta segura con contraseña
- ✅ Haz respaldo en USB o nube privada
- ✅ Compártelos solo con plataformas de confianza (Facturapi)

---

## 📤 Una vez que tengas los archivos:

1. Crea cuenta en [Facturapi.io](https://facturapi.io)
2. Ve a **Configuración** → **Certificados**
3. Sube:
   - Archivo .cer
   - Archivo .key
   - Contraseña
4. ¡Listo para emitir CFDIs!

---

## ⏱️ Tiempo estimado:

| Si tienes... | Tiempo |
|--------------|--------|
| CSD ya generado | 10 minutos |
| Solo e.firma | 30 minutos (generar CSD) |
| Nada | 1-2 semanas (cita SAT para e.firma) |
