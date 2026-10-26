import React from 'react';

export const CategoryFilter = ({ selectedCategory, onSelectCategory }) => {
  const categories = [
    { id: 'All', label: 'All Items', icon: '•' },
    { id: 'Breakfast', label: 'Breakfast', icon: '01' },
    { id: 'Lunch', label: 'Lunch', icon: '02' },
    { id: 'Snacks', label: 'Snacks', icon: '03' },
    { id: 'Beverages', label: 'Beverages', icon: '04' },
    { id: 'Desserts', label: 'Desserts', icon: '05' },
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
              color: isSelected ? '#ffffff' : '#581832',
              background: isSelected ? '#b32638' : '#ffffff',
              border: isSelected ? '1px solid #b32638' : '1px solid #eee7db',
              boxShadow: isSelected
                ? '0 4px 12px rgba(101, 14, 48, 0.20)'
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
