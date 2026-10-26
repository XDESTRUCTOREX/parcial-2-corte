# Pruebas de carga con Apache JMeter

## Alcance

El plan `jmeter/inventario-load-test.jmx` ejecuta pruebas sobre `GET /health` y `GET /api/v1/products`. Usa 10 usuarios concurrentes, ramp-up de 30 segundos y una ventana de 120 segundos. Cada petición tiene timeout de conexión de 3 s y timeout de respuesta de 5 s.

## Requisitos

- API desplegada y accesible desde el equipo que ejecuta JMeter.
- MongoDB configurado y disponible para el endpoint de productos.
- Apache JMeter 5.6.3 o compatible.
- Ejecutar inicialmente en ambiente de pruebas/staging, no contra producción sin autorización.

## Ejecución

Desde la raíz del repositorio:

```bash
jmeter -n -t jmeter/inventario-load-test.jmx -JBASE_HOST=127.0.0.1 -JBASE_PORT=3000 -JPROTOCOL=http -l results/inventario-load.jtl -e -o results/html
```

Crea previamente el directorio `results`. Para otro entorno, reemplaza host, puerto y protocolo. No introduzcas credenciales en el JMX ni en los argumentos que se publiquen en logs.

## Umbrales iniciales propuestos

Son objetivos de aceptación iniciales y deben confirmarse con el responsable del servicio:

- Errores HTTP o assertions fallidas: menor al 1%.
- Latencia p95: menor o igual a 500 ms.
- Latencia p99: menor o igual a 1.000 ms.
- Throughput: registrar el valor observado; establecer el mínimo esperado tras conocer la carga real de negocio.

## Informe de ejecución

**Estado actual:** plan diseñado; no se ejecutó en este entorno porque no hay un servidor accesible ni configuración de MongoDB de runtime disponible. No hay métricas observadas que se puedan reportar todavía.

Completar esta tabla después de ejecutar el plan:

| Métrica | Resultado medido | Umbral | Estado |
|---|---:|---:|---|
| Muestras totales | Pendiente | Informativo | Pendiente |
| Throughput (req/s) | Pendiente | Definir según demanda | Pendiente |
| Latencia media | Pendiente | Informativo | Pendiente |
| Latencia p95 | Pendiente | ≤ 500 ms | Pendiente |
| Latencia p99 | Pendiente | ≤ 1.000 ms | Pendiente |
| Porcentaje de errores | Pendiente | < 1% | Pendiente |

## Hallazgos y recomendaciones

Registrar fecha/hora, commit probado, entorno, configuración de carga, resultado JMeter, cuellos de botella y recomendaciones. No declarar la tarea finalizada hasta adjuntar resultados medidos y explicar cualquier incumplimiento.