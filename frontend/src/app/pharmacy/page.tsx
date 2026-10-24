'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePharmacy } from '@/lib/pharmacy';
import { apiFetch } from '@/lib/api';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Package,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Building2,
  Pill,
  TrendingUp
} from 'lucide-react';

interface OrderItem {
  id?: number;
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: number;
  patientId: number;
  pharmacyId: number;
  pharmacyName?: string;
  prescriptionId: number;
  status: 'PLACED' | 'PROCESSING' | 'DISPATCHED' | 'READY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  deliveryAddress: string;
  items: OrderItem[];
  createdAt: string;
}

interface InventoryItem {
  id: number;
  pharmacyId: number;
  medicineId: number;
  medicineName: string;
  availableQuantity: number;
  reservedQuantity: number;
  price: number;
  active: boolean;
}

export default function PharmacyDashboardPage() {
  const { user } = useAuth();
  const pharmacyId = usePharmacy().id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      if (!pharmacyId) return;
      // Fetch actual orders and inventory from API Gateway
      const [ordersData, inventoryData] = await Promise.all([
        apiFetch<Order[]>(`/api/pharmacy/orders/pharmacy/${pharmacyId}`),
        apiFetch<InventoryItem[]>(`/api/pharmacy/inventory/${pharmacyId}`)
      ]);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
    } catch (err: any) {
      setOrders([]);
      setInventory([]);
      setError(err.message || 'Unable to load pharmacy data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pharmacyId]);

  // Derived metrics from REAL data
  const pendingOrders = orders.filter((o) => o.status === 'PLACED');
  const preparingOrders = orders.filter((o) => o.status === 'PROCESSING');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');

  const lowStockItems = inventory.filter((item) => item.availableQuantity < 10);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">NEW PLACED</span>;
      case 'DISPATCHED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">DISPATCHED</span>;
      case 'PROCESSING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">PROCESSING</span>;
      case 'READY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">READY</span>;
      case 'DELIVERED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">DELIVERED ✓</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">CANCELLED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Good morning, {user?.username || 'Pharmacy'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage prescriptions, orders, and inventory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <Link
            href="/pharmacy/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            Manage Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Orders */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{pendingOrders.length}</div>
          <p className="text-[11px] text-slate-500">Awaiting confirmation or preparation</p>
        </div>

        {/* Preparing */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Preparing</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{preparingOrders.length}</div>
          <p className="text-[11px] text-slate-500">Currently being packed by staff</p>
        </div>

        {/* Ready / Delivered */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ready for Dispatch</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{readyOrders.length}</div>
          <p className="text-[11px] text-slate-500">Packed and ready for pickup/delivery</p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Low Stock Alerts</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600">{lowStockItems.length}</div>
          <p className="text-[11px] text-slate-500">Items with quantity under 10</p>
        </div>
      </div>

      {/* Inventory Low Stock Banner if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-900">
                {lowStockItems.length} medicine(s) require inventory replenishment
              </div>
              <div className="text-[11px] text-amber-700">
                {lowStockItems.map(i => i.medicineName).slice(0, 3).join(', ')}
              </div>
            </div>
          </div>

          <Link
            href="/pharmacy/inventory"
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0"
          >
            Update Inventory
          </Link>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Pharmacy Orders</h2>
            <p className="text-xs text-slate-500">Real-time incoming orders from patients</p>
          </div>

          <Link
            href="/pharmacy/orders"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View all orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading order records...</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
            <div className="text-2xl">📋</div>
            <div className="text-sm font-bold text-slate-700">No Orders Available</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no prescription fulfillment orders logged for your pharmacy.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Patient</th>
                  <th className="p-3">Rx Reference</th>
                  <th className="p-3">Items Summary</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">#{o.id}</td>
                    <td className="p-3 font-medium text-slate-700">Patient #{o.patientId}</td>
                    <td className="p-3 text-teal-700 font-mono">Rx #{o.prescriptionId}</td>
                    <td className="p-3 text-slate-600">
                      {o.items?.map((i) => i.medicineName).join(', ') || 'Prescription items'}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">₹{o.totalAmount.toFixed(2)}</td>
                    <td className="p-3">{getStatusBadge(o.status)}</td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/pharmacy/orders/${o.id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        View Order
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
