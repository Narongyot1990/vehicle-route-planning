"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Customer, Route } from "@/lib/types";
import { getStopColor } from "@/features/gantt/types/job";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";

type StopForm = {
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  dwellHours: number;
  transitHours: number;
};

const DEFAULT_STOP: StopForm = {
  label: "",
  address: "",
  contactName: "",
  contactPhone: "",
  dwellHours: 0,
  transitHours: 0,
};

function RoutesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterCustomerId = searchParams.get("customerId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(filterCustomerId);
  const [routeName, setRouteName] = useState("");
  const [routeDesc, setRouteDesc] = useState("");
  const [requiredVehicleTypes, setRequiredVehicleTypes] = useState<string[]>([]);
  const [hasReturnTrip, setHasReturnTrip] = useState(false);
  const [returnLabel, setReturnLabel] = useState("");
  const [returnAddress, setReturnAddress] = useState("");
  const [returnDwellHours, setReturnDwellHours] = useState(0);
  const [returnTransitHours, setReturnTransitHours] = useState(0);
  const [stops, setStops] = useState<StopForm[]>([{ ...DEFAULT_STOP, label: "Pickup" }]);

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((response) => response.json()),
      filterCustomerId
        ? fetch(`/api/routes?customerId=${filterCustomerId}`).then((response) => response.json())
        : fetch("/api/routes").then((response) => response.json()),
    ])
      .then(([customersData, routesData]) => {
        if (Array.isArray(customersData)) {
          setCustomers(customersData);
        }

        if (Array.isArray(routesData)) {
          setRoutes(routesData);
        }
      })
      .catch(() => setError("Unable to load routes"))
      .finally(() => setLoading(false));
  }, [filterCustomerId]);

  const totalHours = useMemo(
    () => stops.reduce((sum, stop) => sum + (stop.dwellHours || 0) + (stop.transitHours || 0), 0),
    [stops]
  );

  const getCustomerName = (customerId: string) =>
    customers.find((customer) => customer.id === customerId)?.name ?? customerId;

  const toggleVehicleType = (vehicleType: string) => {
    setRequiredVehicleTypes((current) =>
      current.includes(vehicleType)
        ? current.filter((value) => value !== vehicleType)
        : [...current, vehicleType]
    );
  };

  const resetEditor = () => {
    setShowEditor(false);
    setEditingRouteId(null);
    setRouteName("");
    setRouteDesc("");
    setRequiredVehicleTypes([]);
    setHasReturnTrip(false);
    setReturnLabel("");
    setReturnAddress("");
    setReturnDwellHours(0);
    setReturnTransitHours(0);
    setStops([{ ...DEFAULT_STOP, label: "Pickup" }]);
    setSaveError(null);
    if (!filterCustomerId) {
      setSelectedCustomerId("");
    }
  };

  const addStop = () => setStops((current) => [...current, { ...DEFAULT_STOP }]);
  const removeStop = (index: number) => setStops((current) => current.filter((_, currentIndex) => currentIndex !== index));
  const updateStop = (index: number, field: keyof StopForm, value: string | number) =>
    setStops((current) =>
      current.map((stop, currentIndex) => (currentIndex === index ? { ...stop, [field]: value } : stop))
    );

  const openCreate = () => {
    resetEditor();
    setShowEditor(true);
    if (filterCustomerId) {
      setSelectedCustomerId(filterCustomerId);
    }
  };

  const openEdit = (route: Route) => {
    setShowEditor(true);
    setEditingRouteId(route.id);
    setSelectedCustomerId(route.customerId);
    setRouteName(route.name);
    setRouteDesc(route.description ?? "");
    setRequiredVehicleTypes(route.requiredVehicleTypes ?? []);
    setHasReturnTrip(Boolean(route.returnInfo?.enabled));
    setReturnLabel(route.returnInfo?.label ?? "");
    setReturnAddress(route.returnInfo?.address ?? "");
    setReturnDwellHours(route.returnInfo?.dwellHours ?? 0);
    setReturnTransitHours(route.returnInfo?.transitHours ?? 0);
    setStops(
      route.stops.length
        ? route.stops.map((stop) => ({
            label: stop.label,
            address: stop.address,
            contactName: stop.contactName,
            contactPhone: stop.contactPhone,
            dwellHours: stop.dwellHours,
            transitHours: stop.transitHours,
          }))
        : [{ ...DEFAULT_STOP, label: "Pickup" }]
    );
    setSaveError(null);
  };

  const handleSaveRoute = useCallback(async () => {
    if (!selectedCustomerId) return setSaveError("Customer is required");
    if (!routeName.trim()) return setSaveError("Route name is required");
    if (stops.some((stop) => !stop.label.trim() || !stop.address.trim())) {
      return setSaveError("Every stop needs a name and address");
    }
    if (hasReturnTrip && (!returnLabel.trim() || !returnAddress.trim())) {
      return setSaveError("Return trip needs label and address");
    }

    setSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/routes", {
        method: editingRouteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRouteId ?? undefined,
          customerId: selectedCustomerId,
          name: routeName.trim(),
          description: routeDesc.trim(),
          requiredVehicleTypes,
          returnInfo: hasReturnTrip
            ? {
                enabled: true,
                label: returnLabel.trim(),
                address: returnAddress.trim(),
                dwellHours: returnDwellHours,
                transitHours: returnTransitHours,
              }
            : undefined,
          stops: stops.map((stop, index) => ({ ...stop, order: index + 1 })),
          totalDurationHours: totalHours,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to save route");
      }

      const savedRoute = await response.json();
      setRoutes((current) =>
        editingRouteId
          ? current.map((route) => (route.id === savedRoute.id ? savedRoute : route))
          : [savedRoute, ...current]
      );
      resetEditor();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save route");
    } finally {
      setSaving(false);
    }
  }, [
    editingRouteId,
    hasReturnTrip,
    requiredVehicleTypes,
    returnAddress,
    returnDwellHours,
    returnLabel,
    returnTransitHours,
    routeDesc,
    routeName,
    selectedCustomerId,
    stops,
    totalHours,
  ]);

  const handleDelete = async (routeId: string, routeDisplayName: string) => {
    if (!confirm(`Delete route "${routeDisplayName}"?`)) {
      return;
    }

    await fetch(`/api/routes?id=${routeId}`, { method: "DELETE" });
    setRoutes((current) => current.filter((route) => route.id !== routeId));
  };

  return (
    <div className="routes-v2">
      <div className="routes-v2__shell">
        <header className="routes-v2__header">
          <div className="routes-v2__header-main">
            <button
              type="button"
              className="routes-v2__icon-button"
              onClick={() => router.push(filterCustomerId ? `/customers/${filterCustomerId}` : "/customers")}
            >
              <span>Back</span>
            </button>
            <div>
              <h1>{filterCustomerId ? getCustomerName(filterCustomerId) : "Route Library"}</h1>
            </div>
          </div>
          <button type="button" className="routes-v2__primary-button" onClick={openCreate}>
            <span>New</span>
          </button>
        </header>

        {error ? <div className="routes-v2__error">{error}</div> : null}

        {showEditor ? (
          <section className="routes-v2__editor">
            <div className="routes-v2__editor-head">
              <div>
                <h2>{editingRouteId ? "Edit Route" : "New Route"}</h2>
              </div>
              <div className="routes-v2__editor-meta">
                <span>{stops.length} stops</span>
                <span>{totalHours}h</span>
              </div>
            </div>

            <div className="routes-v2__grid">
              {!filterCustomerId ? (
                <label className="routes-v2__field">
                  <span>Customer *</span>
                  <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="routes-v2__badge-row">
                  <span className="routes-v2__solid-badge">{getCustomerName(filterCustomerId)}</span>
                </div>
              )}

              <label className="routes-v2__field">
                <span>Name *</span>
                <input value={routeName} onChange={(event) => setRouteName(event.target.value)} placeholder="Route name" autoFocus />
              </label>

              <label className="routes-v2__field routes-v2__field--wide">
                <span>Description</span>
                <input value={routeDesc} onChange={(event) => setRouteDesc(event.target.value)} placeholder="Optional" />
              </label>
            </div>

            <div className="routes-v2__vehicle-types">
              {TRUCK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`routes-v2__type-chip${requiredVehicleTypes.includes(option) ? " is-active" : ""}`}
                  onClick={() => toggleVehicleType(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="routes-v2__toggle-row">
              <label className="routes-v2__toggle">
                <input type="checkbox" checked={hasReturnTrip} onChange={(event) => setHasReturnTrip(event.target.checked)} />
                <span>Return trip</span>
              </label>
              {hasReturnTrip ? (
                <div className="routes-v2__grid">
                  <label className="routes-v2__field">
                    <span>Return label</span>
                    <input value={returnLabel} onChange={(event) => setReturnLabel(event.target.value)} placeholder="Return label" />
                  </label>
                  <label className="routes-v2__field">
                    <span>Return address</span>
                    <input value={returnAddress} onChange={(event) => setReturnAddress(event.target.value)} placeholder="Return address" />
                  </label>
                  <label className="routes-v2__field">
                    <span>Dwell</span>
                    <input type="number" min="0" step="0.25" value={returnDwellHours} onChange={(event) => setReturnDwellHours(parseFloat(event.target.value) || 0)} />
                  </label>
                  <label className="routes-v2__field">
                    <span>Transit</span>
                    <input type="number" min="0" step="0.25" value={returnTransitHours} onChange={(event) => setReturnTransitHours(parseFloat(event.target.value) || 0)} />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="routes-v2__stops">
              {stops.map((stop, index) => (
                <div key={index} className="routes-v2__stop-card">
                  <div className="routes-v2__stop-head">
                    <span style={{ color: getStopColor(stop.label, index) }}>Stop {index + 1}</span>
                    {stops.length > 1 ? (
                      <button type="button" className="routes-v2__text-button routes-v2__text-button--danger" onClick={() => removeStop(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="routes-v2__grid">
                    <label className="routes-v2__field">
                      <span>Label *</span>
                      <input value={stop.label} onChange={(event) => updateStop(index, "label", event.target.value)} placeholder="Name" />
                    </label>
                    <label className="routes-v2__field">
                      <span>Address *</span>
                      <input value={stop.address} onChange={(event) => updateStop(index, "address", event.target.value)} placeholder="Address" />
                    </label>
                    <label className="routes-v2__field">
                      <span>Dwell</span>
                      <input type="number" min="0" step="0.25" value={stop.dwellHours} onChange={(event) => updateStop(index, "dwellHours", parseFloat(event.target.value) || 0)} />
                    </label>
                    <label className="routes-v2__field">
                      <span>Transit</span>
                      <input type="number" min="0" step="0.25" value={stop.transitHours} onChange={(event) => updateStop(index, "transitHours", parseFloat(event.target.value) || 0)} />
                    </label>
                  </div>
                </div>
              ))}
              <button type="button" className="routes-v2__secondary-button" onClick={addStop}>
                Add Stop
              </button>
            </div>

            <div className="routes-v2__editor-footer">
              {saveError ? <div className="routes-v2__error">{saveError}</div> : null}
              <div className="routes-v2__footer-actions">
                <button type="button" className="routes-v2__ghost-button" onClick={resetEditor}>
                  Cancel
                </button>
                <button type="button" className="routes-v2__primary-button" onClick={handleSaveRoute} disabled={saving}>
                  <span>{saving ? "Saving..." : editingRouteId ? "Update" : "Create"}</span>
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {loading ? (
          <div className="routes-v2__loading">Loading routes...</div>
        ) : routes.length === 0 ? (
          <div className="routes-v2__empty">
            <span>No routes</span>
            <button type="button" className="routes-v2__text-button" onClick={openCreate}>
              Create
            </button>
          </div>
        ) : (
          <div className="routes-v2__list">
            {routes.map((route) => (
              <article key={route.id} className="routes-v2__route-card">
                <div className="routes-v2__route-main">
                  <div className="routes-v2__route-head">
                    <div>
                      <h3>{route.name}</h3>
                      {!filterCustomerId ? <span>{getCustomerName(route.customerId)}</span> : null}
                    </div>
                    <div className="routes-v2__card-actions">
                      <button type="button" className="routes-v2__icon-button" onClick={() => openEdit(route)}>
                        <span>Edit</span>
                      </button>
                      <button type="button" className="routes-v2__icon-button routes-v2__icon-button--danger" onClick={() => handleDelete(route.id, route.name)}>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="routes-v2__badge-row">
                    <span className="routes-v2__soft-badge">{route.stops.length} stops</span>
                    <span className="routes-v2__soft-badge">{route.totalDurationHours}h</span>
                    {(route.requiredVehicleTypes ?? []).map((vehicleType) => (
                      <span key={vehicleType} className="routes-v2__soft-badge routes-v2__soft-badge--accent">
                        {vehicleType}
                      </span>
                    ))}
                    {route.returnInfo?.enabled ? <span className="routes-v2__soft-badge routes-v2__soft-badge--success">Return</span> : null}
                  </div>

                  <div className="routes-v2__stops-row">
                    {route.stops.map((stop, index) => {
                      const color = getStopColor(stop.label, index);
                      return (
                        <span key={`${stop.label}-${index}`} className="routes-v2__stop-pill" style={{ borderColor: `${color}55`, color, background: `${color}15` }}>
                          {index + 1}. {stop.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoutesPageImpl() {
  return (
    <Suspense fallback={<div className="routes-v2"><div className="routes-v2__shell"><div className="routes-v2__loading">Loading routes...</div></div></div>}>
      <RoutesPageInner />
    </Suspense>
  );
}
