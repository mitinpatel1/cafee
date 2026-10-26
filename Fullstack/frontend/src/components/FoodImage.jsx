import React, { useState } from 'react';

const FALLBACK = { Breakfast: '🍳', Lunch: '🍱', Snacks: '🥪', Beverages: '☕', Desserts: '🍰' };

// Shows the photo; if it is missing or fails to load, shows an emoji tile instead of a broken image.
export const FoodImage = ({ item, className = 'ob-card-img', children }) => {
  const [failed, setFailed] = useState(false);
  const showImg = item.image && !failed;
  return (
    <div className={className}>
      {showImg ? (
        <img src={item.image} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="ob-emoji" role="img" aria-label={item.name}>{item.emoji || FALLBACK[item.category] || '🍽️'}</span>
      )}
      {children}
    </div>
  );
};
