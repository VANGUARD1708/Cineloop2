import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Shield,
  TrendingUp,
  Users,
  AlertTriangle,
  CreditCard,
  Ban,
  RotateCcw,
  Search,
  Loader2,
  Crown,
  ChevronLeft,
} from "lucide-react";
import { useIdentity } from "@/hooks/useIdentity";

const BASE = import.meta.env.BASE_URL;

interface Overview {
  revenue: {
    lifetime: { cents: number; count: number };
    last30Days: { cents: number; count: number };
    byProvider: Array<{ provider: string; cents: number; count: number }>;
  };
  users: { total: number; activePro: number; signupsLast30Days: number; banned: number };
  abuse: { last30Days: number };
  generatedAt: string;
}

interface PaymentRow {
  id: number;
  userId: number | null;
  userEmail: string | null;
  username: string | null;
  provider: string;
  type: string;
  plan: string | null;
  amountCents: number;
  currency: string;
  status: string;
  customerEmail: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface UserRow {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string;
  proUntil: string | null;
  proPlan: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  createdAt: string;
  abuseCount: number;
  isPro: boolean;
}

interface AbuseRow {
  id: number;
  userId: number | null;
  username: string | null;
  userEmail: string | null;
  ip: string | null;
  eventType: string;
  severity: string;
  metadata: string | null;
  createdAt: string;
}

function fmtMoney(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "pending"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      {status}
    </span>
  );
}

function SeverityPill({ severity }: { severity: string }) {
  const tone =
    severity === "high"
      ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
      : severity === "medium"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
      : "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
      {severity}
    </span>
  );
}

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { user, loading: identityLoading } = useIdentity();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [abuse, setAbuse] = useState<AbuseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const isAdmin = !!user?.isAdmin;

  const loadAll = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}&limit=50` : "?limit=50";
      const [ov, pay, us, ab] = await Promise.all([
        fetch(`${BASE}api/admin/overview`, { credentials: "include" }),
        fetch(`${BASE}api/admin/payments?limit=50`, { credentials: "include" }),
        fetch(`${BASE}api/admin/users${qs}`, { credentials: "include" }),
        fetch(`${BASE}api/admin/abuse?limit=100`, { credentials: "include" }),
      ]);
      if (ov.status === 401 || ov.status === 403) {
        setError(ov.status === 401 ? "Sign in required." : "Admin access required.");
        return;
      }
      if (!ov.ok || !pay.ok || !us.ok || !ab.ok) {
        setError("Failed to load admin data.");
        return;
      }
      const ovData = (await ov.json()) as Overview;
      const payData = (await pay.json()) as { payments: PaymentRow[] };
      const usData = (await us.json()) as { users: UserRow[] };
      const abData = (await ab.json()) as { events: AbuseRow[] };
      setOverview(ovData);
      setPayments(payData.payments);
      setUsers(usData.users);
      setAbuse(abData.events);
    } catch (e) {
      setError("Network error loading admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (identityLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void loadAll();
  }, [identityLoading, isAdmin, loadAll]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadAll(query);
  };

  const onToggleBan = useCallback(
    async (target: UserRow) => {
      const banning = !target.isBanned;
      let reason: string | null = null;
      if (banning) {
        const input = window.prompt(`Reason for banning ${target.username}? (optional)`, "");
        if (input === null) return;
        reason = input.trim() || null;
      } else {
        if (!window.confirm(`Unban ${target.username}?`)) return;
      }
      setBusyUserId(target.id);
      try {
        const r = await fetch(`${BASE}api/admin/users/${target.id}/ban`, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ banned: banning, reason }),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          alert(`Failed: ${err.error ?? "unknown"}`);
          return;
        }
        await loadAll(query);
      } finally {
        setBusyUserId(null);
      }
    },
    [loadAll, query],
  );

  const lifetimeRevenue = useMemo(() => overview?.revenue.lifetime.cents ?? 0, [overview]);
  const recentRevenue = useMemo(() => overview?.revenue.last30Days.cents ?? 0, [overview]);

  if (identityLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 px-6 text-center">
        <div className="max-w-md">
          <Shield className="mx-auto mb-4 h-12 w-12 text-rose-400/70" />
          <h1 className="mb-2 text-xl font-semibold text-white">Admin only</h1>
          <p className="mb-4 text-sm text-zinc-400">
            This area is restricted to CineLoop administrators. If you should have access,
            ask the platform owner to add your email to the admin list.
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" /> Back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-400">
                Admin Console
              </span>
            </div>
            <h1 className="mt-1 font-serif text-3xl font-bold">CineLoop Operations</h1>
            <p className="mt-1 text-sm text-white/50">
              Revenue, accounts, and abuse monitoring.
              {overview && (
                <span className="ml-2 text-white/30">· refreshed {fmtDate(overview.generatedAt)}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadAll(query)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            disabled={loading}
            data-testid="button-admin-refresh"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Overview cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            label="Lifetime revenue"
            value={fmtMoney(lifetimeRevenue)}
            sub={`${overview?.revenue.lifetime.count ?? 0} payments`}
            icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
            tint="from-emerald-500/10 to-transparent border-emerald-500/20"
          />
          <Card
            label="Last 30 days"
            value={fmtMoney(recentRevenue)}
            sub={`${overview?.revenue.last30Days.count ?? 0} payments`}
            icon={<CreditCard className="h-4 w-4 text-amber-400" />}
            tint="from-amber-500/10 to-transparent border-amber-500/20"
          />
          <Card
            label="Active Pro members"
            value={String(overview?.users.activePro ?? 0)}
            sub={`${overview?.users.total ?? 0} total · ${overview?.users.signupsLast30Days ?? 0} new (30d)`}
            icon={<Crown className="h-4 w-4 text-rose-400" />}
            tint="from-rose-500/10 to-transparent border-rose-500/20"
          />
          <Card
            label="Abuse events (30d)"
            value={String(overview?.abuse.last30Days ?? 0)}
            sub={`${overview?.users.banned ?? 0} accounts banned`}
            icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}
            tint="from-orange-500/10 to-transparent border-orange-500/20"
          />
        </div>

        {/* By provider */}
        {overview && overview.revenue.byProvider.length > 0 && (
          <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/60">
              Revenue by provider
            </h2>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {overview.revenue.byProvider.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                >
                  <span className="text-sm capitalize text-white/80">{p.provider}</span>
                  <div className="text-right">
                    <div className="text-base font-semibold tabular-nums">{fmtMoney(p.cents)}</div>
                    <div className="text-[11px] text-white/40">{p.count} txn</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent payments */}
        <Section
          title="Recent payments"
          icon={<CreditCard className="h-4 w-4" />}
          count={payments.length}
        >
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Provider</th>
                  <th className="px-3 py-2.5">Plan</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                      No payments yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 text-white/70">{fmtDate(p.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-white/90">
                          {p.username ?? p.customerEmail ?? "—"}
                        </div>
                        <div className="text-[11px] text-white/40">{p.userEmail ?? p.customerEmail ?? ""}</div>
                      </td>
                      <td className="px-3 py-2.5 capitalize text-white/70">{p.provider}</td>
                      <td className="px-3 py-2.5 text-white/70">
                        {p.type === "subscription" ? (p.plan ?? "—") : p.type}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {fmtMoney(p.amountCents, p.currency)}
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={p.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Users */}
        <Section
          title="Users"
          icon={<Users className="h-4 w-4" />}
          count={users.length}
          right={
            <form onSubmit={onSearch} className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
                <Search className="h-3.5 w-3.5 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="username or email"
                  className="w-44 bg-transparent text-xs text-white outline-none placeholder:text-white/40"
                  data-testid="input-admin-user-search"
                />
              </div>
              <button
                type="submit"
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
              >
                Search
              </button>
            </form>
          }
        >
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">Joined</th>
                  <th className="px-3 py-2.5">Plan</th>
                  <th className="px-3 py-2.5 text-right">Abuse</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                      No users.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                          <div>
                            <div className="flex items-center gap-1.5 text-white/90">
                              {u.username}
                              {u.isAdmin && (
                                <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-300">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-white/40">{u.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-white/60">{fmtDate(u.createdAt)}</td>
                      <td className="px-3 py-2.5 text-white/70">
                        {u.isPro ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            <Crown className="h-3 w-3" /> {u.proPlan ?? "Pro"}
                          </span>
                        ) : (
                          <span className="text-white/40">Free</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-white/70">
                        {u.abuseCount > 0 ? (
                          <span className="text-orange-300">{u.abuseCount}</span>
                        ) : (
                          <span className="text-white/30">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {u.isBanned ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-200">
                            <Ban className="h-3 w-3" /> Banned
                          </span>
                        ) : (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onToggleBan(u)}
                          disabled={busyUserId === u.id || u.id === user?.id}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10 disabled:opacity-40"
                          data-testid={`button-admin-ban-${u.id}`}
                        >
                          {busyUserId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : u.isBanned ? (
                            <>
                              <RotateCcw className="h-3 w-3" /> Unban
                            </>
                          ) : (
                            <>
                              <Ban className="h-3 w-3" /> Ban
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Abuse events */}
        <Section
          title="Recent abuse events"
          icon={<AlertTriangle className="h-4 w-4" />}
          count={abuse.length}
        >
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">Event</th>
                  <th className="px-3 py-2.5">Severity</th>
                  <th className="px-3 py-2.5">User</th>
                  <th className="px-3 py-2.5">IP</th>
                  <th className="px-3 py-2.5">Detail</th>
                </tr>
              </thead>
              <tbody>
                {abuse.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-white/40">
                      No abuse events recorded.
                    </td>
                  </tr>
                ) : (
                  abuse.map((a) => (
                    <tr key={a.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 text-white/60">{fmtDate(a.createdAt)}</td>
                      <td className="px-3 py-2.5 text-white/90">{a.eventType}</td>
                      <td className="px-3 py-2.5"><SeverityPill severity={a.severity} /></td>
                      <td className="px-3 py-2.5 text-white/70">
                        {a.username ?? <span className="text-white/40">anon</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-white/40">{a.ip ?? "—"}</td>
                      <td className="px-3 py-2.5">
                        <code className="block max-w-md truncate font-mono text-[11px] text-white/40">
                          {a.metadata ?? ""}
                        </code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card(props: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${props.tint} p-5`}>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/60">
        {props.icon}
        {props.label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-white">{props.value}</div>
      <div className="mt-1 text-[11px] text-white/40">{props.sub}</div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  right,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/70">
          {icon}
          {title}
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">{count}</span>
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
