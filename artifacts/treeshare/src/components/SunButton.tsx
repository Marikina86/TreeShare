import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface SunButtonProps {
  treeId: number;
  initialCount: number;
  initialSunned: boolean;
  size?: "sm" | "md";
}

export default function SunButton({ treeId, initialCount, initialSunned, size = "md" }: SunButtonProps) {
  const { isSignedIn, getToken } = useAuth();
  const [, navigate] = useLocation();
  const [sunCount, setSunCount] = useState(initialCount);
  const [userHasSunned, setUserHasSunned] = useState(initialSunned);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      navigate("/sign-in");
      return;
    }
    if (loading) return;

    setLoading(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);

    try {
      const token = await getToken();
      const res = await fetch(`/api/trees/${treeId}/sun`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { sunCount: number; userHasSunned: boolean };
        setSunCount(data.sunCount);
        setUserHasSunned(data.userHasSunned);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const isSm = size === "sm";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={userHasSunned ? "Rimuovi sole" : "Aggiungi sole"}
      className={`sun-button flex items-center gap-1 rounded-full border transition-all select-none ${
        isSm ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      } ${
        userHasSunned
          ? "border-yellow-400 bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-500"
          : "border-border text-muted-foreground hover:border-yellow-300 hover:text-yellow-500 dark:hover:border-yellow-600"
      } ${animating ? "sun-glow" : ""} ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`transition-transform ${animating ? "scale-125" : "scale-100"} ${isSm ? "text-sm" : "text-base"}`}
        style={{ display: "inline-block" }}
      >
        🌞
      </span>
      <span className={`font-semibold tabular-nums ${isSm ? "text-xs" : "text-sm"}`}>{sunCount}</span>
    </button>
  );
}
