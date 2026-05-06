import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const STORAGE_KEY = 'shopai_cart';

function loadCart() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => { saveCart(items); }, [items]);

  /**
   * addItem — adds a product variant to cart (or increments qty)
   * @param {{ product_id, variant_id, name, brand, variant_label, sku, price, image }} item
   * @param {number} qty
   */
  const addItem = (item, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.variant_id === item.variant_id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + qty };
        return updated;
      }
      return [...prev, { ...item, qty }];
    });
  };

  const removeItem = (variant_id) => {
    setItems(prev => prev.filter(i => i.variant_id !== variant_id));
  };

  const updateQty = (variant_id, qty) => {
    if (qty < 1) { removeItem(variant_id); return; }
    setItems(prev => prev.map(i => i.variant_id === variant_id ? { ...i, qty } : i));
  };

  const clearCart = () => { setItems([]); saveCart([]); };

  const itemCount   = items.reduce((s, i) => s + i.qty, 0);
  const subtotal    = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping    = subtotal >= 50 || subtotal === 0 ? 0 : 4.99;
  const total       = subtotal + shipping;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, itemCount, subtotal, shipping, total }}>
      {children}
    </CartContext.Provider>
  );
}
