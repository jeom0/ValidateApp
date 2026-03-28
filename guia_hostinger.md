# Guía de Solución: Error 405 en Hostinger

El error **405 (Method Not Allowed)** ocurre porque el servidor web de Hostinger (Apache) está interceptando la petición de inicio de sesión antes de que llegue a Node.js. Para solucionarlo, necesitamos indicarle a Hostinger que pase todas las peticiones a tu aplicación.

## 1. Crear archivo `.htaccess`
Crea un archivo llamado `.htaccess` en la carpeta raíz de tu proyecto en Hostinger (donde está el `package.json` del servidor) con el siguiente contenido:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . / [L]
```

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
