import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import L from "leaflet";

const INDIVIDUAL_ZOOM_THRESHOLD = 12;
const SPIDERFY_RADIUS_DEG = 0.00012;

interface TreeItem {
  id: number;
  userId: string;
  username: string | null;
  userPhotoUrl: string | null;
  photoUrl: string;
  plantName: string | null;
  species: string | null;
}

interface ClusterMarker {
  latitude: number;
  longitude: number;
  count: number;
  locationName: string | null;
  trees: TreeItem[];
}

interface IndividualTree {
  id: number;
  userId: string;
  username: string | null;
  userPhotoUrl: string | null;
  latitude: number;
  longitude: number;
  photoUrl: string;
  locationName: string | null;
  plantName: string | null;
  species: string | null;
}

interface PlacedTree extends IndividualTree {
  displayLat: number;
  displayLng: number;
}

function pSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith("/objects/") ? `/api/storage${url}` : url;
}

function zoomToPrecision(zoom: number): number {
  if (zoom <= 4) return 1;
  if (zoom <= 7) return 2;
  if (zoom <= 10) return 3;
  return 4;
}

function spiderfy(trees: IndividualTree[]): PlacedTree[] {
  const groups = new Map<string, IndividualTree[]>();
  for (const tree of trees) {
    const key = `${tree.latitude.toFixed(6)},${tree.longitude.toFixed(6)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tree);
  }
  const result: PlacedTree[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push({ ...group[0], displayLat: group[0].latitude, displayLng: group[0].longitude });
    } else {
      const n = group.length;
      const r = SPIDERFY_RADIUS_DEG * (1 + Math.floor(n / 8) * 0.6);
      group.forEach((tree, i) => {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        result.push({ ...tree, displayLat: tree.latitude + r * Math.cos(angle), displayLng: tree.longitude + r * Math.sin(angle) });
      });
    }
  }
  return result;
}

function clusterPopupHtml(marker: ClusterMarker): string {
  const loc = marker.locationName ? `<div style="font-size:11px;color:#666;margin-top:1px;">${marker.locationName}</div>` : "";
  const label = `🌿 ${marker.count} pianta${marker.count > 1 ? "e" : ""}`;

  if (marker.count === 1 && marker.trees.length > 0) {
    const t = marker.trees[0];
    const img = pSrc(t.photoUrl);
    const name = t.plantName ?? t.species ?? "Albero";
    const imgHtml = img ? `<img src="${img}" alt="" style="width:100%;height:75px;object-fit:cover;border-radius:7px;margin-bottom:6px;cursor:pointer;background:#f5f5f5;" data-tree-id="${t.id}" class="map-popup-photo"/>` : "";
    const userHtml = t.username ? `<div style="font-size:10px;color:#22c55e;font-weight:600;margin-top:3px;cursor:pointer;" data-user-id="${t.userId}" class="map-popup-user">@${t.username}</div>` : "";
    return `<div style="width:160px;">${imgHtml}<div style="font-weight:700;font-size:13px;color:#1a1a1a;cursor:pointer;" data-tree-id="${t.id}" class="map-popup-title">${name}</div>${loc}${userHtml}</div>`;
  }

  const cards = marker.trees.map((t) => {
    const img = pSrc(t.photoUrl);
    const name = t.plantName ?? t.species ?? "Albero";
    const imgHtml = img
      ? `<img src="${img}" alt="" style="width:88px;height:70px;object-fit:cover;border-radius:7px;background:#f5f5f5;display:block;"/>`
      : `<div style="width:88px;height:70px;border-radius:7px;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:22px;">🌿</div>`;
    return `<div class="map-cluster-tree" data-tree-id="${t.id}" style="flex-shrink:0;width:88px;cursor:pointer;">${imgHtml}<div style="font-size:10px;font-weight:600;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1a1a1a;">${name}</div>${t.username ? `<div style="font-size:9px;color:#22c55e;font-weight:600;">@${t.username}</div>` : ""}</div>`;
  }).join("");

  const more = marker.count > 30 ? `<div style="font-size:10px;color:#888;text-align:right;margin-top:4px;">+${marker.count - 30} altre…</div>` : "";

  return `<div style="width:230px;font-family:sans-serif;">
    <div style="font-weight:700;font-size:13px;color:#1a1a1a;">${label}</div>
    ${loc}
    <div style="display:flex;gap:7px;overflow-x:auto;padding:8px 0 4px;scrollbar-width:thin;">${cards}</div>
    ${more}
  </div>`;
}

function individualPopupHtml(tree: IndividualTree): string {
  const img = pSrc(tree.photoUrl);
  const name = tree.plantName ?? tree.species ?? "Albero";
  const imgHtml = img
    ? `<img src="${img}" alt="" style="width:100%;height:75px;object-fit:cover;border-radius:7px;margin-bottom:6px;cursor:pointer;background:#f5f5f5;" data-tree-id="${tree.id}" class="map-popup-photo"/>`
    : "";
  const userHtml = tree.username
    ? `<div style="font-size:10px;color:#22c55e;font-weight:600;margin-top:3px;cursor:pointer;" data-user-id="${tree.userId}" class="map-popup-user">@${tree.username}</div>`
    : "";
  const loc = tree.locationName ? `<div style="font-size:11px;color:#666;margin-top:2px;">${tree.locationName}</div>` : "";
  return `<div style="width:160px;">${imgHtml}<div style="font-weight:700;font-size:13px;color:#1a1a1a;cursor:pointer;" data-tree-id="${tree.id}" class="map-popup-title">${name}</div>${loc}${userHtml}</div>`;
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [tileLayer, setTileLayer] = useState<"street" | "satellite">("street");
  const [clusterMarkers, setClusterMarkers] = useState<ClusterMarker[]>([]);
  const [individualTrees, setIndividualTrees] = useState<IndividualTree[]>([]);
  const [mode, setMode] = useState<"cluster" | "individual">("cluster");
  const [isLoading, setIsLoading] = useState(true);
  const [precision, setPrecision] = useState(2);
  const [, navigate] = useLocation();

  const fetchClusters = useCallback(async (prec: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/map/markers?precision=${prec}`);
      if (res.ok) setClusterMarkers(await res.json());
    } catch {
    } finally { setIsLoading(false); }
  }, []);

  const fetchIndividual = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/map/individual");
      if (res.ok) setIndividualTrees(await res.json());
    } catch {
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (mode === "cluster") fetchClusters(precision);
    else fetchIndividual();
  }, [mode, precision, fetchClusters, fetchIndividual]);


  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, { center: [20, 0], zoom: 2, zoomControl: true });
    const initialTile = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 });
    initialTile.addTo(map);
    tileLayerRef.current = initialTile;
    leafletMapRef.current = map;

    map.on("zoomend", () => {
      const z = map.getZoom();
      const newMode: "cluster" | "individual" = z >= INDIVIDUAL_ZOOM_THRESHOLD ? "individual" : "cluster";
      setMode(newMode);
      if (newMode === "cluster") setPrecision((prev) => { const p = zoomToPrecision(z); return p !== prev ? p : prev; });
    });

    return () => { map.remove(); leafletMapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();
    if (tileLayer === "satellite") {
      tileLayerRef.current = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles &copy; Esri", maxZoom: 19 }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
    }
  }, [tileLayer]);

  const attachPopupHandlers = useCallback((navigateFn: typeof navigate) => {
    document.querySelectorAll<HTMLElement>(".map-popup-photo, .map-popup-title, .map-cluster-tree").forEach((el) => {
      el.addEventListener("click", () => {
        const treeId = el.getAttribute("data-tree-id");
        if (treeId) navigateFn(`/tree/${treeId}`);
      });
    });
    document.querySelectorAll<HTMLElement>(".map-popup-user").forEach((el) => {
      el.addEventListener("click", () => {
        const userId = el.getAttribute("data-user-id");
        if (userId) navigateFn(`/profile/${userId}`);
      });
    });
  }, []);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || mode !== "cluster") return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    clusterMarkers.forEach((marker) => {
      const size = marker.count === 1 ? 32 : marker.count < 5 ? 38 : marker.count < 20 ? 44 : 52;
      const icon = L.divIcon({
        className: "",
        html: `<div class="tree-marker" style="width:${size}px;height:${size}px;"><span>${marker.count}</span></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
      });

      const lm = L.marker([marker.latitude, marker.longitude], { icon })
        .bindPopup(clusterPopupHtml(marker), { maxWidth: 260 })
        .addTo(map);

      lm.on("popupopen", () => attachPopupHandlers(navigate));
      markersRef.current.push(lm);
    });
  }, [clusterMarkers, mode, navigate, attachPopupHandlers]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || mode !== "individual") return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const placed = spiderfy(individualTrees);

    placed.forEach((tree) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="tree-marker-single"></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
        popupAnchor: [0, -28],
      });

      const lm = L.marker([tree.displayLat, tree.displayLng], { icon })
        .bindPopup(individualPopupHtml(tree), { maxWidth: 190 })
        .addTo(map);

      lm.on("popupopen", () => attachPopupHandlers(navigate));
      markersRef.current.push(lm);
    });
  }, [individualTrees, mode, navigate, attachPopupHandlers]);

  const totalCount = mode === "cluster"
    ? clusterMarkers.reduce((s, m) => s + m.count, 0)
    : individualTrees.length;

  return (
    <Layout>
      <div className="relative h-[calc(100vh-4rem)] md:h-[calc(100vh-3.5rem)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border z-10">
          <h1 className="font-bold text-foreground">
            World Map
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {totalCount} pianta{totalCount !== 1 ? "e" : ""}
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setTileLayer("street")} data-testid="button-tile-street"
              className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${tileLayer === "street" ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
              Street
            </button>
            <button onClick={() => setTileLayer("satellite")} data-testid="button-tile-satellite"
              className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${tileLayer === "satellite" ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground hover:bg-muted"}`}>
              Satellite
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
            <div className="text-muted-foreground text-sm">Loading map...</div>
          </div>
        )}

        <div ref={mapRef} className="flex-1 z-0" data-testid="map-container" />
      </div>
    </Layout>
  );
}
