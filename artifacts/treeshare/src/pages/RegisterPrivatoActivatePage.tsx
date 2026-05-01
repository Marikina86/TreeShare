import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Leaf, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

export default function RegisterPrivatoActivatePage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function activate() {
      try {
        // Supabase inserisce access_token nel fragment dell'URL dopo la conferma email.
        // onAuthStateChange li processa automaticamente — aspettiamo la sessione.
        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 8000);
            const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
              if (s) {
                session = s;
                clearTimeout(timeout);
                sub.subscription.unsubscribe();
                resolve();
              }
            });
          });
        }

        if (!session) {
          setErrorMsg("Sessione non trovata. Il link potrebbe essere scaduto.");
          setStatus("error");
          return;
        }

        const token = session.access_token;
        const meta = session.user.user_metadata ?? {};

        // Costruisce username dal nome/cognome salvato nei metadata
        const rawUsername =
          (meta.username as string | undefined) ||
          [meta.first_name, meta.last_name].filter(Boolean).join("_") ||
          (session.user.email?.split("@")[0] ?? "user");
        const username = rawUsername
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_.-]/g, "")
          .slice(0, 30) || "user";

        // Recupera i dati della città dai metadati
        const rawCity = meta.city as string | undefined;
        const province = meta.province as string | undefined;
        const cityDisplay = rawCity
          ? province
            ? `${rawCity} (${province})`
            : rawCity
          : null;

        // Crea/aggiorna il profilo nel DB con i dati completi del form
        const res = await fetch("/api/users/me", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            username,
            photoUrl: meta.avatar_url || null,
            city: cityDisplay,
            country: "Italia",
          }),
        });

        if (res.ok) {
          setStatus("success");
          setTimeout(() => {
            navigate(cityDisplay ? "/feed" : "/onboarding");
          }, 2000);
        } else {
          const body = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
          setErrorMsg(body.error ?? "Errore nella creazione del profilo.");
          setStatus("error");
        }
      } catch {
        setErrorMsg("Errore di rete. Riprova o contatta l'assistenza.");
        setStatus("error");
      }
    }

    activate();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-green-700 flex items-center justify-center">
            <Leaf className="w-9 h-9 text-white" />
          </div>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-green-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Attivazione in corso…</h1>
            <p className="text-gray-500 text-sm">Stiamo creando il tuo profilo.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Profilo creato!</h1>
            <p className="text-gray-500 text-sm mb-6">
              Il tuo account è stato attivato con successo. Reindirizzamento…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Attivazione fallita</h1>
            <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate("/register-privato")}
                className="bg-green-700 hover:bg-green-800 text-white"
              >
                Torna alla registrazione
              </Button>
              <Button variant="outline" onClick={() => navigate("/sign-in")}>
                Accedi
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
