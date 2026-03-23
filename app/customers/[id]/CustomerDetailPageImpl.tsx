"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

export default function CustomerDetailPageImpl() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    fetch(`/api/customers?id=${id}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }

        setCustomer(data);
        setName(data.name ?? "");
        setAddress(data.address ?? "");
        setPhone(data.phone ?? "");
        setContactName(data.contactName ?? "");
      })
      .catch(() => setError("Unable to load customer"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!name.trim()) {
        setError("Customer name is required");
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/customers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            name: name.trim(),
            address: address.trim(),
            phone: phone.trim(),
            contactName: contactName.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Failed to update customer");
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update customer");
      } finally {
        setSaving(false);
      }
    },
    [address, contactName, id, name, phone]
  );

  const handleDelete = useCallback(async () => {
    if (!confirm(`Delete customer "${customer?.name}"?`)) {
      return;
    }

    setDeleting(true);

    try {
      await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
      router.push("/customers");
    } catch {
      setError("Failed to delete customer");
      setDeleting(false);
    }
  }, [customer?.name, id, router]);

  if (loading) {
    return (
      <div className="customer-detail-v2">
        <div className="customer-detail-v2__shell">
          <div className="customer-detail-v2__state">Loading customer...</div>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="customer-detail-v2">
        <div className="customer-detail-v2__shell">
          <div className="customer-detail-v2__error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-detail-v2">
      <div className="customer-detail-v2__shell">
        <header className="customer-detail-v2__header">
          <div className="customer-detail-v2__header-main">
            <button type="button" className="customer-detail-v2__icon-button" onClick={() => router.push("/customers")}>
              <span>Back</span>
            </button>
            <div>
              <span className="customer-detail-v2__eyebrow">Customer</span>
              <h1>{customer?.name || "Customer"}</h1>
            </div>
          </div>
          <div className="customer-detail-v2__header-actions">
            {saved ? (
              <span className="customer-detail-v2__saved">
                <span>Saved</span>
              </span>
            ) : null}
            <button type="button" className="customer-detail-v2__ghost" onClick={() => router.push(`/routes?customerId=${id}`)}>
              Routes
            </button>
          </div>
        </header>

        <form className="customer-detail-v2__form" onSubmit={handleSave}>
          <div className="customer-detail-v2__grid">
            <label className="customer-detail-v2__field customer-detail-v2__field--wide">
              <span>Name *</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="customer-detail-v2__field">
              <span>Phone</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label className="customer-detail-v2__field">
              <span>Contact</span>
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </label>
            <label className="customer-detail-v2__field customer-detail-v2__field--wide">
              <span>Address</span>
              <textarea rows={4} value={address} onChange={(event) => setAddress(event.target.value)} />
            </label>
          </div>

          <div className="customer-detail-v2__footer">
            {error ? <div className="customer-detail-v2__error">{error}</div> : <div className="customer-detail-v2__hint">Minimal profile. Routes stay one click away.</div>}
            <div className="customer-detail-v2__actions">
              <button type="button" className="customer-detail-v2__danger" onClick={handleDelete} disabled={deleting}>
                <span>{deleting ? "Deleting..." : "Delete"}</span>
              </button>
              <button type="submit" className="customer-detail-v2__primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
