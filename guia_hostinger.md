# Guía de Solución: Error al conectar con el servidor en Hostinger

El error **"Error al conectar con el servidor. Verifica que el backend esté corriendo."** ocurre porque el servidor web de Hostinger (Apache/LiteSpeed) está interceptando la petición `/api/login` y devolviendo el archivo `index.html` en lugar de enviar la petición a tu aplicación Node.js.

## 1. Eliminar reglas en `.htaccess` (Solución)
Si anteriormente creaste un archivo `.htaccess` con reglas de redirección `RewriteRule` o "RewriteEngine On", **debes eliminarlas**. 

Tu servidor Node.js (`server/server.js`) ya está programado para servir el frontend (`app.use(express.static(...))`) y no necesitas reglas externas de Apache.

Entra al administrador de Archivos de Hostinger, busca el archivo `.htaccess` en tu carpeta raíz y déjalo con su configuración original por defecto, o simplemente borra las líneas de `RewriteRule`.

## 2. Verificar Configuración en Hostinger
En el tablero de Hostinger -> **Node.js**:
1. Asegúrate de que el **"Application Startup File"** apunte a `server/server.js`.
2. Asegúrate de que el **"Application URL"** sea la raíz de tu dominio (ej: `tu-dominio.com`).

## 3. Re-construir el Frontend (MUY IMPORTANTE)
Es posible que tu carpeta `dist` actual tenga guardada la dirección antigua (`localhost:3001`). Debes volver a generarla:
1. En tu computadora (esta terminal), ve a la carpeta `client`.
2. Ejecuta: `npm run build`
3. Sibe la **nueva** carpeta `dist` a Hostinger nuevamente.

## 4. Credenciales de Acceso
Recuerda que los datos de acceso son:
- **Usuario:** `admin1@admin.com`
- **Contraseña:** `admin@qwerty`

---

### Cambios realizados en el código:
He modificado [Login.tsx](file:///c:/Users/juan/Desktop/querty/client/src/pages/Login.tsx) para que, si el error continúa, el mensaje en pantalla te diga el código de error exacto (ej. "Error 405" o "Error 500"). Esto nos ayudará a diagnosticar si Hostinger sigue bloqueando la petición.
