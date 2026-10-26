import React from 'react';
import { Plus, Minus, Clock, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { FoodImage } from './FoodImage';

// Photographic food card with a real DB price and no fabricated ratings.
export const MenuCard = ({ item, canOrder = true }) => {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const qty = cartItems.find((c) => c.menuItemId === item._id)?.quantity || 0;
  const soldOut = item.isAvailable === false;
  const previewOnly = !canOrder || item.catalogPreview === true;

  return (
    <article className={`ob-card ${soldOut ? 'off' : ''}`}>
      <span className="ob-price-hex" aria-label={`Price ${item.price} rupees`}>₹{item.price}</span>
      <span className="ob-veg" title={item.isVeg ? 'Veg' : 'Non-veg'}>
        <span className={item.isVeg ? 'diet-dot-veg' : 'diet-dot-nonveg'} />
      </span>
      <FoodImage item={item} />
      <h3>{item.name}</h3>
      <p className="desc">{item.description}</p>
      <div className="ob-meta">
        {item.rating > 0 && <span><Star size={12} fill="#b32638" color="#b32638" /> {item.rating}</span>}
        {item.calories ? <span>{item.calories} kcal</span> : null}
        {item.isPopular ? <span style={{ color: '#b32638', fontWeight: 600 }}>Popular</span> : null}
      </div>
      <div className="ob-card-foot">
        <span className="ob-price"><small>Ready in</small><Clock size={12} style={{ verticalAlign: '-1px' }} /> {item.preparationTime ?? 10} min</span>
        {previewOnly ? (
          <button className="ob-order" type="button" disabled title="Register or select a franchise before ordering">Select a kitchen</button>
        ) : soldOut ? (
          <button className="ob-order" disabled>Sold out</button>
        ) : qty > 0 ? (
          <div className="ob-qty">
            <button aria-label="Decrease" onClick={() => updateQuantity(item._id, qty - 1)}><Minus size={14} /></button>
            <span>{qty}</span>
            <button aria-label="Increase" onClick={() => addToCart(item, 1)}><Plus size={14} /></button>
          </div>
        ) : (
          <button className="ob-order" onClick={() => addToCart(item, 1)}>Order Now</button>
        )}
      </div>
    </article>
  );
};
