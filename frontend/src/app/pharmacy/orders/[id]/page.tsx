'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePharmacy } from '@/lib/pharmacy';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  AlertCircle,
  FileText,
  Building2,
  ShoppingBag,
  ShieldAlert
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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderIdStr = resolvedParams.id;
  const orderId = parseInt(orderIdStr, 10);

  const router = useRouter();
  const { user } = useAuth();
  const pharmacyId = usePharmacy().id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; targetStatus: string }>({
    open: false,
    targetStatus: '',
  });

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch<Order>(`/api/pharmacy/orders/${orderId}`, {
        userId: user?.id,
      });
      setOrder(data);
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'Unable to load order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrderDetail();
  }, [orderId]);

  const handleTransition = async (targetStatus: string) => {
    setConfirmModal({ open: false, targetStatus: '' });
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
      const updated = await apiFetch<Order>(endpoint, {
        method: 'PATCH',
        userId: user?.id,
      });
      setOrder(updated);
      setMsg(`Order #${orderId} status successfully updated to ${targetStatus}!`);
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Conflict')) {
        setError(`This order cannot be moved to status ${targetStatus} from its current state.`);
      } else {
        setError(err.message || 'Unable to update order status.');
      }
    }
  };

  const steps = ['PLACED', 'PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED'];
  const normalizedOrderStatus = order?.status === 'CONFIRMED' || order?.status === 'PREPARING' ? 'PROCESSING' : order?.status;
  const currentStepIndex = normalizedOrderStatus ? steps.indexOf(normalizedOrderStatus) : -1;

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
              Are you sure you want to update Order <strong>#{orderId}</strong> to status{' '}
              <strong className="text-slate-900">{confirmModal.targetStatus}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ open: false, targetStatus: '' })}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleTransition(confirmModal.targetStatus)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Back button */}
      <div className="flex items-center justify-between">
        <Link
          href="/pharmacy/orders"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>

        <span className="text-xs font-bold text-slate-500">Order Reference #{orderId}</span>
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

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500">Loading order details...</div>
      ) : !order ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-lg font-bold text-slate-900">Order Not Found</h3>
          <p className="text-xs text-slate-500">The requested order does not exist or access was denied.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Pharmacy Order #{order.id}</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Amount</span>
                <strong className="text-2xl font-extrabold text-emerald-700">₹{order.totalAmount.toFixed(2)}</strong>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Order Status Timeline</h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                {steps.map((st, idx) => {
                  const isCompleted = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div
                      key={st}
                      className={`p-3 rounded-xl border text-xs transition ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-700 font-extrabold shadow-sm'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}
                    >
                      <div className="font-extrabold text-[11px]">{st}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Patient & Prescription Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Patient Info</span>
                <div className="text-sm font-bold text-slate-900">Patient #{order.patientId}</div>
                <div className="text-xs text-slate-500">Authorized for order fulfillment</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Doctor Prescription</span>
                <div className="text-sm font-bold text-teal-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Prescription #{order.prescriptionId}
                </div>
                <div className="text-[11px] text-slate-500">Read-Only Doctor Reference</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Delivery Address</span>
                <div className="text-xs font-semibold text-slate-800">{order.deliveryAddress}</div>
              </div>
            </div>

            {/* Prescribed Items Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Itemized Prescription Breakdown</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Medicine Name</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Unit Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((item, idx) => (
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
            </div>

            {/* Order Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                Authorized Pharmacy Action Portal
              </span>

              <div className="flex items-center gap-3">
                {order.status === 'PLACED' && (
                  <button
                    onClick={() => setConfirmModal({ open: true, targetStatus: 'PROCESSING' })}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
                  >
                    ✓ Accept and Process
                  </button>
                )}

                {['PROCESSING', 'CONFIRMED', 'PREPARING'].includes(order.status) && (
                  <button
                    onClick={() => setConfirmModal({ open: true, targetStatus: 'READY' })}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
                  >
                    ✓ Mark Ready for Pickup
                  </button>
                )}

                {order.status === 'READY' && (
                  <button
                    onClick={() => setConfirmModal({ open: true, targetStatus: 'DISPATCHED' })}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs"
                  >
                    ▶ Dispatch Order
                  </button>
                )}

                {order.status === 'DISPATCHED' && (
                  <button
                    onClick={() => setConfirmModal({ open: true, targetStatus: 'DELIVERED' })}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs"
                  >
                    ✓ Mark Delivered
                  </button>
                )}

                {['PLACED', 'PROCESSING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.status) && (
                  <button
                    onClick={() => setConfirmModal({ open: true, targetStatus: 'CANCELLED' })}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
