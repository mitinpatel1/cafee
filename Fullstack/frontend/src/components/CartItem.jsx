import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Trash2, Edit3, Check } from 'lucide-react';

export const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart, updateInstructions } = useCart();
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.instructions || '');

  const saveNote = () => {
    updateInstructions(item.menuItemId, noteText);
    setEditingNote(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        background: '#ffffff',
        border: '1px solid #eee7db',
        borderRadius: '14px',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Item Image & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '200px' }}>
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '10px',
            objectFit: 'cover',
            background: '#f7f4ed',
          }}
        />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: '750', color: '#1e1915' }}>
              {item.name}
            </h4>
            {item.isVeg !== undefined && (
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: item.isVeg ? '#16a34a' : '#dc2626',
                  display: 'inline-block',
                }}
              />
            )}
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#d9532f' }}>
            ₹{item.price} each
          </div>

          {/* Kitchen instructions note */}
          {!editingNote ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.78rem', color: item.instructions ? '#4b5563' : '#9ca3af', fontStyle: 'italic' }}>
                {item.instructions ? `Note: "${item.instructions}"` : '+ Add kitchen note'}
              </span>
              <button
                onClick={() => setEditingNote(true)}
                style={{ color: '#d9532f', padding: '2px', cursor: 'pointer' }}
                title="Edit instruction"
              >
                <Edit3 size={12} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Extra spicy, less oil"
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.78rem',
                  border: '1px solid #d9532f',
                  borderRadius: '6px',
                  outline: 'none',
                }}
                autoFocus
              />
              <button
                onClick={saveNote}
                style={{
                  background: '#d9532f',
                  color: '#ffffff',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <Check size={12} /> Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quantity & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Quantity Stepper */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#f7f4ed',
            padding: '0.25rem 0.5rem',
            borderRadius: '10px',
            border: '1px solid #eee7db',
          }}
        >
          <button
            onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#2b231d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Minus size={14} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '0.95rem', minWidth: '20px', textAlign: 'center' }}>
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: '#ffffff',
              color: '#2b231d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Item Total */}
        <div style={{ minWidth: '70px', textAlign: 'right' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#1e1915' }}>
            ₹{item.price * item.quantity}
          </div>
        </div>

        {/* Delete / Remove */}
        <button
          onClick={() => removeFromCart(item.menuItemId)}
          style={{
            color: '#ef4444',
            padding: '8px',
            borderRadius: '8px',
            background: '#fef2f2',
            transition: 'background 0.2s',
          }}
          title="Remove from cart"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
