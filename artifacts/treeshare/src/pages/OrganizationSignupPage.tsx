import { useState, useMemo } from "react";
import CityAutocomplete from "@/components/CityAutocomplete";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
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
  Phone,
  User,
  Lock,
  ChevronLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
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
  telefono: z.string().min(6, "Telefono obbligatorio").max(20),
  referenteNome: z.string().min(2, "Nome obbligatorio").max(100),
  referenteCognome: z.string().min(2, "Cognome obbligatorio").max(100),

  username: z
    .string()
    .min(3, "Username minimo 3 caratteri")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore"),
  password: z.string().min(8, "Password minimo 8 caratteri").max(100),
  ruoloUtente: z.string().min(1, "Ruolo obbligatorio"),
  numeroLicenze: z.coerce
    .number({ invalid_type_error: "Numero non valido" })
    .int()
    .min(1, "Minimo 1 licenza")
    .max(10000, "Massimo 10.000 licenze"),
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
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/register-ente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          numeroLicenze: Number(data.numeroLicenze),
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

      setSuccess(true);
    } catch {
      setServerError("Impossibile contattare il server. Riprova più tardi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Registrazione completata!</h2>
            <p className="text-muted-foreground">
              Il tuo ente è stato registrato con successo su TreeShare.
              Il team verificherà i dati e ti contatterà all'email fornita.
            </p>
            <Button className="w-full mt-4" onClick={() => setLocation("/")}>
              Torna alla home
            </Button>
          </CardContent>
        </Card>
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
                <Label htmlFor="telefono">
                  Telefono <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="es. +39 06 1234567"
                  {...register("telefono")}
                  className={errors.telefono ? "border-destructive" : ""}
                />
                <FieldError message={errors.telefono?.message} />
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
                  Username <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="es. comune_roma"
                    className={`pl-9 ${errors.username ? "border-destructive" : ""}`}
                    {...register("username")}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo lettere, numeri e underscore (_)
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
                  Numero di utenti / licenze previste <span className="text-destructive">*</span>
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

          <p className="text-center text-xs text-muted-foreground leading-relaxed px-2">
            Cliccando su &ldquo;Registra l&rsquo;ente&rdquo; dichiaro di aver preso visione e accetto l&rsquo;<Link to="/privacy" className="underline text-primary">informativa sulla privacy</Link>, i <Link to="/terms" className="underline text-primary">termini e condizioni</Link> e l&rsquo;informativa AI.
          </p>

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
