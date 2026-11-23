'use client';

import { useState } from 'react';
import FileUpload from '../src/components/FileUploads';
import Map from '../src/components/Map';
import Dashboard from '../src/components/Dashboard';
import LayerControls from '../src/components/LayerControls';

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [activeLayers, setActiveLayers] = useState({
    infrastructure: true,
    warehouses: true,
    equipment: true,
    vessels: true,
    personnel: false,
    quays: true,
  });

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-blue-900 border-b-4 border-blue-500 p-4 flex items-center justify-between shadow-xl">
  <h1 className="text-2xl font-bold text-white">
    Цифровой двойник
  </h1>
  <FileUpload onDataLoaded={setData} />
</header>

      <div className="flex flex-1 overflow-hidden">
        {/* Карта */}
        <div className="flex-1 relative border-r-2 border-slate-300">
          <Map data={data} activeLayers={activeLayers} />
          <LayerControls activeLayers={activeLayers} setActiveLayers={setActiveLayers} />
        </div>

        {/* Боковая панель статистики */}
        <div className="w-96 bg-white border-l-4 border-slate-700 shadow-lg overflow-auto">
          <Dashboard data={data} />
        </div>
      </div>
    </div>
  );
}