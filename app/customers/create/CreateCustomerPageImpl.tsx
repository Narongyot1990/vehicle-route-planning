"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateCustomerPageImpl() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");

  const canSubmit = Boolean(name.trim());

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!name.trim()) {
        setError("Customer name is required");
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const response = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            address: address.trim(),
            phone: phone.trim(),
            contactName: contactName.trim(),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "Failed to create customer");
        }

        setSuccess(true);
        setTimeout(() => router.push("/customers"), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create customer");
      } finally {
        setSubmitting(false);
      }
    },
    [address, contactName, name, phone, router]
  );

  if (success) {
    return (
      <div className="entity-create entity-create--success">
        <div className="entity-create__success-card">
          <div className="entity-create__success-icon">
            <span>OK</span>
          </div>
          <h1>Customer created</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="entity-create">
      <div className="entity-create__shell">
        <header className="entity-create__header">
          <div className="entity-create__title-row">
            <button type="button" className="entity-create__icon-button" onClick={() => router.push("/customers")}>
              <span>Back</span>
            </button>
            <div>
              <span className="entity-create__eyebrow">Customer</span>
              <h1>Create Customer</h1>
            </div>
          </div>
        </header>

        <form className="entity-create__form" onSubmit={handleSubmit}>
          <div className="entity-create__grid">
            <label className="entity-create__field entity-create__field--wide">
              <span>Name *</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" autoFocus />
            </label>
            <label className="entity-create__field">
              <span>Phone</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
            </label>
            <label className="entity-create__field">
              <span>Contact</span>
              <input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Contact name" />
            </label>
            <label className="entity-create__field entity-create__field--wide">
              <span>Address</span>
              <textarea rows={4} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Address" />
            </label>
          </div>

          <div className="entity-create__footer">
            {error ? <div className="entity-create__error">{error}</div> : <div className="entity-create__hint">Minimal customer profile. You can enrich details later.</div>}
            <div className="entity-create__actions">
              <button type="button" className="entity-create__ghost" onClick={() => router.push("/customers")}>
                Cancel
              </button>
              <button type="submit" className="entity-create__primary" disabled={!canSubmit || submitting}>
                {submitting ? "Saving..." : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
