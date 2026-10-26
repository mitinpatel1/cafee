import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
// Food cards display only photos explicitly added by an admin for real dishes.
export const FoodImage = ({ item, className = 'ob-card-img', children }) => {
  const [failed, setFailed] = useState(false);
  return <div className={className}>
    {item.image && !failed ? <img src={item.image} alt={item.name} loading="lazy" onError={() => setFailed(true)} /> :
    <div className="food-photo-missing" aria-label="Dish photo not added yet"><UtensilsCrossed size={30}/><small>Photo coming soon</small></div>}
    {children}
  </div>;
};
