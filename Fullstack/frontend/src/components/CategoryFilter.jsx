import React from 'react';

export const CategoryFilter = ({ selectedCategory, onSelectCategory }) => {
  const categories = [
    { id: 'All', label: 'All Items', icon: '✨' },
    { id: 'Meals', label: 'Meals', icon: '🍛' },
    { id: 'Snacks', label: 'Snacks', icon: '🥪' },
    { id: 'Drinks', label: 'Drinks', icon: '☕' },
    { id: 'Healthy', label: 'Healthy', icon: '🥗' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        overflowX: 'auto',
        padding: '0.35rem 0',
        scrollbarWidth: 'none',
      }}
    >
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '9999px',
              fontSize: '0.925rem',
              fontWeight: isSelected ? '700' : '500',
              color: isSelected ? '#ffffff' : '#2b231d',
              background: isSelected ? '#d9532f' : '#ffffff',
              border: isSelected ? '1px solid #d9532f' : '1px solid #eee7db',
              boxShadow: isSelected
                ? '0 4px 12px rgba(217, 83, 47, 0.25)'
                : '0 1px 3px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ fontSize: '1.15rem' }}>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};
