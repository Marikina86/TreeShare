import { useRef, useCallback, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTrees,
  getListTreesQueryKey,
} from "@workspace/api-client-react";

interface FeedMeta {
  total: number;
  lastUpdatedAt: string;
}

interface UseFeedOptions {
  page: number;
  limit: number;
}

const FEED_BASE_KEY = ["/api/trees"] as const;

export function useFeed({ page, limit }: UseFeedOptions) {
  const queryClient = useQueryClient();
  const cachedMetaRef = useRef<FeedMeta | null>(null);
  const metaInitialized = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshResult, setLastRefreshResult] = useState<
    "idle" | "no-change" | "updated"
  >("idle");

  const queryKey = getListTreesQueryKey({ page, limit });

  const query = useListTrees(
    { page, limit },
    {
      query: {
        queryKey,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchInterval: false,
      },
    }
  );

  useEffect(() => {
    if (metaInitialized.current) return;
    if (!query.data) return;
    metaInitialized.current = true;
    fetch("/api/trees/feed-meta")
      .then((r) => (r.ok ? r.json() : null))
      .then((meta: FeedMeta | null) => {
        if (meta) cachedMetaRef.current = meta;
      })
      .catch(() => {});
  }, [query.data]);

  const smartRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setLastRefreshResult("idle");

    try {
      const res = await fetch("/api/trees/feed-meta");
      if (!res.ok) {
        await queryClient.invalidateQueries({ queryKey: FEED_BASE_KEY });
        await queryClient.refetchQueries({ queryKey });
        setLastRefreshResult("updated");
        return;
      }

      const serverMeta: FeedMeta = await res.json();

      const cached = cachedMetaRef.current;
      const hasChanges =
        !cached ||
        cached.lastUpdatedAt !== serverMeta.lastUpdatedAt ||
        cached.total !== serverMeta.total;

      if (!hasChanges) {
        setLastRefreshResult("no-change");
        return;
      }

      cachedMetaRef.current = serverMeta;
      await queryClient.invalidateQueries({ queryKey: FEED_BASE_KEY });
      await queryClient.refetchQueries({ queryKey });
      setLastRefreshResult("updated");
    } catch {
      await queryClient.invalidateQueries({ queryKey: FEED_BASE_KEY });
      await queryClient.refetchQueries({ queryKey });
      setLastRefreshResult("updated");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, queryClient, queryKey]);

  return {
    ...query,
    refreshing,
    lastRefreshResult,
    smartRefresh,
  };
}
