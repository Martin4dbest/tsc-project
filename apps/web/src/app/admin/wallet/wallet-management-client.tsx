"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type WalletRow = {
  id: string;
  traveller_id: string;
  balance_minor: number;
  currency_code: string;
  status: string;
  created_at: string;
  profile?: {
    full_name?: string | null;
    phone?: string | null;
    account_status?: string | null;
  };
};

type TransactionRow = {
  id: string;
  traveller_id: string;
  traveller_name: string;
  transaction_type: string;
  amount_minor: number;
  currency_code: string;
  description?: string | null;
  created_at: string;
};

type Props = {
  wallets: WalletRow[];
  transactions: TransactionRow[];
  canManage: boolean;
  adjustAction: (formData: FormData) => Promise<void>;
};

const money = (minor: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(minor / 100);

const dateLabel = (date: string) =>
  new Date(date).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

const initials = (name?: string | null) =>
  (name || "Traveller")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const baseCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5ebf2",
  borderRadius: 18,
  boxShadow: "0 5px 18px rgba(15,35,60,.04)",
  minWidth: 0,
};

const buttonBase: CSSProperties = {
  border: "1px solid #dce5ee",
  borderRadius: 11,
  padding: "10px 14px",
  background: "#fff",
  color: "#344e67",
  fontWeight: 700,
  cursor: "pointer",
};

export default function WalletManagementClient({
  wallets,
  transactions,
  canManage,
  adjustAction,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<WalletRow | null>(null);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    direction: "credit" | "debit";
    amount: number;
    currency: string;
    traveller: string;
  } | null>(null);
  const [adjustmentError, setAdjustmentError] = useState("");

  async function handleAdjustmentSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const type = direction;
    const currency = selected?.currency_code || "NGN";
    const traveller = selected?.profile?.full_name || "Traveller";

    setSubmitting(true);
    setAdjustmentError("");

    try {
      await adjustAction(formData);

      setSelected(null);
      setSuccess({
        direction: type,
        amount,
        currency,
        traveller,
      });

      router.refresh();
    } catch (error) {
      setAdjustmentError(
        error instanceof Error
          ? error.message
          : "Wallet adjustment failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return wallets.filter((wallet) => {
      const name = wallet.profile?.full_name ?? "";
      const phone = wallet.profile?.phone ?? "";

      const matchesSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q);

      const matchesStatus =
        status === "all" || wallet.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [wallets, search, status]);

  const total = wallets.reduce(
    (sum, wallet) => sum + Number(wallet.balance_minor),
    0
  );

  const active = wallets.filter(
    (wallet) => wallet.status === "active"
  ).length;

  const inactive = wallets.length - active;

  const stats = [
    {
      title: "TOTAL WALLET BALANCE",
      value: money(total),
      note: "Combined balance across all wallets",
      color: "#fff",
      bg: "linear-gradient(135deg,#10243e,#1d456b)",
    },
    {
      title: "WALLET ACCOUNTS",
      value: wallets.length.toLocaleString(),
      note: "Registered wallet accounts",
      color: "#183753",
      bg: "#fff",
    },
    {
      title: "ACTIVE WALLETS",
      value: active.toLocaleString(),
      note: `${inactive} frozen or inactive`,
      color: "#15804b",
      bg: "#fff",
    },
    {
      title: "RECENT TRANSACTIONS",
      value: transactions.length.toLocaleString(),
      note: "Latest ledger entries loaded",
      color: "#b56b26",
      bg: "#fff",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 22 }}>
      {/* SUMMARY CARDS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          gap: 14,
        }}
      >
        {stats.map((stat, index) => (
          <article
            key={stat.title}
            style={{
              ...baseCard,
              background: stat.bg,
              padding: 22,
              border: index === 0 ? 0 : baseCard.border,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.1,
                fontWeight: 800,
                color: index === 0 ? "#c2d7e8" : "#728296",
              }}
            >
              {stat.title}
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 850,
                letterSpacing: -0.6,
                color: stat.color,
                marginTop: 12,
              }}
            >
              {stat.value}
            </div>

            <div
              style={{
                fontSize: 13,
                color: index === 0 ? "#c2d7e8" : "#8291a2",
                marginTop: 8,
              }}
            >
              {stat.note}
            </div>
          </article>
        ))}
      </section>

      {/* WALLET DIRECTORY */}
      <section style={{ ...baseCard, overflow: "hidden" }}>
        <div style={{ padding: 22, borderBottom: "1px solid #edf1f5" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.1,
                  color: "#728296",
                }}
              >
                TRAVELLER ACCOUNTS
              </div>

              <h2
                style={{
                  fontSize: 22,
                  color: "#183753",
                  fontWeight: 850,
                  margin: "6px 0 0",
                }}
              >
                Wallet directory
              </h2>

              <p
                style={{
                  fontSize: 14,
                  color: "#7b8b9d",
                  margin: "5px 0 0",
                }}
              >
                Search accounts and manage wallet balances.
              </p>
            </div>

            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {(["all", "active", "frozen"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatus(filter)}
                  style={{
                    ...buttonBase,
                    borderColor:
                      status === filter ? "#214a70" : "#dce5ee",
                    background:
                      status === filter ? "#173653" : "#fff",
                    color:
                      status === filter ? "#fff" : "#526579",
                    padding: "8px 13px",
                    fontSize: 12,
                  }}
                >
                  {filter === "all" ? "All wallets" : filter}
                </button>
              ))}
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search traveller name or phone number…"
            aria-label="Search traveller"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: 18,
              padding: "13px 15px",
              border: "1px solid #dce5ee",
              background: "#f8fafc",
              color: "#183753",
              borderRadius: 12,
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 700,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  color: "#728296",
                  textAlign: "left",
                  fontSize: 11,
                  letterSpacing: 0.6,
                }}
              >
                <th style={{ padding: "13px 18px" }}>TRAVELLER</th>
                <th style={{ padding: 13 }}>PHONE</th>
                <th style={{ padding: 13, textAlign: "right" }}>
                  BALANCE
                </th>
                <th style={{ padding: 13 }}>STATUS</th>
                {canManage && (
                  <th style={{ padding: "13px 18px", textAlign: "right" }}>
                    ACTION
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {filtered.map((wallet) => {
                const name =
                  wallet.profile?.full_name || "Unnamed traveller";
                const isActive = wallet.status === "active";

                return (
                  <tr
                    key={wallet.id}
                    style={{ borderTop: "1px solid #edf1f5" }}
                  >
                    <td style={{ padding: "14px 18px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            flexShrink: 0,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 12,
                            background: "#eaf1f8",
                            color: "#264d72",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {initials(name)}
                        </div>

                        <div>
                          <div
                            style={{
                              color: "#1c344f",
                              fontWeight: 750,
                              fontSize: 14,
                            }}
                          >
                            {name}
                          </div>
                          <div
                            style={{
                              color: "#91a0af",
                              fontSize: 11,
                              marginTop: 3,
                            }}
                          >
                            Traveller wallet
                          </div>
                        </div>
                      </div>
                    </td>

                    <td
                      style={{
                        padding: 14,
                        color: "#526579",
                        fontSize: 13,
                      }}
                    >
                      {wallet.profile?.phone || "—"}
                    </td>

                    <td
                      style={{
                        padding: 14,
                        textAlign: "right",
                        fontWeight: 800,
                        color: "#1b334d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {money(
                        Number(wallet.balance_minor),
                        wallet.currency_code
                      )}
                    </td>

                    <td style={{ padding: 14 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          gap: 6,
                          alignItems: "center",
                          borderRadius: 99,
                          padding: "5px 9px",
                          background: isActive ? "#e9f8ef" : "#fff3e8",
                          color: isActive ? "#16804b" : "#b36a23",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 50,
                            background: "currentColor",
                          }}
                        />
                        {isActive ? "Active" : "Frozen"}
                      </span>
                    </td>

                    {canManage && (
                      <td
                        style={{
                          padding: "12px 18px",
                          textAlign: "right",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(wallet);
                            setDirection("credit");
                            setAdjustmentError("");
                          }}
                          style={{
                            ...buttonBase,
                            padding: "9px 12px",
                            fontSize: 12,
                          }}
                        >
                          Manage wallet
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filtered.length && (
          <div
            style={{
              textAlign: "center",
              padding: 30,
              color: "#7b8b9d",
            }}
          >
            No wallets match your search or filter.
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid #edf1f5",
            padding: "13px 18px",
            color: "#8090a2",
            fontSize: 12,
          }}
        >
          Showing {filtered.length} of {wallets.length} wallets
        </div>
      </section>

      {/* TRANSACTION LEDGER */}
      <section style={{ ...baseCard, padding: 22 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.1,
            color: "#718096",
          }}
        >
          WALLET LEDGER
        </div>

        <h2
          style={{
            fontSize: 22,
            color: "#183753",
            fontWeight: 850,
            margin: "6px 0 0",
          }}
        >
          Recent activity
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "#7b8b9d",
            margin: "5px 0 0",
          }}
        >
          Latest wallet credits and debits.
        </p>

        <div style={{ overflowX: "auto", marginTop: 15 }}>
          <table
            style={{
              width: "100%",
              minWidth: 650,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ color: "#718096", fontSize: 11, textAlign: "left" }}>
                <th style={{ padding: 12 }}>TRAVELLER</th>
                <th style={{ padding: 12 }}>TYPE</th>
                <th style={{ padding: 12 }}>DESCRIPTION</th>
                <th style={{ padding: 12, textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: 12 }}>DATE</th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((tx) => {
                const credit = tx.transaction_type === "credit";

                return (
                  <tr
                    key={tx.id}
                    style={{ borderTop: "1px solid #edf1f5" }}
                  >
                    <td
                      style={{
                        padding: 12,
                        fontWeight: 700,
                        color: "#314b65",
                        fontSize: 13,
                      }}
                    >
                      {tx.traveller_name}
                    </td>

                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          background: credit ? "#e9f8ef" : "#fff0f0",
                          color: credit ? "#16804b" : "#be4141",
                          padding: "5px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {credit ? "↑ CREDIT" : "↓ DEBIT"}
                      </span>
                    </td>

                    <td
                      style={{
                        padding: 12,
                        color: "#718096",
                        fontSize: 13,
                      }}
                    >
                      {tx.description || "Wallet transaction"}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        fontWeight: 800,
                        color: credit ? "#16804b" : "#be4141",
                      }}
                    >
                      {credit ? "+" : "−"}
                      {money(Number(tx.amount_minor), tx.currency_code)}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        color: "#718096",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {dateLabel(tx.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!transactions.length && (
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 14,
              padding: 26,
              marginTop: 14,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 20,
                color: "#2a5075",
                marginBottom: 8,
              }}
            >
              ↔
            </div>
            <div style={{ fontWeight: 750, color: "#314b65" }}>
              No transactions yet
            </div>
            <p
              style={{
                color: "#8090a2",
                fontSize: 13,
                margin: "6px 0 0",
              }}
            >
              Wallet activity will appear here after the first adjustment.
            </p>
          </div>
        )}
      </section>

      {/* ADJUSTMENT MODAL */}
      {selected && canManage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setSelected(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(10,24,40,.58)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#fff",
              borderRadius: 22,
              boxShadow: "0 24px 70px rgba(0,0,0,.22)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg,#10243e,#1e4268)",
                color: "#fff",
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: 1.2,
                      color: "#b8cde0",
                      fontWeight: 700,
                    }}
                  >
                    WALLET CONTROL
                  </div>
                  <h2
                    id="wallet-modal-title"
                    style={{
                      fontSize: 21,
                      margin: "7px 0",
                      fontWeight: 800,
                    }}
                  >
                    Manage wallet
                  </h2>
                </div>

                <button
                  type="button"
                  aria-label="Close modal"
                  disabled={submitting}
                  onClick={() => setSelected(null)}
                  style={{
                    background: "rgba(255,255,255,.12)",
                    border: 0,
                    color: "#fff",
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 20,
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {selected.profile?.full_name || "Traveller"}
              </div>
              <div style={{ color: "#c2d7e8", fontSize: 12, marginTop: 3 }}>
                {selected.profile?.phone || "No phone number"}
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,.1)",
                  borderRadius: 14,
                  padding: 13,
                  marginTop: 16,
                }}
              >
                <div style={{ fontSize: 11, color: "#b8cde0" }}>
                  CURRENT BALANCE
                </div>
                <div style={{ fontSize: 25, fontWeight: 800, marginTop: 4 }}>
                  {money(Number(selected.balance_minor), selected.currency_code)}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAdjustmentSubmit}
              style={{ padding: 22, display: "grid", gap: 14 }}
            >
              <input
                type="hidden"
                name="traveller_id"
                value={selected.traveller_id}
              />

              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#344b63",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Adjustment type
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {(["credit", "debit"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={submitting}
                      onClick={() => setDirection(type)}
                      style={{
                        ...buttonBase,
                        borderColor:
                          direction === type
                            ? type === "credit"
                              ? "#27a363"
                              : "#d96565"
                            : "#dce5ee",
                        background:
                          direction === type
                            ? type === "credit"
                              ? "#eaf8f0"
                              : "#fff0f0"
                            : "#fff",
                        color: type === "credit" ? "#17834c" : "#bd4141",
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {type === "credit" ? "＋ Credit" : "− Debit"}
                    </button>
                  ))}
                </div>

                <input type="hidden" name="direction" value={direction} />
              </div>

              <div>
                <label
                  htmlFor="wallet-adjust-amount"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#344b63",
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Amount (₦)
                </label>
                <input
                  id="wallet-adjust-amount"
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  disabled={submitting}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 13,
                    borderRadius: 12,
                    border: "1px solid #dce5ee",
                    fontSize: 15,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="wallet-adjust-reason"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    color: "#344b63",
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  Reason for adjustment
                </label>
                <textarea
                  id="wallet-adjust-reason"
                  name="reason"
                  minLength={5}
                  required
                  disabled={submitting}
                  rows={3}
                  placeholder="Explain why this adjustment is being made…"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    padding: 13,
                    borderRadius: 12,
                    border: "1px solid #dce5ee",
                    fontSize: 14,
                  }}
                />
              </div>

              {adjustmentError && (
                <div
                  role="alert"
                  style={{
                    background: "#fff1f1",
                    border: "1px solid #fecaca",
                    color: "#b42318",
                    padding: 13,
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {adjustmentError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setSelected(null)}
                  style={{
                    ...buttonBase,
                    flex: 1,
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    border: 0,
                    background: "#173653",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Processing..." : `Confirm ${direction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {success && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-success-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(9, 25, 45, .68)",
            backdropFilter: "blur(7px)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 390,
              background: "#fff",
              borderRadius: 25,
              padding: "34px 25px",
              textAlign: "center",
              boxShadow: "0 25px 80px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "#e8f8ef",
                color: "#159653",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 20px",
                fontSize: 39,
                fontWeight: 800,
              }}
            >
              ✓
            </div>

            <div
              style={{
                color: "#e98012",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1.5,
              }}
            >
              TSC WALLET CONFIRMATION
            </div>

            <h2
              id="wallet-success-title"
              style={{
                color: "#10254b",
                fontSize: 23,
                fontWeight: 900,
                margin: "10px 0",
              }}
            >
              Wallet updated successfully!
            </h2>

            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
              The wallet adjustment has been completed successfully.
            </p>

            <div
              style={{
                background: "#f4f7fb",
                borderRadius: 16,
                padding: 18,
                margin: "22px 0",
              }}
            >
              <div style={{ color: "#718096", fontSize: 12 }}>
                Amount {success.direction === "credit" ? "credited" : "debited"}
              </div>

              <div
                style={{
                  color: success.direction === "credit" ? "#159653" : "#dc4545",
                  fontSize: 28,
                  fontWeight: 900,
                  marginTop: 7,
                }}
              >
                {success.direction === "credit" ? "+" : "−"}
                {money(
                  Math.round(success.amount * 100),
                  success.currency
                )}
              </div>

              <div style={{ color: "#64748b", fontSize: 12, marginTop: 9 }}>
                Traveller: {success.traveller}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSuccess(null)}
              style={{
                width: "100%",
                border: 0,
                borderRadius: 13,
                padding: 15,
                background: "#10254b",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
