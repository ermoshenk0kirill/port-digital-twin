'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  data: any | null;
}

export default function Dashboard({ data }: DashboardProps) {
  const warehouses = data?.warehouses || [];
  const vessels = data?.vessels || [];
  const personnel = data?.personnel || [];
  const equipment = data?.equipment || [];

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const str = String(value).trim().replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const totalCurrentContainers = warehouses.reduce((sum: number, w: any) => 
    sum + parseNumber(w.current_containers), 0);

  const totalMaxCapacity = warehouses.reduce((sum: number, w: any) => 
    sum + parseNumber(w.max_capacity || w.camax_capacity || w.maxCapacity), 0);

  const totalPersonnel = personnel.reduce((sum: number, p: any) => 
    sum + parseNumber(p.count), 0);

  const warehouseData = warehouses.map((w: any) => {
    const current = parseNumber(w.current_containers);
    const max = parseNumber(w.max_capacity || w.camax_capacity || w.maxCapacity) || 1;
    const percent = Math.round((current / max) * 100);

    return {
      name: w.name?.length > 18 ? w.name.substring(0, 18) + '...' : (w.name || 'Склад'), // для оси X
      fullName: w.name || 'Неизвестный склад',
      current,
      max,
      occupancy: percent,
      // Дополнительные данные для тултипа
      occupancyText: `${percent}%`,
    };
  });

  // Кастомный Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white border border-slate-300 rounded-xl shadow-lg p-4 min-w-[260px]">
        <p className="font-semibold text-lg text-slate-900 mb-3 border-b pb-2">
          {data.fullName}
        </p>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Загружено:</span>
            <span className="font-medium text-slate-900">
              {data.current.toLocaleString('ru-RU')} контейнеров
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-600">Вместимость:</span>
            <span className="font-medium text-slate-900">
              {data.max.toLocaleString('ru-RU')} контейнеров
            </span>
          </div>
          
          <div className="flex justify-between pt-2 border-t">
            <span className="text-slate-600">Загруженность:</span>
            <span className="font-bold text-blue-600">
              {data.occupancy}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-8 overflow-auto h-full">
      <h2 className="text-2xl font-bold mb-6 text-slate-900">Статистика терминала</h2>

      {/* Ключевые показатели */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 p-5 rounded-2xl border-2 border-slate-700 shadow-md">
          <p className="text-slate-600 text-sm">Складов</p>
          <p className="text-4xl font-bold text-slate-900">{warehouses.length}</p>
        </div>
        <div className="bg-gray-100 p-5 rounded-2xl border-2 border-slate-700 shadow-md">
          <p className="text-slate-600 text-sm">Судов в порту</p>
          <p className="text-4xl font-bold text-blue-600">{vessels.length}</p>
        </div>
        <div className="bg-gray-100 p-5 rounded-2xl border-2 border-slate-700 shadow-md">
          <p className="text-slate-600 text-sm">Персонал на смене</p>
          <p className="text-4xl font-bold text-yellow-500">{totalPersonnel}</p>
        </div>
        <div className="bg-gray-100 p-5 rounded-2xl border-2 border-slate-700 shadow-md">
          <p className="text-slate-600 text-sm">Единиц техники</p>
          <p className="text-4xl font-bold text-purple-600">{equipment.length}</p>
        </div>
      </div>

      {/* Общая загрузка */}
      <div className="bg-gray-100 p-6 rounded-2xl border-2 border-slate-700 shadow-md">
        <p className="text-slate-600">Контейнеров в порту сейчас</p>
        <p className="text-5xl font-bold text-green-600 mt-2">
          {totalCurrentContainers.toLocaleString('ru-RU')}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          из {totalMaxCapacity.toLocaleString('ru-RU')} возможных
        </p>
        <div className="mt-4 w-full bg-gray-300 h-3 rounded-full overflow-hidden">
          <div 
            className="h-3 bg-green-500 rounded-full"
            style={{ 
              width: totalMaxCapacity ? `${Math.min(Math.round((totalCurrentContainers / totalMaxCapacity) * 100), 100)}%` : '0%' 
            }}
          />
        </div>
      </div>

      {/* График загруженности складов */}
      {warehouseData.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-slate-900">Загруженность складов</h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={warehouseData}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={90}
                tick={{ fontSize: 11 }}
              />
              <YAxis domain={[0, 100]} />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Bar dataKey="occupancy" fill="#3b82f6" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}