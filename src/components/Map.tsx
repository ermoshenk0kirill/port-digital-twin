'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import jsPDF from 'jspdf';
import { loadRussianFont } from '../lib/pdfFonts';

interface MapProps {
  data: any | null;
  activeLayers: any;
}

const parseNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const str = String(value).trim().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const parseCoordinates = (coordString: string | number): [number, number] | null => {
  if (!coordString) return null;
  const str = String(coordString).trim();
  const parts = str.split(',').map(p => p.trim());
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
  }
  return null;
};

// Полигон склада / причала
const createWarehousePolygon = (center: [number, number], width = 90, length = 130, rotation = 0) => {
  const [lat, lng] = center;
  const rad = (rotation * Math.PI) / 180;
  const hw = width / 2;
  const hl = length / 2;
  const corners = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
  const rotated = corners.map(([x, y]) => {
    const rx = x * Math.cos(rad) - y * Math.sin(rad);
    const ry = x * Math.sin(rad) + y * Math.cos(rad);
    return [lng + rx / (111000 * Math.cos(lat * Math.PI / 180)), lat + ry / 111000];
  });
  rotated.push(rotated[0]);
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [rotated] } };
};

// Стрелка для судов
const createVesselArrowPolygon = (center: [number, number], length = 120, width = 40, rotation = 0) => {
  const [lat, lng] = center;
  const rad = (rotation * Math.PI) / 180;
  const hl = length / 2;
  const hw = width / 2;
  const head = length * 0.35;
  const points = [[-hl, -hw], [hl - head, -hw], [hl, 0], [hl - head, hw], [-hl, hw]];
  const rotated = points.map(([x, y]) => {
    const rx = x * Math.cos(rad) - y * Math.sin(rad);
    const ry = x * Math.sin(rad) + y * Math.cos(rad);
    return [lng + rx / (111000 * Math.cos(lat * Math.PI / 180)), lat + ry / 111000];
  });
  rotated.push(rotated[0]);
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [rotated] } };
};

export default function Map({ data, activeLayers }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const equipmentMarkersRef = useRef<maplibregl.Marker[]>([]);
  const personnelMarkersRef = useRef<maplibregl.Marker[]>([]);

  const warehouseLayerId = 'warehouses-layer';
  const vesselsLayerId = 'vessels-layer';
  const quaysLayerId = 'quays-layer';

  // Стили попапов
  useEffect(() => {
    if (!document.getElementById('custom-popup-styles')) {
      const style = document.createElement('style');
      style.id = 'custom-popup-styles';
      style.innerHTML = `
        .maplibregl-popup-content {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-popup {
          background: white;
          color: black !important;
          padding: 18px 22px;
          border-radius: 12px;
          min-width: 280px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          position: relative;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .popup-close-btn {
          position: absolute;
          top: 6px;
          right: 10px;
          background: none;
          border: none;
          font-size: 22px;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #1f2937;
          font-weight: bold;
          line-height: 1;
          padding: 0;
          z-index: 30;
        }
        .popup-close-btn:hover {
          color: #ef4444;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Экспорт в PDF (с поддержкой русского языка)
  const exportToPDF = async () => {
    if (!data) {
      alert("Нет данных для экспорта");
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');

    await loadRussianFont(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Заголовок
    doc.setFont("DejaVuSans");    doc.setFontSize(16);
    doc.text("СОСТОЯНИЕ ЗАГРУЖЕННОСТИ БОЛЬШОГО ПОРТА САНКТ-ПЕТЕРБУРГ", pageWidth / 2, y, { align: "center" });
    y += 12;

    doc.setFontSize(11);
    doc.text(`Дата и время формирования: ${new Date().toLocaleString('ru-RU')}`, pageWidth / 2, y, { align: "center" });
    y += 18;

    const warehouses = data.warehouses || [];
    const vessels = data.vessels || [];
    const equipment = data.equipment || [];
    const personnel = data.personnel || [];
    const quays = data.quays || [];

    const totalCurrent = warehouses.reduce((sum: number, w: any) => sum + parseNumber(w.current_containers), 0);
    const totalMax = warehouses.reduce((sum: number, w: any) => sum + parseNumber(w.max_capacity), 0);
    const totalPersonnel = personnel.reduce((sum: number, p: any) => sum + parseNumber(p.count), 0);

    doc.setFontSize(14);
    doc.text("Общая статистика терминала", 20, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(`Количество складов: ${warehouses.length}`, 25, y); y += 8;
    doc.text(`Судов в порту: ${vessels.length}`, 25, y); y += 8;
    doc.text(`Причалов: ${quays.length}`, 25, y); y += 8;
    doc.text(`Единиц техники: ${equipment.length}`, 25, y); y += 8;
    doc.text(`Персонала на смене: ${totalPersonnel} человек`, 25, y); y += 10;

    doc.text(`Контейнеров сейчас: ${totalCurrent.toLocaleString('ru-RU')}`, 25, y); y += 8;
    doc.text(`Общая вместимость: ${totalMax.toLocaleString('ru-RU')}`, 25, y); y += 8;
    doc.text(`Общая загруженность: ${totalMax ? Math.round((totalCurrent / totalMax) * 100) : 0}%`, 25, y);
    y += 15;

    // Детальная загруженность складов
    if (warehouses.length > 0) {
      doc.setFontSize(14);
      doc.text("Загруженность складов", 20, y);
      y += 10;

      warehouses.forEach((wh: any) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const current = parseNumber(wh.current_containers);
        const max = parseNumber(wh.max_capacity);
        const percent = max ? Math.round((current / max) * 100) : 0;

        doc.setFontSize(11);
        doc.text(wh.name || 'Склад', 25, y);
        doc.text(`${current} / ${max} (${percent}%)`, 140, y);
        y += 9;
      });
    }

    doc.setFontSize(10);
    doc.text("Отчёт сформирован автоматически системой цифрового двойника порта", pageWidth / 2, 290, { align: "center" });

    doc.save(`Порт_СПб_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [30.232, 59.891],
      zoom: 15.5,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    return () => map.current?.remove();
  }, []);

  useEffect(() => {
    if (!map.current || !data) return;

    equipmentMarkersRef.current.forEach(m => m.remove());
    personnelMarkersRef.current.forEach(m => m.remove());
    equipmentMarkersRef.current = [];
    personnelMarkersRef.current = [];

    [warehouseLayerId, vesselsLayerId, quaysLayerId].forEach(id => {
      if (map.current!.getSource(id)) {
        map.current!.removeLayer(id);
        map.current!.removeLayer(`${id}-border`);
        map.current!.removeSource(id);
      }
    });

    const setupPopup = (popup: maplibregl.Popup) => {
      setTimeout(() => {
        const closeBtn = popup.getElement()?.querySelector('.popup-close-btn');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.remove();
          });
        }
      }, 10);
    };

    // ==================== СКЛАДЫ ====================
    if (activeLayers.warehouses && data.warehouses) {
      const features = data.warehouses.map((wh: any) => {
        const coords = parseCoordinates(wh.coordinates);
        if (!coords) return null;
        const type = (wh.type || wh.warehouse_type || 'open').toLowerCase();
        const color = type === 'closed' || type === 'крытый' ? '#eab308' : '#22c55e';
        const width = parseNumber(wh.width_meters) || 90;
        const length = parseNumber(wh.length_meters) || 130;
        const rotation = parseNumber(wh.rotation_degrees) || 0;

        return {
          ...createWarehousePolygon(coords, width, length, rotation),
          properties: { name: wh.name, current: parseNumber(wh.current_containers), max: parseNumber(wh.max_capacity), type, color }
        };
      }).filter(Boolean);

      if (features.length > 0) {
        map.current.addSource(warehouseLayerId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.current.addLayer({ id: warehouseLayerId, type: 'fill', source: warehouseLayerId, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.68 } });
        map.current.addLayer({ id: `${warehouseLayerId}-border`, type: 'line', source: warehouseLayerId, paint: { 'line-color': '#166534', 'line-width': 3.5 } });

        map.current.on('click', warehouseLayerId, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const occupancy = props.max ? Math.round((props.current / props.max) * 100) : 0;
          const popup = new maplibregl.Popup({ offset: 12, closeButton: false, closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="custom-popup">
                <button class="popup-close-btn">×</button>
                <strong style="font-size:17px; display:block; margin-bottom:12px;">${props.name}</strong>
                Контейнеров: <strong>${props.current.toLocaleString('ru-RU')}</strong><br>
                Вместимость: <strong>${props.max.toLocaleString('ru-RU')}</strong><br>
                Загруженность: <strong>${occupancy}%</strong>
              </div>
            `)
            .addTo(map.current!);
          setupPopup(popup);
        });
      }
    }

    // ==================== СУДА ====================
    if (activeLayers.vessels && data.vessels) {
      const features = data.vessels.map((v: any) => {
        const coords = parseCoordinates(v.coordinates);
        if (!coords) return null;
        const length = parseNumber(v.length_meters) || 120;
        const width = parseNumber(v.width_meters) || 40;
        const rotation = parseNumber(v.rotation_degrees) || 0;

        return {
          ...createVesselArrowPolygon(coords, length, width, rotation),
          properties: { name: v.name, status: v.status, load: parseNumber(v.load) }
        };
      }).filter(Boolean);

      if (features.length > 0) {
        map.current.addSource(vesselsLayerId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.current.addLayer({ id: vesselsLayerId, type: 'fill', source: vesselsLayerId, paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.75 } });
        map.current.addLayer({ id: `${vesselsLayerId}-border`, type: 'line', source: vesselsLayerId, paint: { 'line-color': '#1e40af', 'line-width': 3 } });

        map.current.on('click', vesselsLayerId, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const popup = new maplibregl.Popup({ offset: 12, closeButton: false, closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="custom-popup">
                <button class="popup-close-btn">×</button>
                <strong style="font-size:17px; display:block; margin-bottom:12px;">${props.name}</strong>
                Загруженность: <strong>${props.load}</strong><br>
                Статус: <strong>${props.status || '—'}</strong>
              </div>
            `)
            .addTo(map.current!);
          setupPopup(popup);
        });
      }
    }

    // ==================== ПРИЧАЛЫ ====================
    if (activeLayers.quays && data.quays) {
      const features = data.quays.map((q: any) => {
        const coords = parseCoordinates(q.coordinates);
        if (!coords) return null;
        const occupied = q.status === 'занят' || q.occupied;
        const color = occupied ? '#ef4444' : '#3b82f6';
        const width = parseNumber(q.width_meters) || 50;
        const length = parseNumber(q.length_meters) || 200;
        const rotation = parseNumber(q.rotation_degrees) || 0;

        return {
          ...createWarehousePolygon(coords, width, length, rotation),
          properties: { name: q.name, status: q.status, color }
        };
      }).filter(Boolean);

      if (features.length > 0) {
        map.current.addSource(quaysLayerId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.current.addLayer({ id: quaysLayerId, type: 'fill', source: quaysLayerId, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.65 } });
        map.current.addLayer({ id: `${quaysLayerId}-border`, type: 'line', source: quaysLayerId, paint: { 'line-color': '#1e3a8a', 'line-width': 3 } });

        map.current.on('click', quaysLayerId, (e) => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const popup = new maplibregl.Popup({ offset: 12, closeButton: false, closeOnClick: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div class="custom-popup">
                <button class="popup-close-btn">×</button>
                <strong style="font-size:17px; display:block; margin-bottom:12px;">${props.name}</strong>
                Статус: <strong>${props.status || '—'}</strong>
              </div>
            `)
            .addTo(map.current!);
          setupPopup(popup);
        });
      }
    }

    // ==================== ТЕХНИКА ====================
    if (activeLayers.equipment && data.equipment) {
      data.equipment.forEach((item: any) => {
        const coords = parseCoordinates(item.coordinates);
        if (!coords) return;

        const type = (item.type || item.equipment_type || 'port').toLowerCase();
        let color = '#8b5cf6';
        if (type === 'client') color = '#f59e0b';
        if (type === 'static' || type === 'crane') color = '#64748b';

        const el = document.createElement('div');
        el.style.cssText = `background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer;`;
        el.innerHTML = '🚜';

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
          .setHTML(`<div class="custom-popup"><button class="popup-close-btn">×</button><strong>${item.name}</strong><br>${item.status || ''}</div>`);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([coords[1], coords[0]])
          .setPopup(popup)
          .addTo(map.current!);

        setupPopup(popup);
        equipmentMarkersRef.current.push(marker);
      });
    }

    // ==================== ПЕРСОНАЛ ====================
    if (activeLayers.personnel && data.personnel) {
      data.personnel.forEach((item: any) => {
        const coords = parseCoordinates(item.coordinates);
        if (!coords) return;

        const el = document.createElement('div');
        el.style.cssText = `background-color: #eab308; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer;`;
        el.innerHTML = '👷';

        const popup = new maplibregl.Popup({ offset: 25, closeButton: false, closeOnClick: true })
          .setHTML(`<div class="custom-popup"><button class="popup-close-btn">×</button><strong>${item.name}</strong><br>Человек: ${parseNumber(item.count)}<br>Задача: ${item.task || '—'}</div>`);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([coords[1], coords[0]])
          .setPopup(popup)
          .addTo(map.current!);

        setupPopup(popup);
        personnelMarkersRef.current.push(marker);
      });
    }

  }, [data, activeLayers]);

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" style={{ minHeight: '100%' }} />

      {/* Кнопка экспорта PDF */}
      <button
        onClick={exportToPDF}
        className="absolute top-4 left-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl z-30 flex items-center gap-2 shadow-lg font-medium"
      >
        📄 Экспорт PDF отчёта
      </button>
    </>
  );
}