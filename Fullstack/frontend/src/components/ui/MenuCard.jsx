import React from 'react';
import { ShoppingCart, Plus, Minus, UtensilsCrossed } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { menuPhoto } from '../../constants/menuPhotography';

// The same live MongoDB item powers the card and the existing cart API.
export const MenuCard = ({ item, canOrder = true }) => {
  const { cartItems, addToCart, updateQuantity } = useCart();
  const qty = cartItems.find((line) => line.menuItemId === item._id)?.quantity || 0;
  const soldOut = item.isAvailable === false;
  const previewOnly = !canOrder || item.catalogPreview === true;
  const photo = menuPhoto(item);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [photo]);

  return (
    <article className={`caf-food-card ${soldOut ? 'caf-food-card--soldout' : ''}`}>
      <div className="caf-food-photo-wrap">
        {photo && !failed ? (
          <img src={photo} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <div className="caf-food-no-photo"><UtensilsCrossed size={28} /><span>Photo coming soon</span></div>
        )}
        {typeof item.isVeg === 'boolean' && (
          <span className={`caf-food-diet ${item.isVeg ? 'caf-food-diet--veg' : 'caf-food-diet--nonveg'}`} title={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'} aria-label={item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}>
            <i />
          </span>
        )}
        <span className="caf-food-category">{item.category}</span>
        {soldOut && <span className="caf-food-soldout">Sold out</span>}
      </div>
      <div className="caf-food-card-body">
        <h3 title={item.name}>{item.name}</h3>
        <p>{item.description || 'Freshly prepared in our kitchen.'}</p>
        <div className="caf-food-price">₹ {Number(item.price || 0).toLocaleString('en-IN')}</div>
        {previewOnly ? (
          <button className="caf-add-button" type="button" disabled title="Select an active kitchen before ordering">Select a kitchen</button>
        ) : soldOut ? (
          <button className="caf-add-button" type="button" disabled>Sold out</button>
        ) : qty ? (
          <div className="caf-card-quantity" aria-label={`Quantity of ${item.name}: ${qty}`}>
            <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => updateQuantity(item._id, qty - 1)}><Minus size={17} /></button>
            <span>{qty} in cart</span>
            <button type="button" aria-label={`Add one ${item.name}`} onClick={() => addToCart(item, 1)}><Plus size={17} /></button>
          </div>
        ) : (
          <button className="caf-add-button" type="button" onClick={() => addToCart(item, 1)}><ShoppingCart size={15} /> Add to Cart</button>
        )}
      </div>
    </article>
  );
};
