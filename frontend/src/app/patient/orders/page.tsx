"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { ShoppingBag, Plus, Clock, CheckCircle2, AlertCircle, X, ShieldCheck, MapPin, Navigation } from "lucide-react";

interface Pharmacy {
  id: number;
  name: string;
  licenseNumber: string;
  address?: string;
  phone?: string;
  status: string;
}

interface PrescriptionSummary {
  id: number;
  status: string;
}

interface PrescriptionItem {
  id: number;
  medicineName: string;
  dosageValue?: string;
  dosageUnit?: string;
}

interface PrescriptionDetails extends PrescriptionSummary {
  items: PrescriptionItem[];
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
  status: "PLACED" | "PROCESSING" | "READY" | "DISPATCHED" | "DELIVERED" | "CANCELLED" | "CONFIRMED" | "PREPARING";
  totalAmount: number;
  deliveryAddress: string;
  items: OrderItem[];
  createdAt: string;
}

interface NearbyPharmacy {
  id: string;
  name: string;
  address?: string;
  distanceMeters: number;
  openStatus: "OPEN" | "CLOSED" | "UNKNOWN";
  latitude: number;
  longitude: number;
}

export default function PatientOrdersPage() {
  const { user } = useAuth();
  const patientId = user?.id;

  const [orders, setOrders] = useState<Order[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true);
  const [pharmaciesError, setPharmaciesError] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [inventoryLoadedPharmacyId, setInventoryLoadedPharmacyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<NearbyPharmacy[]>([]);
  const [nearbySearchComplete, setNearbySearchComplete] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // New Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState("");
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [medId, setMedId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (!patientId) return;
      const [orderData, prescriptionData] = await Promise.all([
        apiFetch<Order[]>("/api/pharmacy/orders/patient", { userId: patientId }),
        apiFetch<PrescriptionSummary[]>(`/api/prescriptions/patient/${patientId}`, { userId: patientId }),
      ]);
      setOrders(Array.isArray(orderData) ? orderData : []);
      const finalizedPrescriptions = Array.isArray(prescriptionData)
        ? prescriptionData.filter((prescription) => prescription.status === "FINALIZED")
        : [];
      setPrescriptions(finalizedPrescriptions);
      if (finalizedPrescriptions.length > 0) {
        setPrescriptionId((current) => current || String(finalizedPrescriptions[0].id));
      }
    } catch (err: any) {
      console.error("Failed to fetch pharmacy data", err);
      setError("Unable to connect to Pharmacy Service. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    setPharmaciesLoading(true);
    setPharmaciesError("");
    apiFetch<Pharmacy[]>("/api/pharmacy/pharmacies", { userId: patientId })
      .then((data) => { if (active) setPharmacies(Array.isArray(data) ? data : []); })
      .catch(() => {
        if (active) {
          setPharmacies([]);
          setPharmaciesError("Unable to load pharmacies. Please retry.");
        }
      })
      .finally(() => { if (active) setPharmaciesLoading(false); });
    return () => { active = false; };
  }, [patientId]);

  useEffect(() => {
    if (!showCreateModal || !patientId || !prescriptionId) {
      setPrescriptionItems([]);
      return;
    }
    let active = true;
    apiFetch<PrescriptionDetails>(`/api/prescriptions/${prescriptionId}`, { userId: patientId })
      .then((data) => { if (active) setPrescriptionItems(Array.isArray(data.items) ? data.items : []); })
      .catch(() => { if (active) setPrescriptionItems([]); });
    return () => { active = false; };
  }, [showCreateModal, patientId, prescriptionId]);

  useEffect(() => {
    if (!showCreateModal || !patientId || !selectedPharmacyId) {
      setInventory([]);
      setInventoryLoading(false);
      setInventoryError("");
      setInventoryLoadedPharmacyId("");
      return;
    }
    let active = true;
    setInventory([]);
    setInventoryLoading(true);
    setInventoryError("");
    setInventoryLoadedPharmacyId("");
    apiFetch<InventoryItem[]>(`/api/pharmacy/inventory/${selectedPharmacyId}`, { userId: patientId })
      .then((data) => { if (active) setInventory(Array.isArray(data) ? data : []); })
      .catch((cause) => { if (active) { setInventory([]); setInventoryError(cause instanceof Error ? cause.message : 'Unable to check pharmacy inventory.'); } })
      .finally(() => { if (active) { setInventoryLoading(false); setInventoryLoadedPharmacyId(selectedPharmacyId); } });
    return () => { active = false; };
  }, [showCreateModal, patientId, selectedPharmacyId]);

  const normalizedMedicineName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const availablePrescriptionInventory = inventory.filter((stock) => stock.active && stock.availableQuantity > 0 &&
    prescriptionItems.some((item) => {
      const prescribed = normalizedMedicineName(item.medicineName || '');
      const stocked = normalizedMedicineName(stock.medicineName || '');
      return prescribed && stocked && (prescribed === stocked || prescribed.startsWith(stocked) || stocked.startsWith(prescribed));
    }));
  const chosenInventory = availablePrescriptionInventory.find((item) => String(item.medicineId) === medId);

  const openCreateModal = () => {
    setSelectedPharmacyId("");
    setInventory([]);
    setInventoryLoadedPharmacyId("");
    setMedId("");
    setQuantity("");
    setError("");
    setShowCreateModal(true);
  };

  const handleFindNearbyPharmacies = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is not supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");
    setNearbySearchComplete(false);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const results = await apiFetch<NearbyPharmacy[]>(
            `/api/pharmacy/nearby?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`,
            { userId: patientId },
          );
          setNearbyPharmacies(Array.isArray(results) ? results : []);
          setNearbySearchComplete(true);
        } catch (err: any) {
          setNearbyPharmacies([]);
          setLocationError(err?.message || "Unable to find nearby pharmacies.");
        } finally {
          setLocating(false);
        }
      },
      (positionError) => {
        setLocating(false);
        setNearbyPharmacies([]);
        setLocationError(
          positionError.code === 1
            ? "Location permission was denied. Allow location access and try again."
            : "Unable to read your location. Please try again.",
        );
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10000 },
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      setError('You must be signed in to place an order.');
      return;
    }
    if (!prescriptionId || !selectedPharmacyId || !deliveryAddress || !medId || !quantity) {
      setError("Choose a prescription, pharmacy, in-stock medicine, quantity, and delivery address.");
      return;
    }
    if (!chosenInventory || !Number.isInteger(Number(quantity)) || Number(quantity) < 1
        || Number(quantity) > chosenInventory.availableQuantity) {
      setError("That quantity is no longer available. Check inventory and try again.");
      return;
    }

    setPlacing(true);
    setMsg("");
    setError("");

    try {
      const newOrder = await apiFetch<Order>("/api/pharmacy/orders", {
        method: "POST",
        userId: patientId,
        body: JSON.stringify({
          prescriptionId: parseInt(prescriptionId, 10),
          pharmacyId: parseInt(selectedPharmacyId, 10),
          deliveryAddress,
          items: [
            {
              medicineId: parseInt(medId, 10),
              medicineName: chosenInventory.medicineName,
              quantity: parseInt(quantity, 10),
            },
          ],
        }),
      });

      setMsg(`Order #${newOrder.id} placed. ${newOrder.pharmacyName || "The pharmacy"} can now process it.`);
      setShowCreateModal(false);
      setPrescriptionId("");
      setMedId("");
      setQuantity("");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to place order. Check prescription and inventory.");
    } finally {
      setPlacing(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await apiFetch(`/api/pharmacy/orders/${orderId}/cancel`, {
        method: "PATCH",
        userId: patientId,
      });
      setMsg(`Order #${orderId} cancelled.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to cancel order.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-600" />
            Pharmacy Orders & Fulfillment
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Order prescribed medicines from partner rural pharmacies and track delivery status.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Place Order from Prescription
        </button>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold p-4 rounded-2xl flex justify-between items-center">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-slate-500 hover:underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold p-4 rounded-2xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-slate-500 hover:underline">Dismiss</button>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4" data-testid="nearby-pharmacies">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" /> Nearby pharmacies
            </h2>
            <p className="text-xs text-slate-500 mt-1">Find open pharmacies around your current location.</p>
          </div>
          <button
            type="button"
            onClick={handleFindNearbyPharmacies}
            disabled={locating}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2"
            data-testid="use-current-location"
          >
            <Navigation className="w-4 h-4" />
            {locating ? "Finding pharmacies..." : "Use My Current Location"}
          </button>
        </div>

        {locationError && (
          <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3" role="alert" data-testid="location-error">
            {locationError}
          </p>
        )}

        {nearbyPharmacies.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2" data-testid="nearby-results">
            {nearbyPharmacies.map((pharmacy) => (
              <article key={pharmacy.id} className="border border-slate-200 rounded-2xl p-4 space-y-2" data-testid="nearby-result">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-bold text-slate-900">{pharmacy.name}</h3>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${
                    pharmacy.openStatus === "OPEN" ? "bg-emerald-50 text-emerald-700" :
                    pharmacy.openStatus === "CLOSED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {pharmacy.openStatus === "UNKNOWN" ? "Hours unavailable" : pharmacy.openStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{pharmacy.address || "Address unavailable"}</p>
                <p className="text-xs text-slate-500">{(pharmacy.distanceMeters / 1000).toFixed(1)} km away</p>
                <p className="text-xs text-slate-500">Location: {pharmacy.latitude.toFixed(5)}, {pharmacy.longitude.toFixed(5)}</p>
                <a
                  className="text-xs font-bold text-amber-700 hover:underline"
                  href={`https://www.google.com/maps/search/?api=1&query=${pharmacy.latitude},${pharmacy.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View location
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500" data-testid="nearby-empty">
            {locating ? "Reading your location..." : nearbySearchComplete ? "No pharmacies found near your location." : "Use your current location to search for nearby pharmacies."}
          </p>
        )}
      </section>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          <div className="animate-pulse h-32 bg-slate-100 rounded-3xl" />
          <div className="animate-pulse h-32 bg-slate-100 rounded-3xl" />
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Order #{o.id}</h3>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      o.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      o.status === "CANCELLED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse"
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Pharmacy #{o.pharmacyId} &bull; Rx ID: #{o.prescriptionId} &bull; Date: {new Date(o.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Amount</div>
                  <div className="text-lg font-extrabold text-amber-700">₹{o.totalAmount}</div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                <div className={`p-1.5 rounded-xl ${o.status !== "CANCELLED" ? "bg-emerald-100 text-emerald-800" : "text-slate-400"}`}>
                  1. PLACED
                </div>
                <div className={`p-1.5 rounded-xl ${["PROCESSING", "CONFIRMED", "PREPARING", "READY", "DISPATCHED", "DELIVERED"].includes(o.status) ? "bg-emerald-100 text-emerald-800" : "text-slate-400"}`}>
                  2. PROCESSING
                </div>
                <div className={`p-1.5 rounded-xl ${["READY", "DISPATCHED", "DELIVERED"].includes(o.status) ? "bg-emerald-100 text-emerald-800" : "text-slate-400"}`}>
                  3. READY
                </div>
                <div className={`p-1.5 rounded-xl ${["DISPATCHED", "DELIVERED"].includes(o.status) ? "bg-emerald-100 text-emerald-800" : "text-slate-400"}`}>
                  4. DISPATCHED
                </div>
                <div className={`p-1.5 rounded-xl ${o.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800" : "text-slate-400"}`}>
                  5. DELIVERED
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-slate-600 pt-2 gap-2">
                <div>Delivery Address: <strong className="text-slate-900">{o.deliveryAddress}</strong></div>
                {["PLACED", "PROCESSING", "CONFIRMED", "PREPARING", "READY"].includes(o.status) && (
                  <button
                    onClick={() => handleCancelOrder(o.id)}
                    className="bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-xl transition"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">No pharmacy orders found.</p>
          <p className="text-xs text-slate-500">Order prescribed medications from a partner pharmacy above.</p>
        </div>
      )}

      {/* Place Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl relative">
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" /> Place Pharmacy Order
            </h3>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2" data-testid="nearby-pharmacies-in-order">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-slate-800 text-sm">Pharmacies near your location</h4>
                <button
                  type="button"
                  onClick={handleFindNearbyPharmacies}
                  disabled={locating}
                  className="text-xs font-bold text-amber-700 hover:underline disabled:text-slate-400"
                >
                  {locating ? "Finding..." : nearbySearchComplete ? "Refresh location" : "Use My Current Location"}
                </button>
              </div>
              {locationError && <p className="text-xs text-rose-700" role="alert">{locationError}</p>}
              {nearbySearchComplete && nearbyPharmacies.length === 0 && (
                <p className="text-xs text-slate-600">No pharmacies found near your location.</p>
              )}
              {nearbyPharmacies.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1.5" data-testid="nearby-order-list">
                  {nearbyPharmacies.map((pharmacy) => (
                    <div key={pharmacy.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">{pharmacy.name}</span>
                        <span className="shrink-0 text-slate-500">{(pharmacy.distanceMeters / 1000).toFixed(1)} km</span>
                      </div>
                      {pharmacy.address && <p className="text-slate-500">{pharmacy.address}</p>}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500">Nearby map listings do not include live stock. Select a registered pharmacy below to place an order.</p>
            </section>

            <form onSubmit={handlePlaceOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Finalized Prescription *</label>
                <select
                  required
                  value={prescriptionId}
                  onChange={(e) => { setPrescriptionId(e.target.value); setPrescriptionItems([]); setMedId(""); setQuantity(""); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  <option value="">Select your prescription</option>
                  {prescriptions.map((prescription) => (
                    <option key={prescription.id} value={prescription.id}>Prescription #{prescription.id}</option>
                  ))}
                </select>
                {prescriptions.length === 0 && <p className="mt-1 text-rose-700">A finalized doctor prescription is required to order medicine.</p>}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Registered Pharmacy *</label>
                <select
                  required
                  value={selectedPharmacyId}
                  onChange={(e) => { setSelectedPharmacyId(e.target.value); setInventory([]); setMedId(""); setQuantity(""); }}
                  disabled={pharmaciesLoading}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold"
                >
                  <option value="">{pharmaciesLoading ? "Loading pharmacies..." : "Select Pharmacy"}</option>
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.licenseNumber})</option>
                  ))}
                </select>
                {pharmaciesError && <p className="mt-1 text-rose-700">{pharmaciesError}</p>}
                {!pharmaciesLoading && !pharmaciesError && pharmacies.length === 0 && (
                  <p className="mt-1 text-slate-600">No pharmacies are currently available.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prescribed medicine in stock *</label>
                  <select
                    required
                    value={medId}
                    onChange={(e) => setMedId(e.target.value)}
                    disabled={!selectedPharmacyId || inventoryLoading || prescriptionItems.length === 0}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  >
                    <option value="">{!selectedPharmacyId ? "Select a pharmacy first" : inventoryLoading ? "Checking inventory…" : "Select in-stock medicine"}</option>
                    {availablePrescriptionInventory.map((stock) => (
                      <option key={stock.medicineId} value={stock.medicineId}>
                        {stock.medicineName} · {stock.availableQuantity} available · ₹{stock.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {inventoryError && <p className="mt-1 text-rose-700">{inventoryError}</p>}
                  {selectedPharmacyId && inventoryLoadedPharmacyId === selectedPharmacyId && !inventoryLoading && !inventoryError && prescriptionId && prescriptionItems.length > 0 && availablePrescriptionInventory.length === 0 && (
                    <p className="mt-1 text-rose-700">No prescribed medicines from this prescription are currently available at this pharmacy.</p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    max={chosenInventory?.availableQuantity || undefined}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                  />
                </div>
              </div>

              {chosenInventory && <p className="text-slate-600">Current database price: <strong>₹{chosenInventory.price.toFixed(2)}</strong> each. The server checks and reserves stock when you place the order.</p>}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Address *</label>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={placing}
                  className="px-6 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
                >
                  {placing ? "Placing..." : "Confirm Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
