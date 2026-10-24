'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePharmacy } from '@/lib/pharmacy';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Package, AlertTriangle, CheckCircle2, Building2 } from 'lucide-react';

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

export default function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const itemIdStr = resolvedParams.id;
  const itemId = parseInt(itemIdStr, 10);

  const { user } = useAuth();
  const pharmacyId = usePharmacy().id;

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Stock update form
  const [quantityInput, setQuantityInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchItem = async () => {
    setLoading(true);
    try {
      if (!pharmacyId) return;
      const items = await apiFetch<InventoryItem[]>(`/api/pharmacy/inventory/${pharmacyId}`);
      const found = items.find((i) => i.id === itemId);
      if (found) {
        setItem(found);
        setQuantityInput(found.availableQuantity.toString());
        setPriceInput(found.price.toString());
      } else {
        throw new Error('Item not found');
      }
    } catch (err: any) {
      setItem(null);
      setError(err.message || 'Unable to load inventory item.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (itemId) fetchItem();
  }, [itemId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setSaving(true);
    setError('');
    setMsg('');

    const qty = parseInt(quantityInput, 10);
    const priceVal = parseFloat(priceInput);

    if (isNaN(qty) || qty < 0) {
      setError('Available quantity cannot be negative.');
      setSaving(false);
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      setError('Price cannot be negative.');
      setSaving(false);
      return;
    }

    try {
      await apiFetch(`/api/pharmacy/inventory/${pharmacyId}`, {
        method: 'POST',
        userId: user?.id,
        body: JSON.stringify({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          availableQuantity: qty,
          price: priceVal,
        }),
      });

      setMsg(`Stock updated successfully for ${item.medicineName}!`);
      fetchItem();
    } catch (err: any) {
      setError(err.message || 'Unable to update inventory item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/pharmacy/inventory"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </Link>
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
        <div className="py-16 text-center text-xs text-slate-500">Loading item details...</div>
      ) : !item ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="text-4xl">💊</div>
          <h3 className="text-lg font-bold text-slate-900">Medicine Item Not Found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{item.medicineName}</h1>
              <p className="text-xs text-slate-500 mt-0.5">Medicine Catalog ID: #{item.medicineId}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Unit Price</span>
              <strong className="text-2xl font-extrabold text-emerald-700">₹{item.price.toFixed(2)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Available Stock</span>
              <div className="text-2xl font-extrabold text-slate-900">{item.availableQuantity} units</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Reserved for Orders</span>
              <div className="text-2xl font-extrabold text-slate-500">{item.reservedQuantity || 0} units</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Status</span>
              <div className="text-sm font-bold text-emerald-700 mt-1">Active Catalog Item</div>
            </div>
          </div>

          {/* Quick Adjustment Form */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Adjust Stock & Pricing</h3>
            <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700">Available Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Unit Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50 transition"
                >
                  {saving ? 'Updating...' : 'Update Stock Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
