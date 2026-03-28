# Plan de Organización y Despliegue en GitHub (Producción)

He preparado este plan para que no tengas que preocuparte por nada más. Voy a organizar el código, generar la versión de producción y subir todo a GitHub de manera que esté listo para Hostinger.

## Cambios Propuestos

### 1. Construcción de Producción (dist)
- Entraré en `client/` y ejecutaré `npm run build`. 
- Esto generará la carpeta `dist/` con el código optimizado.
- **IMPORTANTE:** Subiré esta carpeta a GitHub (aunque normalmente se ignore) para que puedas descargarla directamente a Hostinger.

### 2. Configuración Final del Servidor
- Me aseguraré de que `server.js` apunte correctamente a la carpeta `dist`.
- Incluiré el archivo `.htaccess` en el repositorio para que no lo pierdas.

### 3. Sincronización con GitHub
- Realizaré un `git add .`, `git commit` y `git push` para que todos los cambios (incluido el login nuevo y el autocomplete) estén en tu cuenta de GitHub.

## User Review Required

> [!WARNING]
> Dado que Hostinger a veces usa carpetas diferentes, subiré la carpeta `dist` al repositorio. Esto facilitará que solo tengas que "bajar y usar".

## Pasos de Ejecución
1. Ejecutar `npm run build` en la carpeta `client`.
2. Crear archivo `.htaccess` en la carpeta raíz para respaldo.
3. Subir todos los archivos a GitHub (incluyendo la base de datos `data.db` y la carpeta `dist`).

¿Estás de acuerdo con que suba todo el proyecto (incluido el código compilado) a GitHub para que sea más fácil?
