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
  const baseStyle: React.CSSProperties = {
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
    letterSpacing: '0.04em',
  };

  const activeStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'var(--accent)',
    color: '#fff',
    boxShadow: '0 2px 8px var(--accent-shadow, rgba(124,106,247,0.35))',
  };

  const inactiveStyle: React.CSSProperties = {
    ...baseStyle,
    background: 'transparent',
    color: 'var(--text-muted)',
  };

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        borderRadius: 8,
        border: '1.5px solid var(--glass-border)',
        overflow: 'hidden',
        background: 'var(--glass)',
      }}
    >
      <button
        type="button"
        onClick={() => onChange('ORDER')}
        style={value === 'ORDER' ? activeStyle : inactiveStyle}
      >
        수주
      </button>
      <div style={{ width: 1, background: 'var(--glass-border)', flexShrink: 0 }} />
      <button
        type="button"
        onClick={() => onChange('SALES')}
        style={value === 'SALES' ? activeStyle : inactiveStyle}
      >
        매출
      </button>
    </div>
  );
};

export default DataModeSelector;
