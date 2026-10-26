# Configuración de entornos

La aplicación carga el archivo `.env.<NODE_ENV>` desde `src/app.js`. Los archivos locales `.env.development`, `.env.test` y `.env.production` están excluidos de Git por `.gitignore`. Copia `.env.example` como punto de partida para el entorno correspondiente y sustituye los valores locales.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | Sí | Selecciona el archivo de entorno: `development`, `test` o `production`. |
| `PORT` | No | Puerto HTTP; por defecto 3000. |
| `MONGODB_URI` | Sí | URI de MongoDB. Debe mantenerse privada cuando contenga credenciales. |
| `MONGODB_DB_NAME` | No | Base de datos destino; por defecto `inventario`. |

## Reglas de seguridad

- No versionar archivos `.env.*` con valores reales.
- No pegar URIs con usuario/contraseña en issues, PRs o logs.
- En CI/CD, almacenar valores sensibles en GitHub Actions Secrets y mapearlos solo a los pasos que los necesiten.
- El ejemplo usa una URI local sin credenciales; reemplázala según el entorno.

## Validación

Comprueba que la aplicación cargue el archivo correcto según `NODE_ENV`, que el nombre de base de datos resuelva a `inventario` y que una conexión fallida se registre y termine el proceso de arranque. La conexión real debe probarse con una URI configurada localmente; no se incluye ninguna credencial en el repositorio.
