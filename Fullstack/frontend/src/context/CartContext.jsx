
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  // ============================================
  // LOAD CART FROM LOCAL STORAGE
  // ============================================

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem("officebite_cart");

      return saved
        ? (JSON.parse(saved) || []).filter((item) =>
            /^[a-f0-9]{24}$/i.test(item.menuItemId || "")
          )
        : [];
    } catch {
      return [];
    }
  });

  // ============================================
  // SAVE CART TO LOCAL STORAGE
  // ============================================

  useEffect(() => {
    localStorage.setItem(
      "officebite_cart",
      JSON.stringify(cartItems)
    );
  }, [cartItems]);

  // ============================================
  // ADD TO CART — FIXED +1 ISSUE
  // ============================================

  const addToCart = (
    item,
    quantity = 1,
    instructions = ""
  ) => {
    const menuItemId = item._id || item.menuItemId;
    const quantityToAdd = Math.max(1, Math.floor(Number(quantity) || 1));

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (cartItem) => cartItem.menuItemId === menuItemId
      );

      if (existingItem) {
        // Immutable update: never mutate previous state
        return prevItems.map((cartItem) =>
          cartItem.menuItemId === menuItemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity + quantityToAdd,
                instructions:
                  instructions || cartItem.instructions,
              }
            : cartItem
        );
      }

      return [
        ...prevItems,
        {
          menuItemId,
          name: item.name,
          price: item.price,
          quantity: quantityToAdd,
          image: item.image,
          category: item.category,
          instructions: instructions || "",
          isVeg: item.isVeg,
        },
      ];
    });
  };

  // ============================================
  // UPDATE QUANTITY — +1 / -1
  // ============================================

  const updateQuantity = (menuItemId, newQuantity) => {
    const quantity = Math.floor(Number(newQuantity));

    if (!Number.isFinite(quantity)) return;

    setCartItems((prevItems) =>
      prevItems
        .map((item) =>
          item.menuItemId === menuItemId
            ? {
                ...item,
                quantity,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // ============================================
  // UPDATE INSTRUCTIONS
  // ============================================

  const updateInstructions = (
    menuItemId,
    instructions
  ) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItemId === menuItemId
          ? {
              ...item,
              instructions,
            }
          : item
      )
    );
  };

  // ============================================
  // REMOVE FROM CART
  // ============================================

  const removeFromCart = (menuItemId) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => item.menuItemId !== menuItemId
      )
    );
  };

  // ============================================
  // CLEAR CART
  // ============================================

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("officebite_cart");
  };

  // ============================================
  // CART TOTAL — NO TAX
  // ============================================

  const itemCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const subtotal =
    Math.round(
      cartItems.reduce(
        (sum, item) =>
          sum + item.price * item.quantity,
        0
      ) * 100
    ) / 100;

  const tax = 0;
  const total = subtotal;

  // ============================================
  // CONTEXT PROVIDER
  // ============================================

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
