import { useState, useMemo, useEffect } from "react";
import CityAutocomplete from "@/components/CityAutocomplete";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  MapPin,
  User,
  Lock,
  ChevronLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Leaf,
} from "lucide-react";

function checkPartitaIVA(piva: string): boolean {
  const clean = piva.replace(/\s/g, "");
  if (!/^\d{11}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const d = parseInt(clean[i]!, 10);
    if (i % 2 === 0) {
      sum += d;
    } else {
      const doubled = d * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  return (10 - (sum % 10)) % 10 === parseInt(clean[10]!, 10);
}

function checkCodiceFiscaleEnte(cf: string): boolean {
  const clean = cf.replace(/\s/g, "").toUpperCase();
  if (/^\d{11}$/.test(clean)) return checkPartitaIVA(clean);
  if (/^[A-Z0-9]{16}$/.test(clean)) return true;
  return false;
}

const schema = z.object({
  ragioneSociale: z.string().min(2, "Ragione sociale obbligatoria").max(200),
  partitaIva: z
    .string()
    .length(11, "La Partita IVA deve contenere esattamente 11 cifre")
    .regex(/^\d{11}$/, "La Partita IVA deve contenere solo cifre")
    .refine(checkPartitaIVA, "Partita IVA non valida (checksum errato)"),
  codiceFiscale: z
    .string()
    .min(11, "Codice fiscale obbligatorio")
    .max(16, "Codice fiscale non valido")
    .refine(checkCodiceFiscaleEnte, "Codice fiscale non valido"),
  codiceUnivoco: z
    .string()
    .min(6, "Il Codice Univoco SDI deve avere 6 o 7 caratteri")
    .max(7, "Il Codice Univoco SDI deve avere 6 o 7 caratteri")
    .regex(/^[A-Z0-9]{6,7}$/i, "Codice Univoco SDI non valido (6-7 caratteri alfanumerici)"),
  formaGiuridica: z.string().min(1, "Forma giuridica obbligatoria"),
  numeroRegistroImprese: z.string().max(50).optional(),

  indirizzoVia: z.string().min(3, "Indirizzo obbligatorio").max(200),
  indirizzoCitta: z.string().min(2, "Città obbligatoria").max(100),
  indirizzoProvncia: z.string().max(50).optional(),
  indirizzoCap: z.string().min(4, "CAP obbligatorio").max(10),
  indirizzoStato: z.string().min(2, "Stato obbligatorio").max(100),

  emailUfficiale: z.string().email("Email non valida"),
  pec: z.string().email("Indirizzo PEC non valido").refine(
    (v) => {
      const domain = v.toLowerCase().slice(v.indexOf("@") + 1);
      const knownPec = ["legalmail.it", "postecert.it", "actaliscertymail.it"];
      return domain.includes("pec") || knownPec.some(d => domain === d || domain.endsWith("." + d));
    },
    "Inserisci un indirizzo PEC valido (es. nome@pec.it)"
  ),
  referenteNome: z.string().min(1, "Nome referente obbligatorio").max(100),
  referenteCognome: z.string().min(1, "Cognome referente obbligatorio").max(100),

  username: z.preprocess(v => (v === "" ? undefined : v), z.string().max(50).optional()),
  password: z.string().min(8, "Password minimo 8 caratteri").max(100),
  confirmPassword: z.string().min(1, "Ripeti la password"),
  ruoloUtente: z.string().min(1, "Ruolo obbligatorio"),
  numeroLicenze: z.coerce
    .number({ invalid_type_error: "Numero non valido" })
    .int()
    .min(1, "Minimo 1 licenza")
    .max(10000, "Massimo 10.000 licenze")
    .optional()
    .default(1),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

const FORME_GIURIDICHE = [
  { value: "srl", label: "S.r.l. – Società a responsabilità limitata" },
  { value: "spa", label: "S.p.A. – Società per azioni" },
  { value: "sas", label: "S.a.s. – Società in accomandita semplice" },
  { value: "snc", label: "S.n.c. – Società in nome collettivo" },
  { value: "ditta_individuale", label: "Ditta individuale" },
  { value: "associazione", label: "Associazione (APS/ODV)" },
  { value: "fondazione", label: "Fondazione" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "ente_pubblico", label: "Ente pubblico / Comune" },
  { value: "altro", label: "Altro" },
];

const RUOLI = [
  { value: "admin", label: "Amministratore" },
  { value: "manager", label: "Manager" },
  { value: "referente", label: "Referente" },
  { value: "operatore", label: "Operatore" },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "bg-muted" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "Debole", color: "bg-red-500" };
  if (score === 2) return { score: 40, label: "Bassa", color: "bg-orange-400" };
  if (score === 3) return { score: 60, label: "Media", color: "bg-yellow-400" };
  if (score === 4) return { score: 80, label: "Forte", color: "bg-lime-500" };
  return { score: 100, label: "Ottima", color: "bg-green-500" };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
    </div>
  );
}

export default function OrganizationSignupPage() {
  const [, setLocation] = useLocation();

  const [policyNotes, setPolicyNotes] = useState<{
    privacy: string | null;
    terms: string | null;
    location: string | null;
    marketing: string | null;
  }>({ privacy: null, terms: null, location: null, marketing: null });

  useEffect(() => {
    (["privacy", "terms", "location", "marketing"] as const).forEach(async (type) => {
      try {
        const r = await fetch(`/api/policies/${type}`);
        if (!r.ok) return;
        const data = await r.json();
        if (data?.consentNote) setPolicyNotes((p) => ({ ...p, [type]: data.consentNote }));
      } catch {}
    });
  }, []);

  const [step, setStep] = useState<"form" | "verify">("form");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [locationConsent, setLocationConsent] = useState<boolean | null>(null);
  const [marketingConsent, setMarketingConsent] = useState<boolean | null>(null);
  const [consentErrors, setConsentErrors] = useState<{ privacy?: string; terms?: string; location?: string; marketing?: string }>({});
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedPec, setVerifiedPec] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { numeroLicenze: 1, indirizzoStato: "Italia" },
  });

  const passwordValue = watch("password") ?? "";
  const strength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);

  const onSubmit = async (data: FormValues) => {
    const ce: { privacy?: string; terms?: string; location?: string; marketing?: string } = {};
    if (!acceptPrivacy) ce.privacy = "Devi accettare l'informativa sulla privacy";
    if (!acceptTerms) ce.terms = "Devi accettare i termini e condizioni";
    if (locationConsent === null) ce.location = "Devi effettuare una scelta";
    if (marketingConsent === null) ce.marketing = "Devi effettuare una scelta";
    if (Object.keys(ce).length > 0) {
      setConsentErrors(ce);
      return;
    }
    setConsentErrors({});
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/register-ente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          confirmPassword: undefined,
          numeroLicenze: data.numeroLicenze ? Number(data.numeroLicenze) : 1,
          acceptPrivacy: true,
          acceptTerms: true,
        }),
      });

      const json = await res.json() as {
        error?: string;
        fields?: Record<string, string>;
        id?: number;
      };

      if (!res.ok) {
        if (json.fields) {
          for (const [field, message] of Object.entries(json.fields)) {
            setError(field as keyof FormValues, { message });
          }
        } else {
          setServerError(json.error ?? "Errore durante la registrazione.");
        }
        return;
      }

      // Registrazione completata — mostra schermata "controlla PEC"
      setVerifiedEmail(data.emailUfficiale);
      setVerifiedPec((json as { pec?: string }).pec ?? data.pec ?? "");
      setStep("verify");
    } catch {
      setServerError("Impossibile contattare il server. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  };

  async function handleResendEmail() {
    setResending(true);
    setResendMsg(null);
    setVerifyError(null);
    try {
      const res = await fetch("/api/register-ente/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifiedEmail.trim(), pec: verifiedPec.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setVerifyError((json as { error?: string }).error || "Errore nell'invio.");
        return;
      }
      setResendMsg("Link inviato alla PEC! Controlla la tua casella (anche lo spam).");
    } catch {
      setVerifyError("Errore nell'invio dell'email. Riprova.");
    } finally {
      setResending(false);
    }
  }

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                <Leaf className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-1">Controlla la tua PEC</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Abbiamo inviato il link di verifica alla PEC{" "}
              <strong className="text-foreground">{verifiedPec || verifiedEmail}</strong>
            </p>
          </div>

          <div className="space-y-4">
            {verifyError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {verifyError}
              </div>
            )}
            {resendMsg && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {resendMsg}
              </div>
            )}

            <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">1</div>
                <p className="text-sm text-foreground">Apri la PEC che ti abbiamo appena inviato</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">2</div>
                <p className="text-sm text-foreground">Clicca sul link di conferma nella PEC per attivare il profilo</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0 mt-0.5">3</div>
                <p className="text-sm text-foreground">Torna qui e accedi con le tue credenziali</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Non trovi la PEC? Controlla la cartella spam o la posta indesiderata.
            </p>

            <button
              onClick={() => setLocation("/sign-in")}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2 transition-opacity"
            >
              Vai all'accesso
            </button>

            <button
              type="button"
              onClick={handleResendEmail}
              disabled={resending}
              className="w-full py-2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {resending && (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              Rinvia link alla PEC
            </button>

            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Indietro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="py-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/register">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Indietro
            </Link>
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground">
              <Building2 className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Registrazione Ente</h1>
          <p className="text-muted-foreground mt-2">
            Iscrive la tua organizzazione a TreeShare per monitorare e documentare
            le piantumazioni del tuo ente.
          </p>
        </div>

        {serverError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* SEZIONE 1: Dati identificativi */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <SectionHeader icon={Building2} title="1. Dati identificativi ente" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ragioneSociale">
                  Ragione sociale / Nome ente <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ragioneSociale"
                  placeholder="es. Comune di Roma"
                  {...register("ragioneSociale")}
                  className={errors.ragioneSociale ? "border-destructive" : ""}
                />
                <FieldError message={errors.ragioneSociale?.message} />
              </div>

              <div>
                <Label htmlFor="partitaIva">
                  Partita IVA <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="partitaIva"
                  placeholder="es. 12345678901 (11 cifre)"
                  maxLength={11}
                  {...register("partitaIva")}
                  className={errors.partitaIva ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">11 cifre — il checksum viene verificato automaticamente</p>
                <FieldError message={errors.partitaIva?.message} />
              </div>

              <div>
                <Label htmlFor="codiceFiscale">
                  Codice Fiscale <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codiceFiscale"
                  placeholder="es. 12345678901 oppure RSSMRA80A01H501U"
                  maxLength={16}
                  {...register("codiceFiscale")}
                  className={errors.codiceFiscale ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">11 cifre per enti commerciali, 16 caratteri per persone giuridiche</p>
                <FieldError message={errors.codiceFiscale?.message} />
              </div>

              <div>
                <Label htmlFor="codiceUnivoco">
                  Codice Univoco SDI <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codiceUnivoco"
                  placeholder="es. XXXXXXX (6-7 caratteri)"
                  maxLength={7}
                  {...register("codiceUnivoco")}
                  className={errors.codiceUnivoco ? "border-destructive" : ""}
                  style={{ textTransform: "uppercase" }}
                />
                <p className="text-xs text-muted-foreground mt-1">Codice destinatario per la fatturazione elettronica (6 cifre PA, 7 caratteri privati)</p>
                <FieldError message={errors.codiceUnivoco?.message} />
              </div>

              <div>
                <Label htmlFor="formaGiuridica">
                  Forma giuridica / Tipo ente <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(v) => setValue("formaGiuridica", v, { shouldValidate: true })}
                >
                  <SelectTrigger
                    id="formaGiuridica"
                    className={errors.formaGiuridica ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Seleziona tipo ente" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORME_GIURIDICHE.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.formaGiuridica?.message} />
              </div>

              <div>
                <Label htmlFor="numeroRegistroImprese">
                  Numero registro imprese <span className="text-muted-foreground text-xs">(opzionale)</span>
                </Label>
                <Input
                  id="numeroRegistroImprese"
                  placeholder="es. MI-1234567"
                  {...register("numeroRegistroImprese")}
                />
                <FieldError message={errors.numeroRegistroImprese?.message} />
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 2: Dati di contatto */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <SectionHeader icon={MapPin} title="2. Dati di contatto" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="indirizzoVia">
                  Via / Indirizzo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="indirizzoVia"
                  placeholder="es. Via Roma 1"
                  {...register("indirizzoVia")}
                  className={errors.indirizzoVia ? "border-destructive" : ""}
                />
                <FieldError message={errors.indirizzoVia?.message} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="indirizzoCitta">
                    Città <span className="text-destructive">*</span>
                  </Label>
                  <CityAutocomplete
                    value={watch("indirizzoCitta") ?? ""}
                    placeholder="es. Milano"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    hasError={!!errors.indirizzoCitta}
                    onChange={(city, province, cap) => {
                      setValue("indirizzoCitta", city, { shouldValidate: true });
                      if (province) setValue("indirizzoProvncia", province);
                      if (cap) setValue("indirizzoCap", cap, { shouldValidate: true });
                    }}
                  />
                  <FieldError message={errors.indirizzoCitta?.message} />
                </div>
                <div>
                  <Label htmlFor="indirizzoProvncia">
                    Provincia
                  </Label>
                  <Input
                    id="indirizzoProvncia"
                    placeholder="es. MI"
                    {...register("indirizzoProvncia")}
                    className={errors.indirizzoProvncia ? "border-destructive" : ""}
                  />
                  <FieldError message={errors.indirizzoProvncia?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="indirizzoCap">
                    CAP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="indirizzoCap"
                    placeholder="es. 20100"
                    {...register("indirizzoCap")}
                    className={errors.indirizzoCap ? "border-destructive" : ""}
                  />
                  <FieldError message={errors.indirizzoCap?.message} />
                </div>
              </div>

              <div>
                <Label htmlFor="indirizzoStato">
                  Stato / Paese <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="indirizzoStato"
                  placeholder="es. Italia"
                  {...register("indirizzoStato")}
                  className={errors.indirizzoStato ? "border-destructive" : ""}
                />
                <FieldError message={errors.indirizzoStato?.message} />
              </div>

              <div>
                <Label htmlFor="emailUfficiale">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="emailUfficiale"
                  type="email"
                  placeholder="es. info@comune.roma.it"
                  {...register("emailUfficiale")}
                  className={errors.emailUfficiale ? "border-destructive" : ""}
                />
                <FieldError message={errors.emailUfficiale?.message} />
              </div>

              <div>
                <Label htmlFor="pec">
                  PEC <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pec"
                  type="email"
                  placeholder="es. comune.roma@pec.it"
                  {...register("pec")}
                  className={errors.pec ? "border-destructive" : ""}
                />
                <FieldError message={errors.pec?.message} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="referenteNome">
                    Nome referente <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="referenteNome"
                    placeholder="es. Mario"
                    {...register("referenteNome")}
                    className={errors.referenteNome ? "border-destructive" : ""}
                  />
                  <FieldError message={errors.referenteNome?.message} />
                </div>
                <div>
                  <Label htmlFor="referenteCognome">
                    Cognome referente <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="referenteCognome"
                    placeholder="es. Rossi"
                    {...register("referenteCognome")}
                    className={errors.referenteCognome ? "border-destructive" : ""}
                  />
                  <FieldError message={errors.referenteCognome?.message} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 3: Accesso e gestione */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <SectionHeader icon={Lock} title="3. Accesso e gestione" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">
                  Username <span className="text-muted-foreground font-normal text-xs">(opzionale)</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="es. comune_roma (facoltativo)"
                    className={`pl-9 ${errors.username ? "border-destructive" : ""}`}
                    {...register("username")}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Facoltativo — solo lettere, numeri e underscore (_). Generato automaticamente se lasciato vuoto.
                </p>
                <FieldError message={errors.username?.message} />
              </div>

              <div>
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 8 caratteri"
                    className={`pl-9 pr-10 ${errors.password ? "border-destructive" : ""}`}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordValue && (
                  <div className="mt-2 space-y-1">
                    <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sicurezza: <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
                <FieldError message={errors.password?.message} />
              </div>

              <div>
                <Label htmlFor="confirmPassword">
                  Ripeti password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ripeti la password"
                    className={`pl-9 pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError message={errors.confirmPassword?.message} />
              </div>

              <div>
                <Label htmlFor="ruoloUtente">
                  Ruolo del responsabile <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(v) => setValue("ruoloUtente", v, { shouldValidate: true })}
                >
                  <SelectTrigger
                    id="ruoloUtente"
                    className={errors.ruoloUtente ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {RUOLI.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.ruoloUtente?.message} />
              </div>

              <div>
                <Label htmlFor="numeroLicenze">
                  Numero di utenti / licenze previste
                </Label>
                <Input
                  id="numeroLicenze"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="es. 10"
                  {...register("numeroLicenze")}
                  className={errors.numeroLicenze ? "border-destructive" : ""}
                />
                <FieldError message={errors.numeroLicenze?.message} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 pb-5 space-y-4">
              <p className="text-sm font-semibold text-foreground">Consensi obbligatori <span className="text-destructive">*</span></p>

              {/* Privacy */}
              <label className={`flex items-start gap-3 cursor-pointer group ${consentErrors.privacy ? "text-destructive" : ""}`}>
                <input
                  type="checkbox"
                  checked={acceptPrivacy}
                  onChange={(e) => {
                    setAcceptPrivacy(e.target.checked);
                    setConsentErrors((prev) => ({ ...prev, privacy: undefined }));
                  }}
                  className="mt-1 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                />
                <span className="text-sm leading-snug">
                  {policyNotes.privacy
                    ? <>{policyNotes.privacy} <span className="text-destructive">*</span></>
                    : <>Dichiaro di aver letto e compreso la <Link to="/privacy" className="underline text-primary font-medium">privacy policy</Link> <span className="text-destructive">*</span></>}
                </span>
              </label>
              {consentErrors.privacy && (
                <p className="flex items-center gap-1 text-xs text-destructive ml-7">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {consentErrors.privacy}
                </p>
              )}

              {/* Termini */}
              <label className={`flex items-start gap-3 cursor-pointer group ${consentErrors.terms ? "text-destructive" : ""}`}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    setConsentErrors((prev) => ({ ...prev, terms: undefined }));
                  }}
                  className="mt-1 h-4 w-4 rounded border-border accent-primary flex-shrink-0"
                />
                <span className="text-sm leading-snug">
                  {policyNotes.terms
                    ? <>{policyNotes.terms} <span className="text-destructive">*</span></>
                    : <>Ho letto e accetto i <Link to="/terms" className="underline text-primary font-medium">termini e condizioni</Link> <span className="text-destructive">*</span></>}
                </span>
              </label>
              {consentErrors.terms && (
                <p className="flex items-center gap-1 text-xs text-destructive ml-7">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {consentErrors.terms}
                </p>
              )}

              {/* Consenso posizione */}
              <div className={`space-y-2 ${consentErrors.location ? "text-destructive" : ""}`}>
                <p className="text-sm leading-snug text-foreground">
                  {policyNotes.location
                    ? <>{policyNotes.location} <span className="text-destructive">*</span></>
                    : <>Acconsento all&rsquo;utilizzo della mia posizione per localizzare gli alberi e migliorare i servizi offerti. <span className="text-destructive">*</span></>}
                </p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationConsentOrg"
                      checked={locationConsent === true}
                      onChange={() => { setLocationConsent(true); setConsentErrors((p) => ({ ...p, location: undefined })); }}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium">Sì</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="locationConsentOrg"
                      checked={locationConsent === false}
                      onChange={() => { setLocationConsent(false); setConsentErrors((p) => ({ ...p, location: undefined })); }}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium">No</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Puoi revocare il consenso in qualsiasi momento dalle impostazioni.</p>
                {consentErrors.location && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {consentErrors.location}
                  </p>
                )}
              </div>

              {/* Consenso marketing */}
              <div className={`space-y-2 ${consentErrors.marketing ? "text-destructive" : ""}`}>
                <p className="text-sm leading-snug text-foreground">
                  {policyNotes.marketing
                    ? <>{policyNotes.marketing} <span className="text-destructive">*</span></>
                    : <>Acconsento a ricevere notifiche promozionali e comunicazioni commerciali e all&rsquo;analisi delle mie preferenze e attività per ricevere suggerimenti personalizzati. <span className="text-destructive">*</span></>}
                </p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marketingConsentOrg"
                      checked={marketingConsent === true}
                      onChange={() => { setMarketingConsent(true); setConsentErrors((p) => ({ ...p, marketing: undefined })); }}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium">Sì</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="marketingConsentOrg"
                      checked={marketingConsent === false}
                      onChange={() => { setMarketingConsent(false); setConsentErrors((p) => ({ ...p, marketing: undefined })); }}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <span className="text-sm font-medium">No</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Puoi disattivarle in qualsiasi momento dalle impostazioni.</p>
                {consentErrors.marketing && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    {consentErrors.marketing}
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Registrandoti, prendi atto della nostra{" "}
                <Link to="/cookies" className="underline text-primary font-medium">Cookie Policy</Link>.
              </p>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                Registrazione in corso...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Registra l'ente
              </span>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Sei già registrato?{" "}
            <Link to="/sign-in" className="underline text-primary">
              Accedi
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
