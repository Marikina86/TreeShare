import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface ReportModalProps {
  targetType: "user" | "tree";
  reportedUserId: string;
  reportedUsername?: string;
  treeId?: number;
  onClose: () => void;
}

const REASONS = [
  { value: "foto_non_vegetale",          it: "Foto non è una pianta/albero",         en: "Photo is not a plant/tree" },
  { value: "contenuto_falso",            it: "Contenuto falso o fuorviante",          en: "False or misleading content" },
  { value: "spam",                       it: "Spam o contenuto ripetitivo",           en: "Spam or repetitive content" },
  { value: "comportamento_inappropriato", it: "Comportamento inappropriato",          en: "Inappropriate behaviour" },
  { value: "violazione_privacy",         it: "Violazione della privacy",              en: "Privacy violation" },
  { value: "altro",                      it: "Altro",                                 en: "Other" },
];

export default function ReportModal({
  targetType,
  reportedUserId,
  reportedUsername,
  treeId,
  onClose,
}: ReportModalProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const lang = (navigator.language || "it").startsWith("it") ? "it" : "en";
  const t = {
    title:      lang === "it" ? (targetType === "tree" ? "Segnala foto" : "Segnala utente") : (targetType === "tree" ? "Report photo" : "Report user"),
    subtitle:   lang === "it" ? `@${reportedUsername ?? reportedUserId}` : `@${reportedUsername ?? reportedUserId}`,
    reasonLabel: lang === "it" ? "Motivo *" : "Reason *",
    notesLabel:  lang === "it" ? "Note aggiuntive (opzionale)" : "Additional notes (optional)",
    notesPlh:    lang === "it" ? "Descrivi il problema..." : "Describe the issue...",
    send:        lang === "it" ? "Invia segnalazione" : "Send report",
    cancel:      lang === "it" ? "Annulla" : "Cancel",
    selectReason: lang === "it" ? "Seleziona un motivo" : "Select a reason",
    successTitle: lang === "it" ? "Segnalazione inviata" : "Report sent",
    successDesc:  lang === "it" ? "Grazie. Il nostro team esaminerà la segnalazione." : "Thank you. Our team will review the report.",
    alreadyTitle: lang === "it" ? "Già segnalato" : "Already reported",
    alreadyDesc:  lang === "it" ? "Hai già segnalato questo contenuto." : "You have already reported this content.",
    errorTitle:   lang === "it" ? "Errore" : "Error",
    errorDesc:    lang === "it" ? "Impossibile inviare la segnalazione. Riprova." : "Unable to send the report. Try again.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportedUserId,
          ...(treeId != null ? { treeId } : {}),
          reason,
          notes: notes.trim() || null,
        }),
      });

      if (res.status === 409) {
        toast({ title: t.alreadyTitle, description: t.alreadyDesc, variant: "destructive" });
        onClose();
        return;
      }
      if (!res.ok) throw new Error();
      toast({ title: t.successTitle, description: t.successDesc });
      onClose();
    } catch {
      toast({ title: t.errorTitle, description: t.errorDesc, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-5 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-base">{t.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t.reasonLabel}</label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    reason === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-foreground">{lang === "it" ? r.it : r.en}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t.notesLabel}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlh}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!reason || loading}
              className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {loading ? "..." : t.send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
