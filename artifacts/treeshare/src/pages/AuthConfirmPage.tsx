import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Leaf, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "success" | "error";

export default function AuthConfirmPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function confirm() {
      try {
        // supabase-js with detectSessionInUrl + flowType:implicit automatically
        // processes hash tokens (#access_token=...) placed there by Supabase after
        // email verification. getSession() returns the session once processed.
        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          // Wait up to 10 s for supabase to process the URL tokens via onAuthStateChange
          session = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 10_000);
            const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
              if (s) {
                clearTimeout(timer);
                sub.subscription.unsubscribe();
                resolve(s);
              }
            });
          });
        }

        if (!session) {
          setErrorMsg(
            "Link scaduto o già utilizzato. Richiedi un nuovo link oppure accedi direttamente."
          );
          setStatus("error");
          return;
        }

        const token = session.access_token;
        const meta = session.user.user_metadata ?? {};
        const isOrg =
          meta.isOrg === true ||
          meta.accountType === "organization" ||
          meta.account_type === "organization";

        if (isOrg) {
          const res = await fetch("/api/register-ente/activate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (!res.ok && res.status !== 200) {
            const body = await res.json().catch(() => ({}));
            setErrorMsg(body.error ?? "Errore nell'attivazione dell'ente.");
            setStatus("error");
            return;
          }
        } else {
          // Private user — build profile from metadata saved at signup
          const rawUsername =
            (meta.username as string | undefined) ||
            [meta.first_name, meta.last_name].filter(Boolean).join("_") ||
            session.user.email?.split("@")[0] ||
            "user";
          const username = rawUsername
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_.-]/g, "")
            .slice(0, 30) || "user";

          const rawCity = meta.city as string | undefined;
          const province = meta.province as string | undefined;
          const cityDisplay = rawCity
            ? province
              ? `${rawCity} (${province})`
              : rawCity
            : null;

          const res = await fetch("/api/users/me", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              username,
              photoUrl: (meta.avatar_url as string | undefined) || null,
              city: cityDisplay,
              country: "Italia",
            }),
          });

          if (!res.ok && res.status !== 409) {
            const body = await res.json().catch(() => ({}));
            setErrorMsg(body.error ?? "Errore nella creazione del profilo.");
            setStatus("error");
            return;
          }

          // Auto-save mandatory initial consents (Privacy, Terms) so the
          // ConsentModal does not re-appear on first app open. We only save
          // policies where requiresAcceptance=true and lastModifiedAt=null
          // (first-time baseline, not a subsequent update).
          try {
            const statusRes = await fetch("/api/consent/status", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json() as {
                upToDate: boolean;
                missing: Array<{ policyId: string; requiresAcceptance: boolean; lastModifiedAt: string | null }>;
              };
              const initialMandatory = (statusData.missing ?? []).filter(
                (p) => p.requiresAcceptance && p.lastModifiedAt === null
              );
              if (initialMandatory.length > 0) {
                await fetch("/api/consent", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    consents: initialMandatory.map((p) => ({ policyId: p.policyId, accepted: true })),
                  }),
                });
              }
            }
          } catch {
            // Non-blocking — if consent saving fails, the ConsentModal will handle it
          }
        }

        setStatus("success");
        setTimeout(() => navigate("/feed"), 1500);
      } catch {
        setErrorMsg("Errore di rete. Riprova o contatta l'assistenza.");
        setStatus("error");
      }
    }

    confirm();
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
            <h1 className="text-xl font-bold text-gray-900 mb-2">Conferma in corso…</h1>
            <p className="text-gray-500 text-sm">Stiamo attivando il tuo account TreeShare.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Account attivato!</h1>
            <p className="text-gray-500 text-sm">
              Benvenuto su TreeShare. Reindirizzamento al feed…
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Attivazione fallita</h1>
            <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
            <div className="flex flex-col gap-3">
              <a
                href="/sign-in"
                className="block w-full py-2.5 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition-colors"
              >
                Accedi
              </a>
              <a
                href="/register"
                className="block w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Registrati di nuovo
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
