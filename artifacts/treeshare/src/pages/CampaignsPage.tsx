import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@/lib/auth";
import Layout from "@/components/Layout";
import { useLang } from "@/lib/i18n";
import { useShare } from "@/hooks/useShare";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: number;
  userId: string;
  title: string;
  description: string;
  goalAmount: number | null;
  totalRaised: number;
  donationCount: number;
  photos: string[];
  createdAt: string;
  orgUsername: string;
  orgPhotoUrl: string | null;
}

import { CampaignPhotoGrid } from "@/components/PhotoLightbox";

const t = {
  it: {
    title: "Campagne attive",
    empty: "Nessuna campagna attiva al momento.",
    raised: "Raccolti",
    donations: "donazioni",
    goal: "Obiettivo",
    noGoal: "Senza obiettivo",
    donate: "Dona ora",
    sortRecent: "Recenti",
    sortPopular: "Popolari",
    sortFunded: "Più finanziate",
    by: "di",
    viewProfile: "Vedi profilo",
    share: "Condividi",
    donateNow: "Dona ora a",
    amount: "Importo (€)",
    cancel: "Annulla",
    processing: "Elaborazione...",
    success: "Donazione completata! Grazie per il tuo supporto.",
    error: "Errore nel pagamento",
    summary: "Riepilogo donazione",
    total: "Totale",
    orgShare: "Per l'organizzazione (80%)",
    platformFee: "Commissione piattaforma (20%)",
    confirmPay: "Conferma pagamento",
    back: "Modifica importo",
    minAmount: "Importo minimo: €1",
  },
  en: {
    title: "Active campaigns",
    empty: "No active campaigns at the moment.",
    raised: "Raised",
    donations: "donations",
    goal: "Goal",
    noGoal: "No goal",
    donate: "Donate now",
    sortRecent: "Recent",
    sortPopular: "Popular",
    sortFunded: "Most funded",
    by: "by",
    viewProfile: "View profile",
    share: "Share",
    donateNow: "Donate now to",
    amount: "Amount (€)",
    cancel: "Cancel",
    processing: "Processing...",
    success: "Donation completed! Thank you for your support.",
    error: "Payment error",
    summary: "Donation summary",
    total: "Total",
    orgShare: "To organization (80%)",
    platformFee: "Platform fee (20%)",
    confirmPay: "Confirm payment",
    back: "Change amount",
    minAmount: "Minimum amount: €1",
  },
  fr: {
    title: "Campagnes actives",
    empty: "Aucune campagne active pour le moment.",
    raised: "Collectés",
    donations: "dons",
    goal: "Objectif",
    noGoal: "Sans objectif",
    donate: "Donner maintenant",
    sortRecent: "Récentes",
    sortPopular: "Populaires",
    sortFunded: "Plus financées",
    by: "par",
    viewProfile: "Voir profil",
    share: "Partager",
    donateNow: "Donner à",
    amount: "Montant (€)",
    cancel: "Annuler",
    processing: "Traitement...",
    success: "Don effectué ! Merci pour votre soutien.",
    error: "Erreur de paiement",
    summary: "Résumé du don",
    total: "Total",
    orgShare: "Pour l'organisation (80%)",
    platformFee: "Commission plateforme (20%)",
    confirmPay: "Confirmer le paiement",
    back: "Modifier le montant",
    minAmount: "Montant minimum : 1€",
  },
  pt: {
    title: "Campanhas ativas",
    empty: "Nenhuma campanha ativa no momento.",
    raised: "Arrecadado",
    donations: "doações",
    goal: "Meta",
    noGoal: "Sem meta",
    donate: "Doar agora",
    sortRecent: "Recentes",
    sortPopular: "Populares",
    sortFunded: "Mais financiadas",
    by: "por",
    viewProfile: "Ver perfil",
    share: "Compartilhar",
    donateNow: "Doar para",
    amount: "Valor (€)",
    cancel: "Cancelar",
    processing: "Processando...",
    success: "Doação concluída! Obrigado pelo seu apoio.",
    error: "Erro no pagamento",
    summary: "Resumo da doação",
    total: "Total",
    orgShare: "Para a organização (80%)",
    platformFee: "Taxa da plataforma (20%)",
    confirmPay: "Confirmar pagamento",
    back: "Alterar valor",
    minAmount: "Valor mínimo: €1",
  },
  es: {
    title: "Campañas activas",
    empty: "No hay campañas activas en este momento.",
    raised: "Recaudado",
    donations: "donaciones",
    goal: "Objetivo",
    noGoal: "Sin objetivo",
    donate: "Donar ahora",
    sortRecent: "Recientes",
    sortPopular: "Populares",
    sortFunded: "Más financiadas",
    by: "por",
    viewProfile: "Ver perfil",
    share: "Compartir",
    donateNow: "Donar a",
    amount: "Importe (€)",
    cancel: "Cancelar",
    processing: "Procesando...",
    success: "¡Donación completada! Gracias por tu apoyo.",
    error: "Error en el pago",
    summary: "Resumen de la donación",
    total: "Total",
    orgShare: "Para la organización (80%)",
    platformFee: "Comisión plataforma (20%)",
    confirmPay: "Confirmar pago",
    back: "Cambiar importe",
    minAmount: "Importe mínimo: 1€",
  },
  ja: {
    title: "アクティブなキャンペーン",
    empty: "現在アクティブなキャンペーンはありません。",
    raised: "募金額",
    donations: "寄付",
    goal: "目標",
    noGoal: "目標なし",
    donate: "今すぐ寄付",
    sortRecent: "最新",
    sortPopular: "人気",
    sortFunded: "最も資金調達済み",
    by: "",
    viewProfile: "プロフィール",
    share: "共有",
    donateNow: "寄付先:",
    amount: "金額 (€)",
    cancel: "キャンセル",
    processing: "処理中...",
    success: "寄付が完了しました！ご支援ありがとうございます。",
    error: "支払いエラー",
    summary: "寄付の概要",
    total: "合計",
    orgShare: "組織へ (80%)",
    platformFee: "プラットフォーム手数料 (20%)",
    confirmPay: "支払いを確認",
    back: "金額を変更",
    minAmount: "最低金額: €1",
  },
};

type Lang = keyof typeof t;

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function CampaignPaymentForm({ clientSecret, onSuccess, onCancel, l }: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  l: typeof t.en;
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
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {l.cancel}
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/25"
        >
          {processing ? l.processing : l.confirmPay}
        </button>
      </div>
    </form>
  );
}

export default function CampaignsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { lang } = useLang();
  const l = t[lang as Lang] || t.en;
  const { share } = useShare();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [sort, setSort] = useState<"recent" | "popular" | "funded">("recent");
  const [donatingCampaign, setDonatingCampaign] = useState<Campaign | null>(null);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "summary" | "payment" | "done">("amount");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [stripeReady, setStripeReady] = useState(!!stripePromise);

  const { data: campaigns = [], isLoading: loading } = useQuery<Campaign[]>({
    queryKey: ["campaigns-active", sort],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/donations/campaigns/active?sort=${sort}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (!donatingCampaign) return;
    async function initStripe() {
      if (!stripePromise) {
        const res = await fetch("/api/donations/stripe-config");
        if (res.ok) {
          const { publishableKey } = await res.json();
          stripePromise = loadStripe(publishableKey);
          setStripeReady(true);
        }
      }
    }
    initStripe();
  }, [donatingCampaign]);

  async function handleCreatePaymentIntent() {
    if (!donatingCampaign) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) return;

    setCreating(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/donations/create-payment-intent", {
        method: "POST",
        headers,
        body: JSON.stringify({ campaignId: donatingCampaign.id, amount: numAmount }),
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

  const handleDonationSuccess = useCallback(async () => {
    setStep("done");
    toast({ title: l.success });

    if (paymentInfo?.clientSecret) {
      try {
        const piId = paymentInfo.clientSecret.split("_secret_")[0];
        const token = await getToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        await fetch("/api/donations/confirm-payment", {
          method: "POST",
          headers,
          body: JSON.stringify({ paymentIntentId: piId }),
        });
      } catch {}
    }

    const donatedAmount = Math.round(parseFloat(amount) * 100);
    queryClient.setQueryData<Campaign[]>(["campaigns-active", sort], (prev) =>
      (prev || []).map((c) =>
        c.id === donatingCampaign?.id
          ? { ...c, totalRaised: c.totalRaised + donatedAmount, donationCount: c.donationCount + 1 }
          : c
      )
    );

    setTimeout(() => {
      closeDonateModal();
    }, 2000);
  }, [amount, donatingCampaign, sort, queryClient, toast, l.success, paymentInfo, getToken]);

  function openDonateModal(c: Campaign) {
    setDonatingCampaign(c);
    setStep("amount");
    setAmount("");
    setClientSecret(null);
    setPaymentInfo(null);
  }

  function closeDonateModal() {
    setDonatingCampaign(null);
    setStep("amount");
    setAmount("");
    setClientSecret(null);
    setPaymentInfo(null);
  }

  function progressPercent(c: Campaign): number | null {
    if (!c.goalAmount || c.goalAmount <= 0) return null;
    return Math.min(100, Math.round((c.totalRaised / c.goalAmount) * 100));
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-foreground">{l.title}</h1>
        </div>

        <div className="flex gap-2 mb-5">
          {(["recent", "popular", "funded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "recent" ? l.sortRecent : s === "popular" ? l.sortPopular : l.sortFunded}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-emerald-500">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">{l.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const progress = progressPercent(c);
              return (
                <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <Link href={`/profile/${c.userId}`}>
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
                          {c.orgPhotoUrl ? (
                            <img src={c.orgPhotoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                              {(c.orgUsername || "?")[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">{c.title}</h3>
                        <Link href={`/profile/${c.userId}`}>
                          <p className="text-xs text-primary hover:underline cursor-pointer mt-0.5">
                            {l.by} {c.orgUsername}
                          </p>
                        </Link>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{c.description}</p>

                    <CampaignPhotoGrid photos={Array.isArray(c.photos) ? c.photos : []} className="mb-4" />

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="font-medium text-foreground">€{(c.totalRaised / 100).toFixed(2)} {l.raised}</span>
                      <span>{c.donationCount} {l.donations}</span>
                      {c.goalAmount ? (
                        <span>{l.goal}: €{(c.goalAmount / 100).toFixed(2)}</span>
                      ) : (
                        <span className="italic">{l.noGoal}</span>
                      )}
                    </div>

                    {progress !== null && (
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => openDonateModal(c)}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
                      >
                        {l.donate}
                      </button>
                      <button
                        onClick={() => share({
                          title: c.title,
                          text: c.description,
                          path: `/profile/${c.userId}`,
                        })}
                        className="flex items-center justify-center w-11 h-11 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={l.share}
                      >
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/>
                          <circle cx="6" cy="12" r="3"/>
                          <circle cx="18" cy="19" r="3"/>
                          <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {donatingCampaign && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{l.donateNow} {donatingCampaign.orgUsername}</h2>
              <button onClick={closeDonateModal} className="p-1 hover:bg-muted rounded-lg">
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
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md shadow-emerald-600/20"
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
                    <span className="font-semibold text-lg">€{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{l.orgShare}</span>
                    <span>€{(parseFloat(amount) * 0.8).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{l.platformFee}</span>
                    <span>€{(parseFloat(amount) * 0.2).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("amount")}
                    className="flex-1 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted"
                  >
                    {l.back}
                  </button>
                  <button
                    onClick={handleCreatePaymentIntent}
                    disabled={creating}
                    className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-600/25"
                  >
                    {creating ? l.processing : l.confirmPay}
                  </button>
                </div>
              </div>
            )}

            {step === "payment" && clientSecret && stripeReady && stripePromise && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                <CampaignPaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handleDonationSuccess}
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
    </Layout>
  );
}
