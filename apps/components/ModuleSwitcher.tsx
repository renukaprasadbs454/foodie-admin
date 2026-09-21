import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectActiveModule, setActiveModule } from '@/store/moduleSlice';

export type MarketplaceModule = 'FOOD' | 'RESTAURANTS' | 'CAFES' | 'CLOUD_KITCHEN';

export interface ModuleSwitcherProps {
  activeModule?: MarketplaceModule;
  onModuleChange?: (module: MarketplaceModule) => void;
}

const MODULES: { id: MarketplaceModule; label: string; icon: string }[] = [
  { id: 'FOOD', label: 'All Food Delivery', icon: '🍲' },
  { id: 'RESTAURANTS', label: 'Fine Dining & Pizzerias', icon: '🍕' },
  { id: 'CAFES', label: 'Cafes & Bakery', icon: '☕' },
  { id: 'CLOUD_KITCHEN', label: 'Cloud Kitchens', icon: '🍳' },
];

export function ModuleSwitcher({ activeModule: externalModule, onModuleChange }: ModuleSwitcherProps) {
  const dispatch = useAppDispatch();
  const reduxModule = useAppSelector(selectActiveModule);
  const currentModule = externalModule ?? reduxModule;

  const handleSelect = (mod: MarketplaceModule) => {
    dispatch(setActiveModule(mod));
    if (onModuleChange) {
      onModuleChange(mod);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFFFFF',
        padding: '6px 10px',
        borderRadius: 10,
        border: '1px solid #BAE6FD',
        boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', paddingRight: 4 }}>
        Module:
      </span>
      {MODULES.map((m) => {
        const isActive = currentModule === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => handleSelect(m.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 6,
              border: isActive ? '1px solid #0284C7' : '1px solid transparent',
              backgroundColor: isActive ? '#0284C7' : 'transparent',
              color: isActive ? '#FFFFFF' : '#0369A1',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
              transition: 'all 0.15s ease-in-out',
            }}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
