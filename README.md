# Ronsel PWA

**Ronsel** (en gallego, la *estela* que dejas al moverte) es una PWA instalable para correr/caminar con:

- Tracking GPS con `navigator.geolocation.watchPosition`.
- Botones para iniciar actividad, parar/reanudar segmentos y finalizar.
- Distancia, tiempo, ritmo medio, velocidad media, puntos GPS y segmentos.
- Parciales automáticos cada 1 km.
- Avisos por voz al completar cada km, si el navegador lo permite.
- Exportación GPX 1.1 con un `<trkseg>` por segmento activo.
- Importación de archivos GPX y visualización del recorrido sobre un mapa.
- Persistencia local con IndexedDB.
- Migración automática desde la versión anterior basada en `localStorage`.

## Puesta en marcha

```bash
npm install
npm run dev
```

Para compilar:

```bash
npm run build
npm run preview
```

## Probar en móvil

La geolocalización y el service worker necesitan contexto seguro. En escritorio, `localhost` vale para desarrollo; en un móvil conectado por IP local normalmente no. Para probar en un teléfono real, despliega a HTTPS o usa un túnel HTTPS durante desarrollo.

## Persistencia IndexedDB

La capa de persistencia está en `src/lib/storage.ts` y usa dos object stores:

- `meta`: guarda la actividad actual, preferencias como avisos por voz y flags internos de migración.
- `activities`: guarda actividades finalizadas por `id`, pensada para historial y consultas futuras.

La app carga IndexedDB al arrancar y deshabilita los botones principales hasta completar la carga inicial. Si existían datos de la primera versión en `localStorage`, se migran una sola vez a IndexedDB.

## Modelo de datos

La actividad contiene segmentos. Cada vez que paras el segmento se cierra el segmento actual. Al reanudar, se crea un segmento nuevo. En GPX esos segmentos se exportan como varios `<trkseg>`, evitando unir con una línea falsa dos partes separadas.

## Siguientes pasos recomendados

1. Añadir pantalla de historial usando `loadActivityHistory()`.
2. Añadir mapa con Leaflet o MapLibre.
3. Añadir importación GPX y detalle de actividad guardada.
4. Añadir configuración de deporte: caminar, correr, bici, etc.
5. Mejorar filtrado GPS con Kalman/smoothing si ves mucho jitter.
