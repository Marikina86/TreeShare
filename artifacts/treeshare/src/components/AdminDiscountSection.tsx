import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

interface DiscountCode {
  id: number;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  durationDays: number;
  expiresAt: string;
  maxUses: number | null;
  useCount: number;
  campaignId: number | null;
  isActive: boolean;
  createdAt: string;
}

interface NotifyResult {
  recipientCount: number;
}

export default function AdminDiscountSection() {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();

  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    durationDays: "",
    maxUses: "",
    campaignId: "",
    notifyTarget: "" as "" | "all" | "business" | "private",
    notifyType: "" as "" | "in-app" | "email" | "both",
  });

  const [notifyModalId, setNotifyModalId] = useState<number | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<"all" | "business" | "private">("all");
  const [notifyType, setNotifyType] = useState<"in-app" | "email" | "both">("in-app");
  const [notifySending, setNotifySending] = useState(false);

  const T = lang === "it"
    ? {
        title: "Codici Sconto",
        load: "Carica codici",
        create: "Crea codice",
        code: "Codice",
        type: "Tipo",
        percentage: "Percentuale (%)",
        fixed: "Valore fisso (cent)",
        value: "Valore",
        duration: "Durata (giorni)",
        maxUses: "Utilizzi massimi (opz.)",
        campaignId: "ID campagna (opz.)",
        notifyNow: "Notifica subito",
        notifyTarget: "Destinatari",
        notifyType: "Canale",
        all: "Tutti gli utenti",
        business: "Organizzazioni (P.IVA)",
        private: "Utenti privati",
        inApp: "In-app",
        email: "Email",
        both: "Entrambi",
        send: "Invia notifica",
        cancel: "Annulla",
        save: "Crea",
        delete: "Elimina",
        activate: "Attiva",
        deactivate: "Disattiva",
        active: "Attivo",
        inactive: "Inattivo",
        expired: "Scaduto",
        uses: "utilizzi",
        unlimited: "illimitati",
        global: "Globale",
        campaign: "Campagna",
        noData: "Nessun codice sconto",
        notify: "Notifica",
        sentTo: "Notifica inviata a",
        recipients: "destinatari",
        codeRequired: "Il codice è obbligatorio",
        valueRequired: "Il valore è obbligatorio",
        durationRequired: "La durata è obbligatoria",
        created: "Codice creato",
        deleted: "Codice eliminato",
        updated: "Codice aggiornato",
        copyCode: "Copia",
        copied: "Copiato!",
      }
    : {
        title: "Discount Codes",
        load: "Load codes",
        create: "Create code",
        code: "Code",
        type: "Type",
        percentage: "Percentage (%)",
        fixed: "Fixed value (cents)",
        value: "Value",
        duration: "Duration (days)",
        maxUses: "Max uses (opt.)",
        campaignId: "Campaign ID (opt.)",
        notifyNow: "Notify now",
        notifyTarget: "Recipients",
        notifyType: "Channel",
        all: "All users",
        business: "Organizations (VAT)",
        private: "Private users",
        inApp: "In-app",
        email: "Email",
        both: "Both",
        send: "Send notification",
        cancel: "Cancel",
        save: "Create",
        delete: "Delete",
        activate: "Activate",
        deactivate: "Deactivate",
        active: "Active",
        inactive: "Inactive",
        expired: "Expired",
        uses: "uses",
        unlimited: "unlimited",
        global: "Global",
        campaign: "Campaign",
        noData: "No discount codes",
        notify: "Notify",
        sentTo: "Notification sent to",
        recipients: "recipients",
        codeRequired: "Code is required",
        valueRequired: "Value is required",
        durationRequired: "Duration is required",
        created: "Code created",
        deleted: "Code deleted",
        updated: "Code updated",
        copyCode: "Copy",
        copied: "Copied!",
      };

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(opts?.headers ?? {}),
      },
    });
  }

  const loadCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/discount-codes");
      if (res.ok) {
        const data = await res.json();
        setCodes(data);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleCreate() {
    if (!form.code.trim()) { toast({ title: T.codeRequired, variant: "destructive" }); return; }
    if (!form.discountValue) { toast({ title: T.valueRequired, variant: "destructive" }); return; }
    if (!form.durationDays) { toast({ title: T.durationRequired, variant: "destructive" }); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        durationDays: Number(form.durationDays),
      };
      if (form.maxUses) body.maxUses = Number(form.maxUses);
      if (form.campaignId) body.campaignId = Number(form.campaignId);
      if (form.notifyTarget && form.notifyType) {
        body.notify = { target: form.notifyTarget, type: form.notifyType };
      }

      const res = await authFetch("/api/discount-codes", {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Errore", variant: "destructive" });
        return;
      }

      setCodes((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ code: "", discountType: "percentage", discountValue: "", durationDays: "", maxUses: "", campaignId: "", notifyTarget: "", notifyType: "" });
      toast({ title: T.created });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: number, current: boolean) {
    const res = await authFetch(`/api/discount-codes/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCodes((prev) => prev.map((c) => (c.id === id ? updated : c)));
      toast({ title: T.updated });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm(lang === "it" ? "Eliminare questo codice?" : "Delete this code?")) return;
    const res = await authFetch(`/api/discount-codes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCodes((prev) => prev.filter((c) => c.id !== id));
      toast({ title: T.deleted });
    }
  }

  async function handleSendNotify() {
    if (!notifyModalId) return;
    setNotifySending(true);
    try {
      const res = await authFetch(`/api/discount-codes/${notifyModalId}/notify`, {
        method: "POST",
        body: JSON.stringify({ target: notifyTarget, type: notifyType }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Errore", variant: "destructive" });
        return;
      }
      toast({ title: `${T.sentTo} ${data.recipientCount} ${T.recipients}` });
      setNotifyModalId(null);
    } finally {
      setNotifySending(false);
    }
  }

  function formatValue(type: string, value: number) {
    return type === "percentage" ? `${value}%` : `€${(value / 100).toFixed(2)}`;
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {T.title}
          </h2>
          <div className="flex gap-2">
            {!loaded && (
              <button
                onClick={loadCodes}
                disabled={loading}
                className="px-3 py-1.5 text-sm font-medium bg-muted border border-border rounded-lg hover:bg-muted/80 disabled:opacity-50"
              >
                {loading ? "..." : T.load}
              </button>
            )}
            <button
              onClick={() => { if (!loaded) loadCodes(); setShowForm(true); }}
              className="px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              + {T.create}
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="mb-4 p-4 bg-muted/40 rounded-xl border border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.code}</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="ES: SPRING30"
                  maxLength={32}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.type}</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "percentage" | "fixed" }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="percentage">{T.percentage}</option>
                  <option value="fixed">{T.fixed}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {T.value} {form.discountType === "percentage" ? "(1-100)" : "(es. 1000 = €10)"}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                  min="1"
                  max={form.discountType === "percentage" ? "100" : undefined}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.duration}</label>
                <input
                  type="number"
                  value={form.durationDays}
                  onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
                  min="1"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.maxUses}</label>
                <input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                  min="1"
                  placeholder="∞"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.campaignId}</label>
                <input
                  type="number"
                  value={form.campaignId}
                  onChange={(e) => setForm((f) => ({ ...f, campaignId: e.target.value }))}
                  min="1"
                  placeholder="—"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.notifyTarget}</label>
                <select
                  value={form.notifyTarget}
                  onChange={(e) => setForm((f) => ({ ...f, notifyTarget: e.target.value as typeof form.notifyTarget }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="">— no notify —</option>
                  <option value="all">{T.all}</option>
                  <option value="business">{T.business}</option>
                  <option value="private">{T.private}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.notifyType}</label>
                <select
                  value={form.notifyType}
                  onChange={(e) => setForm((f) => ({ ...f, notifyType: e.target.value as typeof form.notifyType }))}
                  disabled={!form.notifyTarget}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background disabled:opacity-50"
                >
                  <option value="">—</option>
                  <option value="in-app">{T.inApp}</option>
                  <option value="email">{T.email}</option>
                  <option value="both">{T.both}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              >
                {T.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "..." : T.save}
              </button>
            </div>
          </div>
        )}

        {/* Codes list */}
        {loading && (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {loaded && codes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">{T.noData}</p>
        )}

        {loaded && codes.length > 0 && (
          <div className="space-y-2">
            {codes.map((c) => {
              const expired = isExpired(c.expiresAt);
              return (
                <div
                  key={c.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
                    !c.isActive || expired
                      ? "border-border bg-muted/30 opacity-70"
                      : "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/10"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-foreground tracking-wide">{c.code}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                        -{formatValue(c.discountType, c.discountValue)}
                      </span>
                      {c.campaignId && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {T.campaign} #{c.campaignId}
                        </span>
                      )}
                      {expired ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">{T.expired}</span>
                      ) : c.isActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">{T.active}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground">{T.inactive}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {c.durationDays}d · {lang === "it" ? "Scade" : "Expires"}: {new Date(c.expiresAt).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB")}
                      {" · "}{c.useCount}/{c.maxUses ?? "∞"} {T.uses}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: T.copied }); }}
                      className="px-2.5 py-1 text-xs border border-border rounded-lg hover:bg-muted"
                      title={T.copyCode}
                    >
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {!expired && (
                      <button
                        onClick={() => { setNotifyModalId(c.id); setNotifyTarget("all"); setNotifyType("in-app"); }}
                        className="px-2.5 py-1 text-xs border border-border rounded-lg hover:bg-muted"
                        title={T.notify}
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActive(c.id, c.isActive)}
                      className={`px-2.5 py-1 text-xs border rounded-lg ${c.isActive ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                    >
                      {c.isActive ? T.deactivate : T.activate}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-2.5 py-1 text-xs border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                    >
                      {T.delete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notify modal */}
      {notifyModalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-semibold text-foreground">{T.notifyNow}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.notifyTarget}</label>
                <select
                  value={notifyTarget}
                  onChange={(e) => setNotifyTarget(e.target.value as typeof notifyTarget)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="all">{T.all}</option>
                  <option value="business">{T.business}</option>
                  <option value="private">{T.private}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{T.notifyType}</label>
                <select
                  value={notifyType}
                  onChange={(e) => setNotifyType(e.target.value as typeof notifyType)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="in-app">{T.inApp}</option>
                  <option value="email">{T.email}</option>
                  <option value="both">{T.both}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setNotifyModalId(null)}
                disabled={notifySending}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted"
              >
                {T.cancel}
              </button>
              <button
                onClick={handleSendNotify}
                disabled={notifySending}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                {notifySending ? "..." : T.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
