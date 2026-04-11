import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number | null;
  isActive: boolean;
  totalRaised: number;
  donationCount: number;
}

const t = {
  it: {
    title: "Campagne donazioni",
    create: "Crea campagna",
    campaignTitle: "Titolo campagna",
    campaignDesc: "Descrizione",
    goalOptional: "Obiettivo € (opzionale)",
    save: "Salva",
    cancel: "Annulla",
    active: "Attiva",
    inactive: "Non attiva",
    raised: "Raccolti",
    donations: "donazioni",
    noGoal: "Nessun obiettivo",
    activate: "Attiva",
    deactivate: "Disattiva",
    created: "Campagna creata",
    updated: "Campagna aggiornata",
    connectStripe: "Collega Stripe",
    connectStripeDesc: "Per ricevere i pagamenti, collega il tuo account Stripe.",
    stripeConnected: "Stripe collegato",
    balance: "Saldo disponibile",
    totalReceived: "Totale ricevuto",
    totalPaidOut: "Totale erogato",
    requestPayout: "Richiedi pagamento",
    payoutRequested: "Pagamento richiesto",
    payoutFee: "Costo payout: €0,25",
    minPayout: "Saldo minimo per payout: €1,25",
    noData: "Nessuna campagna creata",
  },
  en: {
    title: "Donation campaigns",
    create: "Create campaign",
    campaignTitle: "Campaign title",
    campaignDesc: "Description",
    goalOptional: "Goal € (optional)",
    save: "Save",
    cancel: "Cancel",
    active: "Active",
    inactive: "Inactive",
    raised: "Raised",
    donations: "donations",
    noGoal: "No goal",
    activate: "Activate",
    deactivate: "Deactivate",
    created: "Campaign created",
    updated: "Campaign updated",
    connectStripe: "Connect Stripe",
    connectStripeDesc: "To receive payments, connect your Stripe account.",
    stripeConnected: "Stripe connected",
    balance: "Available balance",
    totalReceived: "Total received",
    totalPaidOut: "Total paid out",
    requestPayout: "Request payout",
    payoutRequested: "Payout requested",
    payoutFee: "Payout fee: €0.25",
    minPayout: "Minimum payout balance: €1.25",
    noData: "No campaigns created",
  },
};

type Lang = keyof typeof t;

export default function DonationCampaignManager({ accountType, stripeAccountId, onRefreshProfile }: {
  accountType: string;
  stripeAccountId: string | null;
  onRefreshProfile: () => void;
}) {
  const { getToken } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const l = t[lang as Lang] || t.en;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formGoal, setFormGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [payingOut, setPayingOut] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, { ...opts, headers: { ...opts?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  }

  async function loadCampaigns() {
    const res = await authFetch("/api/donations/my-campaigns");
    if (res.ok) setCampaigns(await res.json());
  }

  async function loadBalance() {
    const res = await authFetch("/api/donations/balance");
    if (res.ok) setBalance(await res.json());
  }

  useEffect(() => {
    if (accountType === "organization") {
      loadCampaigns();
      loadBalance();
    }
  }, [accountType]);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/donations/campaigns", {
        method: "POST",
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          goalAmount: formGoal ? Number(formGoal) : null,
        }),
      });
      if (res.ok) {
        toast({ title: l.created });
        setShowForm(false);
        setFormTitle("");
        setFormDesc("");
        setFormGoal("");
        loadCampaigns();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCampaign(id: number, isActive: boolean) {
    await authFetch(`/api/donations/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !isActive }),
    });
    toast({ title: l.updated });
    loadCampaigns();
  }

  async function handleConnectStripe() {
    setConnectingStripe(true);
    try {
      const res = await authFetch("/api/donations/connect-stripe", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else if (data.alreadyConnected) {
        toast({ title: l.stripeConnected });
        onRefreshProfile();
      }
    } finally {
      setConnectingStripe(false);
    }
  }

  async function handleRequestPayout() {
    setPayingOut(true);
    try {
      const res = await authFetch("/api/donations/request-payout", { method: "POST" });
      if (res.ok) {
        toast({ title: l.payoutRequested });
        loadBalance();
      } else {
        const data = await res.json();
        toast({ title: data.error, variant: "destructive" });
      }
    } finally {
      setPayingOut(false);
    }
  }

  if (accountType !== "organization") {
    return null;
  }

  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {l.title}
      </h2>

      {!stripeAccountId && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4">
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">{l.connectStripeDesc}</p>
          <button
            onClick={handleConnectStripe}
            disabled={connectingStripe}
            className="px-4 py-2 bg-[#635bff] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {connectingStripe ? "..." : l.connectStripe}
          </button>
        </div>
      )}

      {balance && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            <div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">€{(balance.organizationBalance.availableBalance / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">{l.balance}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">€{(balance.organizationBalance.totalOrgReceived / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">{l.totalReceived}</div>
            </div>
            <div>
              <div className="text-lg font-bold text-foreground">€{(balance.organizationBalance.totalPaidOut / 100).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">{l.totalPaidOut}</div>
            </div>
          </div>
          {stripeAccountId && balance.organizationBalance.availableBalance >= 125 && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground mb-2">{l.payoutFee}</p>
              <button
                onClick={handleRequestPayout}
                disabled={payingOut}
                className="w-full py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {payingOut ? "..." : l.requestPayout}
              </button>
            </div>
          )}
          {stripeAccountId && balance.organizationBalance.availableBalance < 125 && balance.organizationBalance.availableBalance > 0 && (
            <p className="text-[10px] text-muted-foreground border-t border-border pt-2 mt-2">{l.minPayout}</p>
          )}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {campaigns.map((c) => (
          <div key={c.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {c.isActive ? l.active : l.inactive}
                  </span>
                  <span>€{(c.totalRaised / 100).toFixed(2)} {l.raised}</span>
                  <span>{c.donationCount} {l.donations}</span>
                  {c.goalAmount && <span>/ €{(c.goalAmount / 100).toFixed(2)}</span>}
                </div>
              </div>
              <button
                onClick={() => handleToggleCampaign(c.id, c.isActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${c.isActive ? "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"}`}
              >
                {c.isActive ? l.deactivate : l.activate}
              </button>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{l.noData}</div>
        )}

        {showForm ? (
          <form onSubmit={handleCreateCampaign} className="px-5 py-4 space-y-3">
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={l.campaignTitle}
              required
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={l.campaignDesc}
              required
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background resize-none"
            />
            <input
              value={formGoal}
              onChange={(e) => setFormGoal(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={l.goalOptional}
              type="text"
              inputMode="decimal"
              className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.cancel}
              </button>
              <button
                type="submit"
                disabled={saving || !formTitle || !formDesc}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "..." : l.save}
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full px-5 py-4 text-sm font-medium text-primary hover:bg-muted transition-colors text-left"
          >
            + {l.create}
          </button>
        )}
      </div>
    </section>
  );
}
