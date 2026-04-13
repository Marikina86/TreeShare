import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/lib/i18n";

const labels = {
  it: { copied: "Link copiato!", copyFail: "Impossibile copiare il link" },
  en: { copied: "Link copied!", copyFail: "Unable to copy link" },
  fr: { copied: "Lien copié !", copyFail: "Impossible de copier le lien" },
  pt: { copied: "Link copiado!", copyFail: "Não foi possível copiar o link" },
  es: { copied: "¡Enlace copiado!", copyFail: "No se pudo copiar el enlace" },
  ja: { copied: "リンクをコピーしました！", copyFail: "リンクをコピーできませんでした" },
};

type Lang = keyof typeof labels;

interface ShareData {
  title: string;
  text?: string;
  path: string;
}

export function useShare() {
  const { toast } = useToast();
  const { lang } = useLang();
  const l = labels[lang as Lang] || labels.en;

  const share = useCallback(async ({ title, text, path }: ShareData) => {
    const baseUrl = window.location.origin + (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const url = `${baseUrl}${path}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text: text || title, url });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast({ title: l.copied });
    } catch {
      toast({ title: l.copyFail, variant: "destructive" });
    }
  }, [toast, l]);

  return { share };
}
