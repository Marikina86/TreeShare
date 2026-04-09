import { useState, useRef, useCallback, useEffect } from "react";

export interface LocationResult {
  displayName: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  province: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: LocationResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function LocationSearch({ value, onChange, onSelect, placeholder, className, disabled }: Props) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchSuggestions(query: string) {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&accept-language=it`;
      const res = await fetch(url, {
        signal: abortRef.current.signal,
        headers: { "Accept-Language": "it" },
      });
      const data = await res.json() as Array<{
        display_name: string;
        lat: string;
        lon: string;
        address?: {
          country?: string;
          city?: string;
          town?: string;
          village?: string;
          hamlet?: string;
          county?: string;
          state_district?: string;
          state?: string;
        };
      }>;
      const results: LocationResult[] = data.map((item) => {
        const city =
          item.address?.city ||
          item.address?.town ||
          item.address?.village ||
          item.address?.hamlet ||
          "";
        const country = item.address?.country ?? "";
        const province =
          item.address?.county ||
          item.address?.state_district ||
          item.address?.state ||
          "";
        const short = city ? `${city}, ${country}` : item.display_name.split(",").slice(0, 2).join(",").trim();
        return {
          displayName: short,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          country,
          city,
          province,
        };
      });
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  const debouncedFetch = useCallback(debounce(fetchSuggestions, 400), []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    debouncedFetch(val);
  }

  function handleSelect(result: LocationResult) {
    onChange(result.displayName);
    onSelect(result);
    setOpen(false);
    setSuggestions([]);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Cerca un luogo..."}
          disabled={disabled}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted flex items-start gap-2 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-muted-foreground flex-shrink-0 mt-0.5">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-foreground leading-snug">{s.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
