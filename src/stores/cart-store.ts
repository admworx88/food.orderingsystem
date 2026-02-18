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

export interface ExistingOrderItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string | null;
}

export type OrderType = 'dine_in' | 'room_service' | 'takeout' | 'ocean_view';
export type PaymentMethod = 'cash' | 'gcash' | 'card' | 'bill_later';

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

  // Add-to-existing-order state
  addToOrderId: string | null;
  addToOrderNumber: string | null;
  existingOrderItems: ExistingOrderItem[];

  // UI state (not persisted)
  isDetailSheetOpen: boolean;

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
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setExpiresAt: (date: Date | null) => void;
  setAddToOrder: (orderId: string, orderNumber: string, existingItems?: ExistingOrderItem[]) => void;
  clearAddToOrder: () => void;
  clearCart: () => void;
  setDetailSheetOpen: (open: boolean) => void;

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
  addToOrderId: null,
  addToOrderNumber: null,
  existingOrderItems: [],
  isDetailSheetOpen: false,
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addItem: (item) => {
        const serializeAddons = (addons: CartAddon[]) =>
          addons.map(a => a.id).sort().join(',');

        const addonKey = serializeAddons(item.addons);
        const existingIndex = get().items.findIndex(
          (existing) =>
            existing.menuItemId === item.menuItemId &&
            serializeAddons(existing.addons) === addonKey
        );

        if (existingIndex !== -1) {
          set((state) => ({
            items: state.items.map((existing, i) => {
              if (i !== existingIndex) return existing;
              const newQuantity = existing.quantity + 1;
              return {
                ...existing,
                quantity: newQuantity,
                totalPrice:
                  (existing.basePrice +
                    existing.addons.reduce((sum, addon) => sum + addon.price, 0)) *
                  newQuantity,
              };
            }),
          }));
        } else {
          const totalPrice =
            (item.basePrice + item.addons.reduce((sum, addon) => sum + addon.price, 0)) *
            item.quantity;

          set((state) => ({
            items: [...state.items, { ...item, totalPrice }],
          }));
        }
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

      setOrderType: (type) => set({
        orderType: type,
        paymentMethod: null,
        ...(type !== 'dine_in' ? { tableNumber: null } : {}),
        ...(type !== 'room_service' ? { roomNumber: null } : {}),
      }),

      setTableNumber: (number) => set({ tableNumber: number }),

      setRoomNumber: (number) => set({ roomNumber: number }),

      setSpecialInstructions: (instructions) => set({ specialInstructions: instructions }),

      applyPromoCode: (code, discount, promoId) =>
        set({ promoCode: code, discountAmount: discount, promoCodeId: promoId }),

      removePromoCode: () => set({ promoCode: null, discountAmount: 0, promoCodeId: null }),

      setGuestPhone: (phone) => set({ guestPhone: phone }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      setExpiresAt: (date) => set({ expiresAt: date }),

      setAddToOrder: (orderId, orderNumber, existingItems = []) => set({ addToOrderId: orderId, addToOrderNumber: orderNumber, existingOrderItems: existingItems }),

      clearAddToOrder: () => set({ addToOrderId: null, addToOrderNumber: null, existingOrderItems: [] }),

      setDetailSheetOpen: (open) => set({ isDetailSheetOpen: open }),

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
        addToOrderId: state.addToOrderId,
        addToOrderNumber: state.addToOrderNumber,
      }),
    }
  )
);
