import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  basePrice: number;
  quantity: number;
  addons: CartAddon[];
  specialInstructions?: string;
  allergens?: string[];
  imageUrl?: string;
  totalPrice: number; // (basePrice + sum(addon prices)) * quantity
}

export type OrderType = 'dine_in' | 'room_service' | 'takeout';
export type PaymentMethod = 'cash' | 'gcash' | 'card';

interface CartStore {
  // Cart state
  items: CartItem[];
  orderType: OrderType | null;
  tableNumber: string | null;
  roomNumber: string | null;
  specialInstructions: string;
  promoCode: string | null;
  promoCodeId: string | null;
  discountAmount: number;
  guestPhone: string | null;
  paymentMethod: PaymentMethod | null;
  expiresAt: Date | null;

  // Actions
  addItem: (item: Omit<CartItem, 'totalPrice'>) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  updateSpecialInstructions: (index: number, instructions: string) => void;
  setOrderType: (type: OrderType) => void;
  setTableNumber: (number: string) => void;
  setRoomNumber: (number: string) => void;
  setSpecialInstructions: (instructions: string) => void;
  applyPromoCode: (code: string, discount: number, promoId: string) => void;
  removePromoCode: () => void;
  setGuestPhone: (phone: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setExpiresAt: (date: Date | null) => void;
  clearCart: () => void;

  // Computed getters
  getItemCount: () => number;
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getServiceCharge: () => number;
  getTotal: () => number;
}

const initialState = {
  items: [],
  orderType: null,
  tableNumber: null,
  roomNumber: null,
  specialInstructions: '',
  promoCode: null,
  promoCodeId: null,
  discountAmount: 0,
  guestPhone: null,
  paymentMethod: null,
  expiresAt: null,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (item) => {
        const totalPrice =
          (item.basePrice + item.addons.reduce((sum, addon) => sum + addon.price, 0)) *
          item.quantity;

        set((state) => ({
          items: [...state.items, { ...item, totalPrice }],
        }));
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateQuantity: (index, quantity) => {
        if (quantity <= 0) {
          get().removeItem(index);
          return;
        }

        set((state) => ({
          items: state.items.map((item, i) =>
            i === index
              ? {
                  ...item,
                  quantity,
                  totalPrice:
                    (item.basePrice +
                      item.addons.reduce((sum, addon) => sum + addon.price, 0)) *
                    quantity,
                }
              : item
          ),
        }));
      },

      updateSpecialInstructions: (index, instructions) => {
        set((state) => ({
          items: state.items.map((item, i) =>
            i === index ? { ...item, specialInstructions: instructions } : item
          ),
        }));
      },

      setOrderType: (type) => set({ orderType: type }),

      setTableNumber: (number) => set({ tableNumber: number }),

      setRoomNumber: (number) => set({ roomNumber: number }),

      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),

      applyPromoCode: (code, discount, promoId) =>
        set({ promoCode: code, discountAmount: discount, promoCodeId: promoId }),

      removePromoCode: () => set({ promoCode: null, discountAmount: 0, promoCodeId: null }),

      setGuestPhone: (phone) => set({ guestPhone: phone }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      setExpiresAt: (date) => set({ expiresAt: date }),

      clearCart: () => set(initialState),

      // Computed values
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
      },

      getTaxAmount: () => {
        const subtotal = get().getSubtotal();
        const discounted = subtotal - get().discountAmount;
        return discounted * 0.12; // 12% VAT
      },

      getServiceCharge: () => {
        const subtotal = get().getSubtotal();
        const discounted = subtotal - get().discountAmount;
        return discounted * 0.1; // 10% service charge
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discounted = subtotal - get().discountAmount;
        const tax = get().getTaxAmount();
        const service = get().getServiceCharge();
        return discounted + tax + service;
      },
    }),
    {
      name: 'orderflow-cart',
      partialize: (state) => ({
        items: state.items,
        orderType: state.orderType,
        tableNumber: state.tableNumber,
        roomNumber: state.roomNumber,
        specialInstructions: state.specialInstructions,
        promoCode: state.promoCode,
        promoCodeId: state.promoCodeId,
        discountAmount: state.discountAmount,
        guestPhone: state.guestPhone,
      }),
    }
  )
);
