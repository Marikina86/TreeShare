import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
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
  photos: string[];
}

import { CampaignPhotoGridCompact } from "@/components/PhotoLightbox";

const labels = {
  it: {
    donateNow: "Dona ora a",
    amount: "Importo (€)",
    donate: "Dona",
    cancel: "Annulla",
    processing: "Elaborazione...",
    success: "Donazione completata! Grazie per il tuo supporto.",
    error: "Errore nel pagamento",
    raised: "Raccolti",
    goal: "Obiettivo",
    donations: "donazioni",
    summary: "Riepilogo donazione",
    total: "Totale",
    orgShare: "Per l'organizzazione",
    platformFee: "Commissione piattaforma (20% + €0,25)",
    confirmPay: "Conferma e paga",
    back: "Modifica importo",
    minAmount: "Importo minimo: €1",
  },
  en: {
    donateNow: "Donate now to",
    amount: "Amount (€)",
    donate: "Donate",
    cancel: "Cancel",
    processing: "Processing...",
    success: "Donation completed! Thank you for your support.",
    error: "Payment error",
    raised: "Raised",
    goal: "Goal",
    donations: "donations",
    summary: "Donation summary",
    total: "Total",
    orgShare: "To organization",
    platformFee: "Platform fee (20% + €0.25)",
    confirmPay: "Confirm and pay",
    back: "Change amount",
    minAmount: "Minimum amount: €1",
  },
};

type Lang = keyof typeof labels;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function PaymentForm({ clientSecret, onSuccess, onCancel, l }: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  l: typeof labels.en;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || l.error);
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {l.cancel}
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          {processing ? l.processing : l.confirmPay}
        </button>
      </div>
    </form>
  );
}

export default function DonateSection({ profileUserId, profileUsername }: {
  profileUserId: string;
  profileUsername: string;
}) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { lang } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const l = labels[lang as Lang] || labels.en;

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "summary" | "payment" | "done">("amount");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const { data: campaign, isLoading: loading } = useQuery<Campaign | null>({
    queryKey: ["donate-campaign", profileUserId],
    queryFn: async () => {
      const res = await fetch(`/api/donations/campaigns/user/${profileUserId}`);
      if (res.ok) return res.json();
      return null;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (!showModal) return;
    async function initStripe() {
      if (!stripePromise) {
        const token = await getToken();
        const res = await fetch("/api/donations/stripe-config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { publishableKey } = await res.json();
          stripePromise = loadStripe(publishableKey);
        }
      }
    }
    initStripe();
  }, [showModal]);

  async function handleCreatePaymentIntent() {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) return;

    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/donations/create-payment-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign!.id, amount: numAmount }),
      });

      if (res.ok) {
        const data = await res.json();
        setClientSecret(data.clientSecret);
        setPaymentInfo(data);
        setStep("payment");
      } else {
        const err = await res.json();
        toast({ title: err.error || l.error, variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  }

  const handleSuccess = useCallback(async () => {
    setStep("done");
    toast({ title: l.success });

    if (paymentInfo?.clientSecret) {
      try {
        const piId = paymentInfo.clientSecret.split("_secret_")[0];
        const token = await getToken();
        await fetch("/api/donations/confirm-payment", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: piId }),
        });
      } catch {}
    }

    const donatedAmount = Math.round(parseFloat(amount) * 100);
    queryClient.setQueryData<Campaign | null>(["donate-campaign", profileUserId], (prev) =>
      prev ? { ...prev, totalRaised: prev.totalRaised + donatedAmount, donationCount: prev.donationCount + 1 } : prev
    );
    queryClient.invalidateQueries({ queryKey: ["campaigns-active"] });
    setTimeout(() => {
      setShowModal(false);
      setStep("amount");
      setAmount("");
      setClientSecret(null);
      setPaymentInfo(null);
    }, 2000);
  }, [amount, profileUserId, queryClient, toast, l.success, paymentInfo, getToken]);

  if (loading || !campaign) return null;

  const isOwnProfile = user?.id === profileUserId;
  if (isOwnProfile) return null;

  const progress = campaign.goalAmount ? Math.min(100, (campaign.totalRaised / campaign.goalAmount) * 100) : null;

  return (
    <>
      <div className="mb-6 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-emerald-600 dark:text-emerald-400">
              <path d="M12 21C12 21 4 15 4 9C4 6.79 5.79 5 8 5C9.5 5 10.8 5.8 11.5 7H12.5C13.2 5.8 14.5 5 16 5C18.21 5 20 6.79 20 9C20 15 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{campaign.title}</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 line-clamp-2">{campaign.description}</p>
          </div>
        </div>

        <CampaignPhotoGridCompact photos={Array.isArray(campaign.photos) ? campaign.photos : []} className="mb-3" />

        <div className="flex items-center gap-4 text-xs text-emerald-600 dark:text-emerald-400 mb-3">
          <span className="font-semibold">€{(campaign.totalRaised / 100).toFixed(2)} {l.raised}</span>
          {campaign.goalAmount && (
            <span>{l.goal}: €{(campaign.goalAmount / 100).toFixed(2)}</span>
          )}
          <span>{campaign.donationCount} {l.donations}</span>
        </div>

        {progress !== null && (
          <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          onClick={() => { setShowModal(true); setStep("amount"); }}
          className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
        >
          {l.donateNow} {profileUsername}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{l.donateNow} {profileUsername}</h2>
              <button onClick={() => { setShowModal(false); setStep("amount"); setAmount(""); setClientSecret(null); }}
                className="p-1 hover:bg-muted rounded-lg">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {step === "amount" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">{l.amount}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="5.00"
                    className="w-full px-4 py-3 border border-border rounded-xl text-lg font-semibold bg-background text-center"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">{l.minAmount}</p>
                </div>
                <div className="flex gap-2">
                  {[5, 10, 25, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                    >
                      €{v}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setStep("summary")}
                  disabled={!amount || parseFloat(amount) < 1}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {l.donate}
                </button>
              </div>
            )}

            {step === "summary" && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground">{l.summary}</h3>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{l.total}</span>
                    <span className="font-semibold">€{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{l.orgShare}</span>
                    <span>€{(parseFloat(amount) - (parseFloat(amount) * 0.2 + 0.25)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{l.platformFee}</span>
                    <span>€{(parseFloat(amount) * 0.2 + 0.25).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("amount")}
                    className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                  >
                    {l.back}
                  </button>
                  <button
                    onClick={handleCreatePaymentIntent}
                    disabled={creating}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {creating ? l.processing : l.confirmPay}
                  </button>
                </div>
              </div>
            )}

            {step === "payment" && clientSecret && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                <PaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handleSuccess}
                  onCancel={() => { setStep("amount"); setClientSecret(null); }}
                  l={l}
                />
              </Elements>
            )}

            {step === "done" && (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-3">
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-foreground font-medium">{l.success}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
