'use client';

import * as XLSX from 'xlsx';
import { Upload, RefreshCw } from 'lucide-react';
import { useState, useRef } from 'react';

interface Props {
  onDataLoaded: (data: any) => void;
}

export default function FileUpload({ onDataLoaded }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setIsLoading(true);
    console.log(`Читаем файл: ${file.name}`);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const result: any = {};

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          result[sheetName.toLowerCase()] = XLSX.utils.sheet_to_json(sheet);
        });

        console.log("Данные успешно загружены:", result);
        onDataLoaded(result);
        setFileName(file.name);

        alert(`Данные обновлены!\nФайл: ${file.name}`);
      } catch (error) {
        console.error("Ошибка при обработке файла:", error);
        alert("Ошибка при чтении Excel-файла. Проверьте консоль (F12)");
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      console.error("Ошибка FileReader");
      alert("Не удалось прочитать файл");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleRefresh = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // сбрасываем, чтобы можно было выбрать тот же файл
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex gap-3">
      <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl cursor-pointer transition font-medium">
        <Upload size={20} />
        <span>Загрузить Excel</span>
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".xlsx,.xls" 
          onChange={handleFileSelect} 
          className="hidden" 
        />
      </label>

      {fileName && (
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-xl transition font-medium disabled:opacity-50 text-white"
        >
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
          Обновить данные
        </button>
      )}
    </div>
  );
}