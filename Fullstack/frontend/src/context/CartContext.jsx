import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('officebite_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('officebite_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item, quantity = 1, instructions = '') => {
    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.menuItemId === (item._id || item.menuItemId));
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        if (instructions) {
          updated[existingIndex].instructions = instructions;
        }
        return updated;
      } else {
        return [
          ...prevItems,
          {
            menuItemId: item._id || item.menuItemId,
            name: item.name,
            price: item.price,
            quantity: Math.max(1, quantity),
            image: item.image,
            category: item.category,
            instructions: instructions || '',
            isVeg: item.isVeg,
          },
        ];
      }
    });
  };

  const updateQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItemId === menuItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateInstructions = (menuItemId, instructions) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItemId === menuItemId ? { ...item, instructions } : item
      )
    );
  };

  const removeFromCart = (menuItemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.menuItemId !== menuItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('officebite_cart');
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05); // 5% GST
  const total = subtotal + tax;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        subtotal,
        tax,
        total,
        addToCart,
        updateQuantity,
        updateInstructions,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
