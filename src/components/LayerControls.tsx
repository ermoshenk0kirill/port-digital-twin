'use client';

interface Props {
  activeLayers: {
    warehouses: boolean;
    vessels: boolean;
    quays: boolean;
    equipment: boolean;
    personnel: boolean;
  };
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
}

export default function LayerControls({ activeLayers, setActiveLayers }: Props) {
  const toggleLayer = (layer: string) => {
    setActiveLayers((prev: any) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const layers = [
    { key: 'warehouses', label: 'Склады', emoji: '📦' },
    { key: 'vessels', label: 'Суда', emoji: '🚢' },
    { key: 'quays', label: 'Причалы', emoji: '⚓' },
    { key: 'equipment', label: 'Вся техника', emoji: '🏗️' },
    { key: 'personnel', label: 'Персонал', emoji: '👷' },
  ];

  return (
<div className="absolute top-4 right-4 bg-gray-100 border-2 border-blue-800 rounded-2xl p-4 shadow-xl z-10 w-72">
  <h3 className="font-semibold mb-3 text-slate-900">Слои карты</h3>
  <div className="space-y-2">
    {layers.map((layer) => (
      <label
        key={layer.key}
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-200 rounded-xl cursor-pointer transition"
      >
        <input
          type="checkbox"
          checked={activeLayers[layer.key as keyof typeof activeLayers]}
          onChange={() => toggleLayer(layer.key)}
          className="w-5 h-5 accent-blue-600"
        />
        <span className="text-xl">{layer.emoji}</span>
        <span className="text-sm font-medium">{layer.label}</span>
      </label>
    ))}
  </div>
</div>
  );
}