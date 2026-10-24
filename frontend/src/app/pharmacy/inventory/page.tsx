'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePharmacy } from '@/lib/pharmacy';
import { apiFetch } from '@/lib/api';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit,
  Building2
} from 'lucide-react';

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

export default function PharmacyInventoryPage() {
  const { user } = useAuth();
  const pharmacyId = usePharmacy().id;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Add / Edit Inventory Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formMedicineId, setFormMedicineId] = useState('');
  const [formMedicineName, setFormMedicineName] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formPrice, setFormPrice] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    setError('');

    try {
      if (!pharmacyId) return;
      const data = await apiFetch<InventoryItem[]>(`/api/pharmacy/inventory/${pharmacyId}`);
      setInventory(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setInventory([]);
      setError(err.message || 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [pharmacyId]);

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');
    setMsg('');

    const medId = parseInt(formMedicineId, 10);
    const qty = parseInt(formQuantity, 10);
    const priceVal = parseFloat(formPrice);

    // Frontend safety checks
    if (isNaN(medId) || medId <= 0) {
      setError('Please provide a valid numeric Medicine ID.');
      setFormLoading(false);
      return;
    }
    if (isNaN(qty) || qty < 0) {
      setError('Available quantity cannot be negative.');
      setFormLoading(false);
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      setError('Price cannot be negative.');
      setFormLoading(false);
      return;
    }
    if (!formMedicineName.trim()) {
      setError('Medicine name is required.');
      setFormLoading(false);
      return;
    }

    try {
      await apiFetch(`/api/pharmacy/inventory/${pharmacyId}`, {
        method: 'POST',
        userId: user?.id,
        body: JSON.stringify({
          medicineId: medId,
          medicineName: formMedicineName.trim(),
          availableQuantity: qty,
          price: priceVal,
        }),
      });

      setMsg(`Inventory updated for ${formMedicineName.trim()}!`);
      setModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setError(err.message || 'Unable to update inventory.');
    } finally {
      setFormLoading(false);
    }
  };

  const openAddModal = (existing?: InventoryItem) => {
    if (existing) {
      setFormMedicineId(existing.medicineId.toString());
      setFormMedicineName(existing.medicineName);
      setFormQuantity(existing.availableQuantity.toString());
      setFormPrice(existing.price.toString());
    } else {
      setFormMedicineId('');
      setFormMedicineName('');
      setFormQuantity('');
      setFormPrice('');
    }
    setModalOpen(true);
  };

  const filteredInventory = inventory.filter((i) =>
    i.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.medicineId.toString().includes(searchTerm)
  );

  const getStockBadge = (qty: number) => {
    if (qty === 0) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">OUT OF STOCK</span>;
    } else if (qty < 10) {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">LOW STOCK</span>;
    } else {
      return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">IN STOCK</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal for Add/Update Inventory */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add / Update Stock Item</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Medicine ID</label>
                <input
                  type="number"
                  required
                  value={formMedicineId}
                  onChange={(e) => setFormMedicineId(e.target.value)}
                  placeholder="e.g. 1"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Medicine Name</label>
                <input
                  type="text"
                  required
                  value={formMedicineName}
                  onChange={(e) => setFormMedicineName(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Available Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Unit Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pharmacy Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track available medicine stocks, reserved quantities, and unit pricing.
          </p>
        </div>

        <button
          onClick={() => openAddModal()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add / Update Medicine
        </button>
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

      {/* Controls Bar: Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine by name or ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Total SKUs in stock: <strong className="text-slate-900">{inventory.length}</strong>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading inventory catalog...</div>
        ) : filteredInventory.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
            <div className="text-2xl">💊</div>
            <div className="text-sm font-bold text-slate-700">No Inventory Items Found</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              No stock items match your search. Click &apos;Add / Update Medicine&apos; to register new inventory.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Medicine ID</th>
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Available Stock</th>
                  <th className="p-3">Reserved Stock</th>
                  <th className="p-3">Unit Price</th>
                  <th className="p-3">Stock Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">#{item.medicineId}</td>
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <Link
                        href={`/pharmacy/inventory/${item.id}`}
                        className="hover:text-emerald-600 transition"
                      >
                        {item.medicineName}
                      </Link>
                    </td>
                    <td className="p-3 font-extrabold text-slate-900">{item.availableQuantity} units</td>
                    <td className="p-3 text-slate-500">{item.reservedQuantity || 0} units</td>
                    <td className="p-3 font-bold text-emerald-700">₹{item.price.toFixed(2)}</td>
                    <td className="p-3">{getStockBadge(item.availableQuantity)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openAddModal(item)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit Stock
                      </button>
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
