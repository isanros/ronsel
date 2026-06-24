import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ParsedRoute } from '../lib/gpxImport';

interface Props {
  routes: ParsedRoute[];
}

const ROUTE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#14b8a6'];

export function RouteMap({ routes }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [40.4168, -3.7038],
      zoom: 13,
      preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const allLatLngs: L.LatLngExpression[] = [];

    routes.forEach((route, index) => {
      const latlngs = route.points.map(
        (point) => [point.latitude, point.longitude] as L.LatLngExpression
      );
      if (latlngs.length === 0) return;

      const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
      L.polyline(latlngs, { color, weight: 4, opacity: 0.9 }).addTo(layer);

      const start = latlngs[0];
      const end = latlngs[latlngs.length - 1];

      L.circleMarker(start, {
        radius: 7,
        color: '#0b1020',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 1
      })
        .bindTooltip(`Inicio · ${route.name}`)
        .addTo(layer);

      L.circleMarker(end, {
        radius: 7,
        color: '#0b1020',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 1
      })
        .bindTooltip(`Fin · ${route.name}`)
        .addTo(layer);

      allLatLngs.push(...latlngs);
    });

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [24, 24] });
    }

    // El contenedor puede haberse renderizado oculto; recalculamos el tamaño.
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [routes]);

  return <div ref={containerRef} className="route-map" role="img" aria-label="Mapa del recorrido GPX" />;
}
