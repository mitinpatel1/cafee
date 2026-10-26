import React from 'react';
import { useCart } from '../context/CartContext';
import { Plus, Minus, Clock, Flame, Star } from 'lucide-react';

export const FoodCard = ({ item }) => {
  const { cartItems, addToCart, updateQuantity } = useCart();

  const cartItem = cartItems.find((i) => i.menuItemId === item._id);
  const quantity = cartItem ? cartItem.quantity : 0;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        position: 'relative',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #eee7db',
      }}
    >
      {/* Food Image Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '190px',
          overflow: 'hidden',
          backgroundColor: '#f7f4ed',
        }}
      >
        <img
          src={item.image}
          alt={item.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
            filter: item.isAvailable ? 'none' : 'grayscale(80%) opacity(70%)',
          }}
          onMouseEnter={(e) => {
            if (item.isAvailable) e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        />

        {/* Dietary Tag (Veg / Non-veg dot) */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            borderRadius: '6px',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              border: item.isVeg ? '2px solid #16a34a' : '2px solid #dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '3px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: item.isVeg ? '#16a34a' : '#dc2626',
              }}
            />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#1e1915' }}>
            {item.isVeg ? 'Veg' : 'Non-Veg'}
          </span>
        </div>

        {/* Bestseller / Rating badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            borderRadius: '9999px',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '0.75rem',
            fontWeight: '700',
            color: '#1e1915',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <Star size={13} fill="#e59838" color="#e59838" />
          <span>{item.rating || 4.8}</span>
        </div>

        {/* Sold out overlay */}
        {!item.isAvailable && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                background: '#ef4444',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.82rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Sold Out Today
            </span>
          </div>
        )}
      </div>

      {/* Food Details Body */}
      <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: '600',
              color: '#d9532f',
              background: '#fff2ee',
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
            }}
          >
            {item.category}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: '#6b635c',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <Clock size={12} /> {item.preparationTime || 10}m
          </span>
          {item.calories && (
            <span
              style={{
                fontSize: '0.72rem',
                color: '#6b635c',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <Flame size={12} /> {item.calories} kcal
            </span>
          )}
        </div>

        <h3
          style={{
            fontSize: '1.08rem',
            fontWeight: '750',
            color: '#1e1915',
            marginBottom: '0.35rem',
            lineHeight: 1.3,
          }}
        >
          {item.name}
        </h3>

        <p
          style={{
            fontSize: '0.84rem',
            color: '#6b635c',
            lineHeight: 1.45,
            marginBottom: '1rem',
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </p>

        {/* Price & Add to Cart Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.75rem',
            borderTop: '1px solid #f7f4ed',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', color: '#9c9288', display: 'block' }}>Price</span>
            <span
              style={{
                fontSize: '1.25rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: '800',
                color: '#1e1915',
              }}
            >
              ₹{item.price}
            </span>
          </div>

          <div>
            {!item.isAvailable ? (
              <button
                disabled
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  background: '#f7f4ed',
                  color: '#9c9288',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'not-allowed',
                }}
              >
                Unavailable
              </button>
            ) : quantity > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#d9532f',
                  borderRadius: '10px',
                  padding: '0.25rem 0.4rem',
                  color: '#ffffff',
                  boxShadow: '0 4px 10px rgba(217, 83, 47, 0.25)',
                }}
              >
                <button
                  onClick={() => updateQuantity(item._id, quantity - 1)}
                  style={{
                    color: '#ffffff',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                >
                  <Minus size={15} />
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.9rem', minWidth: '18px', textAlign: 'center' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => addToCart(item, 1)}
                  style={{
                    color: '#ffffff',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                  }}
                >
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(item, 1)}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  gap: '0.35rem',
                }}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
