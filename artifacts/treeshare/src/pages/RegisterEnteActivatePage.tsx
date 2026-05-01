import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Leaf, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error" | "already_done";

export default function RegisterEnteActivatePage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function activate() {
      try {
        // Supabase mette access_token e refresh_token nel fragment dell'URL dopo la conferma email.
        // onAuthStateChange li rileva automaticamente — aspettiamo la sessione.
        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          // Attendiamo al massimo 8 secondi che Supabase processi i token dall'hash
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 8000);
            const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
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

        // Chiama il backend per creare i record nel DB
        const res = await fetch("/api/register-ente/activate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.status === 200 || res.status === 201) {
          const body = await res.json().catch(() => ({}));
          setStatus(body.alreadyActivated ? "already_done" : "success");

          // Aspetta un momento poi vai alla home
          setTimeout(() => {
            navigate("/feed");
          }, 2500);
          return;
        }

        const errBody = await res.json().catch(() => ({ error: "Errore sconosciuto" }));
        setErrorMsg(errBody.error ?? "Errore nell'attivazione dell'account.");
        setStatus("error");
      } catch (err) {
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
            <p className="text-gray-500 text-sm">Stiamo creando il tuo profilo ente.</p>
          </>
        )}

        {(status === "success" || status === "already_done") && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {status === "already_done" ? "Profilo già attivo" : "Profilo creato!"}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {status === "already_done"
                ? "Il tuo account è già stato attivato. Reindirizzamento…"
                : "Il tuo account ente è stato attivato con successo. Reindirizzamento…"}
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
                onClick={() => navigate("/register-ente")}
                className="bg-green-700 hover:bg-green-800 text-white"
              >
                Torna alla registrazione
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/sign-in")}
              >
                Accedi
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
