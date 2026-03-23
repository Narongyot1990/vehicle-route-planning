"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

export default function CustomersPageImpl() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomers(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="customers-v2">
      <div className="customers-v2__shell">
        <header className="customers-v2__header">
          <div className="customers-v2__header-main">
            <button type="button" className="customers-v2__icon-button" onClick={() => router.push("/")}>
              <span>Back</span>
            </button>
            <div>
              <span className="customers-v2__eyebrow">Customers</span>
              <h1>Customer Directory</h1>
            </div>
          </div>
          <div className="customers-v2__header-actions">
            <span className="customers-v2__count">{customers.length}</span>
            <button type="button" className="customers-v2__primary-button" onClick={() => router.push("/customers/create")}>
              <span>New</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="customers-v2__state">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="customers-v2__state">
            <span>No customers yet</span>
            <button type="button" className="customers-v2__text-button" onClick={() => router.push("/customers/create")}>
              Create first customer
            </button>
          </div>
        ) : (
          <div className="customers-v2__list">
            {customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="customers-v2__card"
                onClick={() => router.push(`/customers/${customer.id}`)}
              >
                <div className="customers-v2__card-head">
                  <h2>{customer.name}</h2>
                  <span>{customer.id.slice(0, 6)}</span>
                </div>
                <div className="customers-v2__card-lines">
                  <div>
                    <strong>Contact</strong>
                    <span>{customer.contactName || "-"}</span>
                  </div>
                  <div>
                    <strong>Phone</strong>
                    <span>{customer.phone || "-"}</span>
                  </div>
                </div>
                <p>{customer.address || "No address"}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
