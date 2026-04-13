import { useQuery } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n";
import { useShare } from "@/hooks/useShare";

interface Campaign {
  id: number;
  title: string;
  description: string;
  goalAmount: number | null;
  isActive: boolean;
  totalRaised: number;
  donationCount: number;
  photos: string[];
}

const labels = {
  it: { raised: "Raccolti", goal: "Obiettivo", donations: "donazioni", myCampaign: "La mia campagna" },
  en: { raised: "Raised", goal: "Goal", donations: "donations", myCampaign: "My campaign" },
  fr: { raised: "Collectés", goal: "Objectif", donations: "dons", myCampaign: "Ma campagne" },
  pt: { raised: "Arrecadado", goal: "Meta", donations: "doações", myCampaign: "Minha campanha" },
  es: { raised: "Recaudado", goal: "Objetivo", donations: "donaciones", myCampaign: "Mi campaña" },
  ja: { raised: "集まった", goal: "目標", donations: "寄付", myCampaign: "マイキャンペーン" },
};

type Lang = keyof typeof labels;

import { CampaignPhotoGridCompact } from "@/components/PhotoLightbox";

export default function ProfileCampaignSection({ profileUserId, isOwnProfile }: {
  profileUserId: string;
  isOwnProfile: boolean;
}) {
  const { lang } = useLang();
  const l = labels[lang as Lang] || labels.en;
  const { share } = useShare();

  const { data: campaign } = useQuery<Campaign | null>({
    queryKey: ["profile-campaign", profileUserId],
    queryFn: async () => {
      const res = await fetch(`/api/donations/campaigns/user/${profileUserId}`);
      if (res.ok) return res.json();
      return null;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });

  if (!campaign) return null;

  const photos = Array.isArray(campaign.photos) ? campaign.photos : [];
  const progress = campaign.goalAmount ? Math.min(100, (campaign.totalRaised / campaign.goalAmount) * 100) : null;

  return (
    <div className="mb-6 p-5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-emerald-600 dark:text-emerald-400">
            <path d="M12 21C12 21 4 15 4 9C4 6.79 5.79 5 8 5C9.5 5 10.8 5.8 11.5 7H12.5C13.2 5.8 14.5 5 16 5C18.21 5 20 6.79 20 9C20 15 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          {isOwnProfile && (
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">{l.myCampaign}</p>
          )}
          <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{campaign.title}</h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 line-clamp-2">{campaign.description}</p>
        </div>
        <button
          onClick={() => share({
            title: campaign.title,
            text: campaign.description,
            path: `/profile/${profileUserId}`,
          })}
          className="flex-shrink-0 p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
          title="Condividi"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
          </svg>
        </button>
      </div>

      <CampaignPhotoGridCompact photos={photos} className="mb-3" />

      <div className="flex items-center gap-4 text-xs text-emerald-600 dark:text-emerald-400 mb-1">
        <span className="font-semibold">€{(campaign.totalRaised / 100).toFixed(2)} {l.raised}</span>
        {campaign.goalAmount && (
          <span>{l.goal}: €{(campaign.goalAmount / 100).toFixed(2)}</span>
        )}
        <span>{campaign.donationCount} {l.donations}</span>
      </div>

      {progress !== null && (
        <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
