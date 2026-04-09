import { useState, useEffect, useCallback } from "react";

export type GpsPermission = "granted" | "denied" | "prompt" | "unsupported" | "checking";

export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface GpsState {
  permission: GpsPermission;
  position: GpsPosition | null;
  error: string | null;
  loading: boolean;
}

const STORAGE_KEY = "treeshare_last_gps";

function loadLastPosition(): GpsPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GpsPosition) : null;
  } catch {
    return null;
  }
}

function savePosition(pos: GpsPosition) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {}
}

export function useGps() {
  const [state, setState] = useState<GpsState>({
    permission: "checking",
    position: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, permission: "unsupported" }));
      return;
    }
    if ("permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          setState((s) => ({
            ...s,
            permission: result.state as GpsPermission,
            position: result.state === "granted" ? (loadLastPosition() ?? null) : s.position,
          }));
          result.onchange = () => {
            setState((s) => ({ ...s, permission: result.state as GpsPermission }));
          };
        })
        .catch(() => {
          setState((s) => ({ ...s, permission: "prompt" }));
        });
    } else {
      setState((s) => ({ ...s, permission: "prompt" }));
    }
  }, []);

  const requestPosition = useCallback(
    (opts?: PositionOptions): Promise<GpsPosition> => {
      return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(new Error("unsupported"));
          return;
        }
        setState((s) => ({ ...s, loading: true, error: null }));
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const gps: GpsPosition = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              timestamp: pos.timestamp,
            };
            savePosition(gps);
            setState((s) => ({
              ...s,
              loading: false,
              position: gps,
              permission: "granted",
              error: null,
            }));
            resolve(gps);
          },
          (err) => {
            let msg = "Errore GPS sconosciuto.";
            if (err.code === 1) {
              msg = "Permesso GPS negato.";
              setState((s) => ({ ...s, loading: false, error: msg, permission: "denied" }));
            } else if (err.code === 2) {
              msg = "Posizione non disponibile. Verifica il segnale.";
              setState((s) => ({ ...s, loading: false, error: msg }));
            } else if (err.code === 3) {
              msg = "Timeout GPS. Riprova in un luogo aperto.";
              setState((s) => ({ ...s, loading: false, error: msg }));
            } else {
              setState((s) => ({ ...s, loading: false, error: msg }));
            }
            reject(new Error(msg));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...opts }
        );
      });
    },
    []
  );

  const clearPosition = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState((s) => ({ ...s, position: null }));
  }, []);

  return { ...state, requestPosition, clearPosition };
}

export function getPlatformInstructions(lang = "it"): string[] {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  const instructions: Record<string, Record<string, string[]>> = {
    it: {
      ios: [
        "1. Apri l'app Impostazioni del tuo iPhone/iPad",
        "2. Scorri fino a Safari (o Chrome/Firefox se usi un altro browser)",
        "3. Tocca Posizione → Consenti",
        "4. Torna su TreeShare e riprova",
      ],
      android: [
        "1. Tieni premuto l'icona del browser nella schermata home",
        "2. Tocca Informazioni app → Autorizzazioni → Posizione",
        "3. Seleziona Consenti sempre",
        "4. Torna su TreeShare e riprova",
      ],
      desktop: [
        "1. Clicca sull'icona del lucchetto 🔒 nella barra dell'indirizzo",
        "2. Trova Posizione e impostala su Consenti",
        "3. Ricarica la pagina e riprova",
      ],
    },
    en: {
      ios: [
        "1. Open the Settings app on your iPhone/iPad",
        "2. Scroll to Safari (or your browser)",
        "3. Tap Location → Allow",
        "4. Return to TreeShare and try again",
      ],
      android: [
        "1. Long-press the browser icon on your home screen",
        "2. Tap App Info → Permissions → Location",
        "3. Select Allow always",
        "4. Return to TreeShare and try again",
      ],
      desktop: [
        "1. Click the lock icon 🔒 in the address bar",
        "2. Find Location and set it to Allow",
        "3. Reload the page and try again",
      ],
    },
  };

  const map = instructions[lang] ?? instructions["it"];
  if (isIos) return map.ios;
  if (isAndroid) return map.android;
  return map.desktop;
}
