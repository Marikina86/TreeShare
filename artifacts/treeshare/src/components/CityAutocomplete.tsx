import { useState, useEffect, useRef } from "react";

interface Suggestion {
  city: string;
  province: string;
  cap: string;
}

interface Props {
  value: string;
  onChange: (city: string, province: string, cap?: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export default function CityAutocomplete({ value, onChange, placeholder, className, hasError }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=it&limit=8`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "it" },
        });
        const data: any[] = await res.json();
        const seen = new Set<string>();
        const results: Suggestion[] = [];
        for (const item of data) {
          const addr = item.address ?? {};
          const city =
            addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? "";
          const isoCode: string = addr["ISO3166-2-lvl6"] ?? "";
          const province = isoCode ? isoCode.replace("IT-", "") : (addr.county ?? "");
          const cap: string = addr.postcode ?? "";
          const key = city.toLowerCase();
          if (city && !seen.has(key)) {
            seen.add(key);
            results.push({ city, province, cap });
          }
        }
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        autoComplete="off"
        placeholder={placeholder}
        className={`${className ?? ""} ${hasError ? "border-destructive" : ""}`}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value, "");
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center justify-between gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(s.city);
                onChange(s.city, s.province, s.cap);
                setOpen(false);
              }}
            >
              <span className="font-medium">{s.city}</span>
              {s.province && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {s.province}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
