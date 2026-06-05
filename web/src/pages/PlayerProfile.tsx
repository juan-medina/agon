// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { Navigate, useNavigate, useParams } from "react-router";
import { Check, ChevronLeft, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPlayerProfile, getFollowers, getFollowing, followPlayer, unfollowPlayer } from "@/services/players";
import { getPlayerJourneys } from "@/services/players";
import { getCurrentPlayer } from "@/services/auth";
import ProfileView from "@/components/ProfileView";

export default function PlayerProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentPlayer, isLoading: currentPlayerLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentPlayer,
  });

  const { data: profile } = useQuery({
    queryKey: ["player-profile", id],
    queryFn: () => getPlayerProfile(id!),
    enabled: !!id,
  });

  const { data: journeys = [] } = useQuery({
    queryKey: ["journeys", "player", id],
    queryFn: () => getPlayerJourneys(id!),
    enabled: !!id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["follow-list", profile?.player.id, "followers"],
    queryFn: () => getFollowers(profile!.player.id),
    enabled: !!profile,
  });

  const { data: following = [] } = useQuery({
    queryKey: ["follow-list", profile?.player.id, "following"],
    queryFn: () => getFollowing(profile!.player.id),
    enabled: !!profile,
  });

  const isFollowing = profile?.player.isFollowing ?? false;

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow ? followPlayer(profile!.player.id) : unfollowPlayer(profile!.player.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-profile", id] });
      queryClient.invalidateQueries({ queryKey: ["follow-list", profile?.player.id] });
    },
  });

  if (currentPlayerLoading) return null;
  if (currentPlayer && id === currentPlayer.id) return <Navigate to="/hero" replace />;

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl pt-8 text-center text-muted-foreground">
        {t("profile_not_found")}
      </div>
    );
  }

  const isOwnProfile = currentPlayer?.id === profile.player.id;

  return (
    <ProfileView
      profile={profile}
      journeys={journeys}
      followers={followers}
      following={following}
      journeyQueryKey={["journeys", "player", id]}
      sectionTitle={`${profile.player.name}'s journeys`}
      header={
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t("profile_back")}
        >
          <ChevronLeft size={20} />
        </button>
      }
      profileActions={
        !isOwnProfile ? (
          <button
            onClick={() => followMutation.mutate(!isFollowing)}
            aria-label={isFollowing ? t("profile_unfollow") : t("profile_follow")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              isFollowing
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {isFollowing ? (
              <>
                <Check size={14} />
                {t("profile_unfollow")}
              </>
            ) : (
              <>
                <UserPlus size={14} />
                {t("profile_follow")}
              </>
            )}
          </button>
        ) : undefined
      }
      bioContent={
        profile.player.bio ? (
          <p className="text-sm text-muted-foreground">{profile.player.bio}</p>
        ) : undefined
      }
    />
  );
}
