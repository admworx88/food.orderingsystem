/**
 * Dashboard Types
 * Types for the admin dashboard KPIs and analytics
 */

export interface DashboardStats {
  ordersToday: number;
  revenueToday: number; // In PHP (₱)
  avgOrderValue: number;
  activeOrders: number;
  ordersChange: number; // % change vs yesterday (positive = increase)
  revenueChange: number; // % change vs yesterday
  avgOrderChange: number; // % change vs yesterday
}

export interface OrdersByType {
  dine_in: number;
  room_service: number;
  takeout: number;
}

export interface TopSellingItem {
  id: string;
  name: string;
  orderCount: number;
  revenue: number;
  imageUrl?: string | null;
}

export interface RevenueDataPoint {
  date: string; // ISO date string or formatted date
  revenue: number;
  orders: number;
  label?: string; // Optional display label (e.g., "Mon", "Feb 5")
}

export interface OrderTypeData {
  type: 'dine_in' | 'room_service' | 'takeout' | 'ocean_view';
  label: string; // Display label (e.g., "Dine-in", "Room Service")
  count: number;
  percentage: number;
  color: string; // Chart color
}

export interface SalesReportData {
  period: string; // Date or period label
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  ordersByType: OrdersByType;
  ordersByPaymentMethod: {
    cash: number;
    gcash: number;
    card: number;
    maya: number;
  };
}

// Dashboard full data structure
export interface DashboardData {
  stats: DashboardStats;
  revenueChart: RevenueDataPoint[];
  topItems: TopSellingItem[];
  orderTypeBreakdown: OrderTypeData[];
  monthlyRevenue: RevenueDataPoint[];
}

// Sales Report Types
export interface SalesReportSummary {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topCategory: string | null;
}

export interface SalesByCategoryItem {
  categoryId: string;
  categoryName: string;
  revenue: number;
  orderCount: number;
}

export interface SalesByMenuItem {
  menuItemId: string;
  name: string;
  qtySold: number;
  revenue: number;
  avgPrice: number;
}

export interface SalesByPaymentMethodItem {
  method: string;
  label: string;
  count: number;
  revenue: number;
  color: string;
}
