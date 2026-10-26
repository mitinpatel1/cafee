import React from 'react';
import { Plus, Minus, Clock, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { FoodImage } from './FoodImage';

const VegMark = ({ veg }) => (
  <span className="ob-veg" title={veg ? 'Veg' : 'Non-veg'}>
    <span className={veg ? 'diet-dot-veg' : 'diet-dot-nonveg'} />
  </span>
);

// White food card (as in the reference): photo, name, short info, price, orange "Order Now" tag.
export const MenuCard = ({ item }) => {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const qty = cartItems.find((c) => c.menuItemId === item._id)?.quantity || 0;

  return (
    <article className={`ob-card ${item.isAvailable === false ? 'off' : ''}`}>
      <FoodImage item={item}>
        <VegMark veg={item.isVeg} />
        {item.isPopular && <span className="ob-hot">Popular</span>}
      </FoodImage>
      <h3>{item.name}</h3>
      <p className="desc">{item.description}</p>
      <div className="ob-meta">
        <span><Star size={12} fill="#ff5722" color="#ff5722" /> {item.rating || 4.5}</span>
        <span><Clock size={12} /> {item.preparationTime || 8} min</span>
        {item.calories ? <span>{item.calories} kcal</span> : null}
      </div>
      <div className="ob-card-foot">
        <span className="ob-price">₹{item.price}</span>
        {item.isAvailable === false ? (
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
