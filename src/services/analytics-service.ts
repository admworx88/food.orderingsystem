'use server';

import { createServerClient } from '@/lib/supabase/server';
import type {
  DashboardStats,
  TopSellingItem,
  RevenueDataPoint,
  OrderTypeData,
  DashboardData,
} from '@/types/dashboard';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Get dashboard statistics for today
 * Returns orders count, revenue, avg order value, and active orders
 */
export async function getDashboardStats(): Promise<
  ServiceResult<DashboardStats>
> {
  try {
    const supabase = await createServerClient();

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();
    const yesterdayStart = startOfDay(subDays(today, 1)).toISOString();
    const yesterdayEnd = endOfDay(subDays(today, 1)).toISOString();

    // Get today's orders
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (todayError) throw todayError;

    // Get yesterday's orders for comparison
    const { data: yesterdayOrders, error: yesterdayError } = await supabase
      .from('orders')
      .select('id, total_amount')
      .gte('created_at', yesterdayStart)
      .lte('created_at', yesterdayEnd)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (yesterdayError) throw yesterdayError;

    // Get active orders (preparing or ready)
    const { count: activeCount, error: activeError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'preparing', 'ready'])
      .is('deleted_at', null);

    if (activeError) throw activeError;

    // Calculate today's stats
    const ordersToday = todayOrders?.length || 0;
    const revenueToday =
      todayOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) ||
      0;
    const avgOrderValue = ordersToday > 0 ? revenueToday / ordersToday : 0;

    // Calculate yesterday's stats
    const ordersYesterday = yesterdayOrders?.length || 0;
    const revenueYesterday =
      yesterdayOrders?.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0
      ) || 0;
    const avgOrderYesterday =
      ordersYesterday > 0 ? revenueYesterday / ordersYesterday : 0;

    // Calculate percentage changes
    const ordersChange =
      ordersYesterday > 0
        ? ((ordersToday - ordersYesterday) / ordersYesterday) * 100
        : ordersToday > 0
          ? 100
          : 0;

    const revenueChange =
      revenueYesterday > 0
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
        : revenueToday > 0
          ? 100
          : 0;

    const avgOrderChange =
      avgOrderYesterday > 0
        ? ((avgOrderValue - avgOrderYesterday) / avgOrderYesterday) * 100
        : avgOrderValue > 0
          ? 100
          : 0;

    return {
      success: true,
      data: {
        ordersToday,
        revenueToday,
        avgOrderValue,
        activeOrders: activeCount || 0,
        ordersChange: Math.round(ordersChange * 10) / 10,
        revenueChange: Math.round(revenueChange * 10) / 10,
        avgOrderChange: Math.round(avgOrderChange * 10) / 10,
      },
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}

/**
 * Get revenue chart data for the last N days
 */
export async function getRevenueChartData(
  days: number = 7
): Promise<ServiceResult<RevenueDataPoint[]>> {
  try {
    const supabase = await createServerClient();

    const dataPoints: RevenueDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      const { data: orders, error } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .in('payment_status', ['paid', 'refunded'])
        .is('deleted_at', null);

      if (error) throw error;

      const revenue =
        orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      dataPoints.push({
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE'), // "Mon", "Tue", etc.
        revenue,
        orders: orders?.length || 0,
      });
    }

    return { success: true, data: dataPoints };
  } catch (error) {
    console.error('getRevenueChartData error:', error);
    return { success: false, error: 'Failed to fetch revenue chart data' };
  }
}

/**
 * Get top selling items for today
 */
export async function getTopSellingItems(
  limit: number = 5
): Promise<ServiceResult<TopSellingItem[]>> {
  try {
    const supabase = await createServerClient();

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    // Get order items from today's paid orders
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select(
        `
        menu_item_id,
        quantity,
        unit_price,
        menu_items!inner (
          id,
          name,
          image_url
        ),
        orders!inner (
          created_at,
          payment_status,
          deleted_at
        )
      `
      )
      .gte('orders.created_at', todayStart)
      .lte('orders.created_at', todayEnd)
      .eq('orders.payment_status', 'paid')
      .is('orders.deleted_at', null);

    if (error) throw error;

    // Aggregate by menu item
    const itemMap = new Map<
      string,
      { name: string; orderCount: number; revenue: number; imageUrl: string | null }
    >();

    orderItems?.forEach((item) => {
      const menuItem = item.menu_items as unknown as {
        id: string;
        name: string;
        image_url: string | null;
      };
      const existing = itemMap.get(menuItem.id);

      if (existing) {
        existing.orderCount += item.quantity;
        existing.revenue += item.unit_price * item.quantity;
      } else {
        itemMap.set(menuItem.id, {
          name: menuItem.name,
          orderCount: item.quantity,
          revenue: item.unit_price * item.quantity,
          imageUrl: menuItem.image_url,
        });
      }
    });

    // Sort by order count and take top N
    const topItems: TopSellingItem[] = Array.from(itemMap.entries())
      .sort((a, b) => b[1].orderCount - a[1].orderCount)
      .slice(0, limit)
      .map(([id, data]) => ({
        id,
        name: data.name,
        orderCount: data.orderCount,
        revenue: data.revenue,
        imageUrl: data.imageUrl,
      }));

    return { success: true, data: topItems };
  } catch (error) {
    console.error('getTopSellingItems error:', error);
    return { success: false, error: 'Failed to fetch top selling items' };
  }
}

/**
 * Get order type breakdown for today
 */
export async function getOrderTypeBreakdown(): Promise<
  ServiceResult<OrderTypeData[]>
> {
  try {
    const supabase = await createServerClient();

    const today = new Date();
    const todayStart = startOfDay(today).toISOString();
    const todayEnd = endOfDay(today).toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_type')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .in('payment_status', ['paid', 'refunded'])
      .is('deleted_at', null);

    if (error) throw error;

    const counts = {
      dine_in: 0,
      room_service: 0,
      takeout: 0,
    };

    orders?.forEach((order) => {
      if (order.order_type in counts) {
        counts[order.order_type as keyof typeof counts]++;
      }
    });

    const total = orders?.length || 1; // Avoid division by zero

    const breakdown: OrderTypeData[] = [
      {
        type: 'dine_in',
        label: 'Dine-in',
        count: counts.dine_in,
        percentage: Math.round((counts.dine_in / total) * 100),
        color: '#3b82f6', // Blue
      },
      {
        type: 'room_service',
        label: 'Room Service',
        count: counts.room_service,
        percentage: Math.round((counts.room_service / total) * 100),
        color: '#10b981', // Emerald
      },
      {
        type: 'takeout',
        label: 'Takeout',
        count: counts.takeout,
        percentage: Math.round((counts.takeout / total) * 100),
        color: '#f59e0b', // Amber
      },
    ];

    return { success: true, data: breakdown };
  } catch (error) {
    console.error('getOrderTypeBreakdown error:', error);
    return { success: false, error: 'Failed to fetch order type breakdown' };
  }
}

/**
 * Get all dashboard data in one call
 */
export async function getDashboardData(): Promise<ServiceResult<DashboardData>> {
  try {
    const [statsResult, chartResult, topItemsResult, breakdownResult] =
      await Promise.all([
        getDashboardStats(),
        getRevenueChartData(7),
        getTopSellingItems(5),
        getOrderTypeBreakdown(),
      ]);

    if (!statsResult.success) {
      return { success: false, error: statsResult.error };
    }
    if (!chartResult.success) {
      return { success: false, error: chartResult.error };
    }
    if (!topItemsResult.success) {
      return { success: false, error: topItemsResult.error };
    }
    if (!breakdownResult.success) {
      return { success: false, error: breakdownResult.error };
    }

    return {
      success: true,
      data: {
        stats: statsResult.data,
        revenueChart: chartResult.data,
        topItems: topItemsResult.data,
        orderTypeBreakdown: breakdownResult.data,
      },
    };
  } catch (error) {
    console.error('getDashboardData error:', error);
    return { success: false, error: 'Failed to fetch dashboard data' };
  }
}
