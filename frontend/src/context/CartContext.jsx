import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState({ groups: [], summary: { totalItems: 0, selectedCount: 0, selectedSubtotal: 0 } });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart({ groups: [], summary: { totalItems: 0, selectedCount: 0, selectedSubtotal: 0 } });
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/cart');
      setCart(res.data.data);
    } catch {
      // Ignore cart fetch errors when offline
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, variantId = null, quantity = 1) => {
    try {
      const res = await api.post('/cart/items', { productId, variantId, quantity });
      setCart(res.data.data);
      toast.success('Produk ditambahkan ke keranjang!');
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    }
  };

  const updateCartItem = async (itemId, payload) => {
    try {
      const res = await api.put(`/cart/items/${itemId}`, payload);
      setCart(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeCartItem = async (itemId) => {
    try {
      const res = await api.delete(`/cart/items/${itemId}`);
      setCart(res.data.data);
      toast.info('Item dihapus dari keranjang.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        fetchCart,
        addToCart,
        updateCartItem,
        removeCartItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
