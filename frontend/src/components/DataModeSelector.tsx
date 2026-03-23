import React from 'react';
import { DataMode } from '../types/dashboard.types';

interface DataModeSelectorProps {
  value: DataMode;
  onChange: (mode: DataMode) => void;
  className?: string;
}

const DataModeSelector: React.FC<DataModeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => onChange('ORDER')}
        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
          value === 'ORDER'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        수주
      </button>
      <button
        type="button"
        onClick={() => onChange('SALES')}
        className={`px-4 py-1.5 text-sm font-medium transition-colors border-l border-gray-200 ${
          value === 'SALES'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        매출
      </button>
    </div>
  );
};

export default DataModeSelector;
