'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { LayoutGroup, AnimatePresence, motion } from 'framer-motion';
import { WaiterOrderCard } from './waiter-order-card';
import { WaiterCompactCard } from './waiter-compact-card';
import { WaiterListCard } from './waiter-list-card';
import { WaiterDetailPanel } from './waiter-detail-panel';
import type { OrderItemStatus } from '@/lib/constants/item-status';
import type { WaiterOrder } from '@/hooks/use-realtime-waiter-orders';

interface WaiterSplitPanelProps {
  orders: WaiterOrder[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string | null) => void;
  viewFilter: 'ready' | 'preparing' | 'recent';
  onItemServed: (itemId: string, newStatus: OrderItemStatus) => void;
}

/**
 * Container component that orchestrates grid ↔ split-panel transitions.
 * When no order is selected: displays responsive grid of cards.
 * When an order is selected: left sidebar list + right detail panel.
 */
export function WaiterSplitPanel({
  orders,
  selectedOrderId,
  onSelectOrder,
  viewFilter,
  onItemServed,
}: WaiterSplitPanelProps) {
  // Get the selected order object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [selectedOrderId, orders]);

  // Handle Escape key to close detail panel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedOrderId) {
      onSelectOrder(null);
    }
  }, [selectedOrderId, onSelectOrder]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle card click - toggle selection
  const handleCardClick = useCallback((orderId: string) => {
    onSelectOrder(orderId === selectedOrderId ? null : orderId);
  }, [selectedOrderId, onSelectOrder]);

  // Handle close detail panel
  const handleCloseDetail = useCallback(() => {
    onSelectOrder(null);
  }, [onSelectOrder]);

  // Get stagger delay class for grid view cards
  const getDelayClass = (index: number) => {
    const delays = [
      'waiter-card-delay-1',
      'waiter-card-delay-2',
      'waiter-card-delay-3',
      'waiter-card-delay-4',
      'waiter-card-delay-5',
      'waiter-card-delay-6',
    ];
    return delays[index % delays.length];
  };

  // If order was selected but no longer exists (e.g., served/removed), clear selection
  useEffect(() => {
    if (selectedOrderId && !selectedOrder) {
      onSelectOrder(null);
    }
  }, [selectedOrderId, selectedOrder, onSelectOrder]);

  const isOpen = selectedOrderId !== null && selectedOrder !== null;

  return (
    <LayoutGroup>
      <div
        className={`waiter-split-container w-full ${isOpen ? 'waiter-split-open' : ''}`}
      >
        {/* Left Panel: Grid or List */}
        <motion.div
          layout
          className="waiter-split-left"
          style={{
            flexGrow: isOpen ? 0 : 1,
            flexShrink: 0,
            flexBasis: isOpen ? '38%' : '100%',
            minHeight: 0,
          }}
          transition={{
            duration: 0.35,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              /* List View (when detail panel is open) */
              <motion.div
                key="list-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="waiter-list-panel"
              >
                {orders.map((order, index) => (
                  <WaiterListCard
                    key={order.id}
                    order={order}
                    isSelected={order.id === selectedOrderId}
                    onClick={() => handleCardClick(order.id)}
                    index={index}
                  />
                ))}
              </motion.div>
            ) : (
              /* Grid View (default) */
              <motion.div
                key="grid-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  viewFilter === 'recent'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                }
              >
                {viewFilter === 'recent' ? (
                  /* Compact cards for Recent tab */
                  orders.map((order, index) => (
                    <WaiterCompactCard
                      key={order.id}
                      order={order}
                      onClick={() => handleCardClick(order.id)}
                      delayClass={getDelayClass(index)}
                    />
                  ))
                ) : (
                  /* Full cards for Ready/Preparing tabs */
                  orders.map((order, index) => (
                    <WaiterOrderCard
                      key={order.id}
                      order={order}
                      onItemServed={onItemServed}
                      onClick={() => handleCardClick(order.id)}
                      delayClass={getDelayClass(index)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Panel: Detail Panel */}
        <AnimatePresence>
          {isOpen && selectedOrder && (
            <motion.div
              key="detail-panel"
              className="waiter-split-right min-h-0 overflow-hidden"
              initial={{ flexGrow: 0, flexShrink: 0, flexBasis: '0%', opacity: 0 }}
              animate={{ flexGrow: 0, flexShrink: 0, flexBasis: '60%', opacity: 1 }}
              exit={{ flexGrow: 0, flexShrink: 0, flexBasis: '0%', opacity: 0 }}
              transition={{
                duration: 0.35,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <WaiterDetailPanel
                order={selectedOrder}
                onClose={handleCloseDetail}
                onItemServed={onItemServed}
                viewFilter={viewFilter}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
