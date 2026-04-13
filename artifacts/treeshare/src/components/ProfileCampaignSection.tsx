import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { useShare } from "@/hooks/useShare";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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

const labels = {
  it: {
    raised: "Raccolti", goal: "Obiettivo", donations: "donazioni", myCampaign: "La mia campagna",
    donateNow: "Dona ora",
    amount: "Importo (€)", cancel: "Annulla", processing: "Elaborazione...",
    success: "Donazione completata! Grazie per il tuo supporto.", error: "Errore nel pagamento",
    summary: "Riepilogo donazione", total: "Totale",
    orgShare: "Per l'organizzazione (80%)", platformFee: "Commissione piattaforma (20%)",
    confirmPay: "Conferma pagamento", back: "Modifica importo", minAmount: "Importo minimo: €1",
    donate: "Dona",
  },
  en: {
    raised: "Raised", goal: "Goal", donations: "donations", myCampaign: "My campaign",
    donateNow: "Donate now",
    amount: "Amount (€)", cancel: "Cancel", processing: "Processing...",
    success: "Donation completed! Thank you for your support.", error: "Payment error",
    summary: "Donation summary", total: "Total",
    orgShare: "To organization (80%)", platformFee: "Platform fee (20%)",
    confirmPay: "Confirm payment", back: "Change amount", minAmount: "Minimum amount: €1",
    donate: "Donate",
  },
  fr: {
    raised: "Collectés", goal: "Objectif", donations: "dons", myCampaign: "Ma campagne",
    donateNow: "Donner maintenant",
    amount: "Montant (€)", cancel: "Annuler", processing: "Traitement...",
    success: "Don effectué ! Merci pour votre soutien.", error: "Erreur de paiement",
    summary: "Résumé du don", total: "Total",
    orgShare: "Pour l'organisation (80%)", platformFee: "Commission plateforme (20%)",
    confirmPay: "Confirmer le paiement", back: "Modifier le montant", minAmount: "Montant minimum : 1€",
    donate: "Donner",
  },
  pt: {
    raised: "Arrecadado", goal: "Meta", donations: "doações", myCampaign: "Minha campanha",
    donateNow: "Doar agora",
    amount: "Valor (€)", cancel: "Cancelar", processing: "Processando...",
    success: "Doação concluída! Obrigado pelo seu apoio.", error: "Erro no pagamento",
    summary: "Resumo da doação", total: "Total",
    orgShare: "Para a organização (80%)", platformFee: "Taxa da plataforma (20%)",
    confirmPay: "Confirmar pagamento", back: "Alterar valor", minAmount: "Valor mínimo: €1",
    donate: "Doar",
  },
  es: {
    raised: "Recaudado", goal: "Objetivo", donations: "donaciones", myCampaign: "Mi campaña",
    donateNow: "Donar ahora",
    amount: "Importe (€)", cancel: "Cancelar", processing: "Procesando...",
    success: "¡Donación completada! Gracias por tu apoyo.", error: "Error en el pago",
    summary: "Resumen de la donación", total: "Total",
    orgShare: "Para la organización (80%)", platformFee: "Comisión plataforma (20%)",
    confirmPay: "Confirmar pago", back: "Cambiar importe", minAmount: "Importe mínimo: 1€",
    donate: "Donar",
  },
  ja: {
    raised: "集まった", goal: "目標", donations: "寄付", myCampaign: "マイキャンペーン",
    donateNow: "今すぐ寄付",
    amount: "金額 (€)", cancel: "キャンセル", processing: "処理中...",
    success: "寄付が完了しました！ご支援ありがとうございます。", error: "支払いエラー",
    summary: "寄付の概要", total: "合計",
    orgShare: "組織へ (80%)", platformFee: "プラットフォーム手数料 (20%)",
    confirmPay: "支払いを確認", back: "金額を変更", minAmount: "最低金額: €1",
    donate: "寄付する",
  },
};

type Lang = keyof typeof labels;

import { CampaignPhotoGridCompact } from "@/components/PhotoLightbox";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function ProfilePaymentForm({ clientSecret, onSuccess, onCancel, l }: {
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

export default function ProfileCampaignSection({ profileUserId, isOwnProfile }: {
  profileUserId: string;
  isOwnProfile: boolean;
}) {
  const { lang } = useLang();
  const l = labels[lang as Lang] || labels.en;
  const { share } = useShare();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "summary" | "payment" | "done">("amount");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [stripeReady, setStripeReady] = useState(!!stripePromise);

  const { data: campaign } = useQuery<Campaign | null>({
    queryKey: ["profile-campaign", profileUserId],
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
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const { publishableKey } = await res.json();
          stripePromise = loadStripe(publishableKey);
          setStripeReady(true);
        }
      }
    }
    initStripe();
  }, [showModal]);

  async function handleCreatePaymentIntent() {
    if (!campaign) return;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) return;

    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/donations/create-payment-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, amount: numAmount }),
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
    queryClient.setQueryData<Campaign | null>(["profile-campaign", profileUserId], (prev) =>
      prev ? { ...prev, totalRaised: prev.totalRaised + donatedAmount, donationCount: prev.donationCount + 1 } : prev
    );
    queryClient.invalidateQueries({ queryKey: ["campaigns-active"] });
    setTimeout(() => {
      closeModal();
    }, 2000);
  }, [amount, profileUserId, queryClient, toast, l.success, paymentInfo, getToken]);

  function closeModal() {
    setShowModal(false);
    setStep("amount");
    setAmount("");
    setClientSecret(null);
    setPaymentInfo(null);
  }

  if (!campaign) return null;

  const photos = Array.isArray(campaign.photos) ? campaign.photos : [];
  const progress = campaign.goalAmount ? Math.min(100, (campaign.totalRaised / campaign.goalAmount) * 100) : null;
  const canDonate = !isOwnProfile && !!user;

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
            {isOwnProfile && (
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">{l.myCampaign}</p>
            )}
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{campaign.title}</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 line-clamp-2">{campaign.description}</p>
          </div>
          <button
            onClick={() => share({
              title: campaign.title,
              text: campaign.description,
              path: `/profile/${profileUserId}`,
            })}
            className="flex-shrink-0 p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            title="Condividi"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
            </svg>
          </button>
        </div>

        <CampaignPhotoGridCompact photos={photos} className="mb-3" />

        <div className="flex items-center gap-4 text-xs text-emerald-600 dark:text-emerald-400 mb-3">
          <span className="font-semibold">€{(campaign.totalRaised / 100).toFixed(2)} {l.raised}</span>
          {campaign.goalAmount && (
            <span>{l.goal}: €{(campaign.goalAmount / 100).toFixed(2)}</span>
          )}
          <span>{campaign.donationCount} {l.donations}</span>
        </div>

        {progress !== null && (
          <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {canDonate && (
          <button
            onClick={() => { setShowModal(true); setStep("amount"); }}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-base font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20"
          >
            {l.donateNow}
          </button>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">{l.donateNow}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-lg">
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
                <ProfilePaymentForm
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
