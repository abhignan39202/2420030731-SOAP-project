'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePharmacy } from '@/lib/pharmacy';
import { apiFetch } from '@/lib/api';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Truck,
  AlertCircle,
  ChevronLeft,
  ChevronRight
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
  status: 'PLACED' | 'PROCESSING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'CONFIRMED' | 'PREPARING';
  totalAmount: number;
  deliveryAddress: string;
  items: OrderItem[];
  createdAt: string;
}

export default function PharmacyOrdersPage() {
  const { user } = useAuth();
  const pharmacyId = usePharmacy().id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    orderId: number | null;
    targetStatus: string;
  }>({ open: false, orderId: null, targetStatus: '' });

  const fetchOrders = async () => {
    setLoading(true);
    setError('');

    try {
      if (!pharmacyId) return;
      const data: Order[] = await apiFetch(`/api/pharmacy/orders/pharmacy/${pharmacyId}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setOrders([]);
      setError(err.message || 'Unable to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [pharmacyId]);

  // Open confirmation modal before state transition
  const requestTransition = (orderId: number, targetStatus: string) => {
    setConfirmModal({ open: true, orderId, targetStatus });
  };

  const executeTransition = async () => {
    const { orderId, targetStatus } = confirmModal;
    if (!orderId) return;

    setConfirmModal({ open: false, orderId: null, targetStatus: '' });
    setMsg('');
    setError('');

    let endpoint = '';
    switch (targetStatus) {
      case 'PROCESSING': endpoint = `/api/pharmacy/orders/${orderId}/processing`; break;
      case 'READY': endpoint = `/api/pharmacy/orders/${orderId}/ready`; break;
      case 'DISPATCHED': endpoint = `/api/pharmacy/orders/${orderId}/dispatched`; break;
      case 'DELIVERED': endpoint = `/api/pharmacy/orders/${orderId}/delivered`; break;
      case 'CANCELLED': endpoint = `/api/pharmacy/orders/${orderId}/cancel`; break;
    }

    try {
      await apiFetch(endpoint, {
        method: 'PATCH',
        userId: user?.id,
      });
      setMsg(`Order #${orderId} status successfully updated to ${targetStatus}!`);
      fetchOrders();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Conflict')) {
        setError(`This order cannot be moved to status ${targetStatus} from its current state.`);
      } else {
        setError(err.message || 'Unable to update order status.');
      }
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const normalizedStatus = o.status === 'CONFIRMED' || o.status === 'PREPARING' ? 'PROCESSING' : o.status;
    const matchesStatus = statusFilter === 'ALL' || normalizedStatus === statusFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      o.id.toString().includes(searchTerm) ||
      o.patientId.toString().includes(searchTerm) ||
      o.prescriptionId.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PLACED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">NEW PLACED</span>;
      case 'CONFIRMED':
      case 'PREPARING':
      case 'PROCESSING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">PROCESSING</span>;
      case 'READY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">READY</span>;
      case 'DISPATCHED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">DISPATCHED</span>;
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
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-slate-900">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
              <h3 className="text-lg font-bold">Confirm Status Change</h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to update Order <strong>#{confirmModal.orderId}</strong> to status{' '}
              <strong className="text-slate-900">{confirmModal.targetStatus}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, orderId: null, targetStatus: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={executeTransition}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Incoming Prescription Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verify prescription references, check reserved inventory, and process order fulfillment.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl inline-block">
            Pharmacy ID #{pharmacyId}
          </span>
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex justify-between items-center">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="hover:underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      {/* Controls: Search + Status Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order, Patient, or Rx ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'PLACED', 'PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading order records...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="text-4xl">📋</div>
          <h3 className="text-lg font-bold text-slate-900">No Matching Orders</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No prescription fulfillment orders match your current filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                <div>
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/pharmacy/orders/${o.id}`}
                      className="text-base font-bold text-slate-900 hover:text-emerald-600 transition"
                    >
                      Order #{o.id}
                    </Link>
                    {getStatusBadge(o.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Patient ID: <strong className="text-slate-800">#{o.patientId}</strong> • Rx Reference: <strong className="text-teal-700">#{o.prescriptionId}</strong> • Placed: {new Date(o.createdAt).toLocaleTimeString()}
                  </p>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <strong className="text-lg font-extrabold text-emerald-700">₹{o.totalAmount.toFixed(2)}</strong>
                  </div>
                  <Link
                    href={`/pharmacy/orders/${o.id}`}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs shadow-xs"
                  >
                    View Details
                  </Link>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Quantity Requested</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {o.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="p-3 font-bold text-slate-900">{item.medicineName}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.quantity}</td>
                        <td className="p-3 text-slate-600">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="p-3 font-bold text-right text-slate-900">₹{item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Delivery Address & Workflow Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs pt-2 border-t border-slate-100 gap-4">
                <span className="text-slate-500">
                  Delivery Address: <strong className="text-slate-800">{o.deliveryAddress}</strong>
                </span>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  {o.status === 'PLACED' && (
                    <button
                      onClick={() => requestTransition(o.id, 'PROCESSING')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      ✓ Accept and Process
                    </button>
                  )}

                  {['PROCESSING', 'CONFIRMED', 'PREPARING'].includes(o.status) && (
                    <button
                      onClick={() => requestTransition(o.id, 'READY')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      ✓ Mark Ready
                    </button>
                  )}

                  {o.status === 'READY' && (
                    <button
                      onClick={() => requestTransition(o.id, 'DISPATCHED')}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs"
                    >
                      ▶ Dispatch Order
                    </button>
                  )}

                  {o.status === 'DISPATCHED' && (
                    <button
                      onClick={() => requestTransition(o.id, 'DELIVERED')}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs"
                    >
                      ✓ Mark Delivered
                    </button>
                  )}

                  {['PLACED', 'PROCESSING', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status) && (
                    <button
                      onClick={() => requestTransition(o.id, 'CANCELLED')}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
