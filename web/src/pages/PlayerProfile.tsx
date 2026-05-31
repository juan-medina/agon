// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { Navigate, useNavigate, useParams } from "react-router";
import { Check, ChevronLeft, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPlayer, getPlayerJourneys, getFollowers, getFollowing, toggleFollow } from "@/services/players";
import { getCurrentPlayer, MY_PLAYER_ID } from "@/services/auth";
import ProfileView from "@/components/ProfileView";

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: currentPlayer, isLoading: currentPlayerLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getCurrentPlayer,
  });

  const { data: player } = useQuery({
    queryKey: ["player", id],
    queryFn: () => getPlayer(id!),
    enabled: !!id,
  });

  const { data: journeys = [] } = useQuery({
    queryKey: ["journeys", "player", id],
    queryFn: () => getPlayerJourneys(id!),
    enabled: !!id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["follow-list", player?.id, "followers"],
    queryFn: () => getFollowers(player!.id),
    enabled: !!player,
  });

  const { data: following = [] } = useQuery({
    queryKey: ["follow-list", player?.id, "following"],
    queryFn: () => getFollowing(player!.id),
    enabled: !!player,
  });

  const { data: isFollowing = false } = useQuery({
    queryKey: ["following", player?.handle],
    queryFn: async () => {
      const { isFollowingHandle } = await import("@/services/players");
      return isFollowingHandle(player!.handle);
    },
    enabled: !!player,
  });

  const followMutation = useMutation({
    mutationFn: () => toggleFollow(player!.handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following", player?.handle] });
      queryClient.invalidateQueries({ queryKey: ["follow-list"] });
    },
  });

  if (currentPlayerLoading) return null;
  if (currentPlayer && id === currentPlayer.id) return <Navigate to="/hero" replace />;

  if (!player) {
    return (
      <div className="mx-auto max-w-2xl pt-8 text-center text-muted-foreground">
        Player not found.
      </div>
    );
  }

  return (
    <ProfileView
      player={player}
      journeys={journeys}
      followers={followers}
      following={following}
      journeyQueryKey={["journeys", "player", id]}
      sectionTitle={`${player.name}'s journeys`}
      header={
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
      }
      profileActions={
        player.id !== MY_PLAYER_ID ? (
          <button
            onClick={() => followMutation.mutate()}
            aria-label={isFollowing ? "Unfollow" : "Follow"}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              isFollowing
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            {isFollowing ? (
              <>
                <Check size={14} />
                Unfollow
              </>
            ) : (
              <>
                <UserPlus size={14} />
                Follow
              </>
            )}
          </button>
        ) : undefined
      }
      bioContent={
        player.bio ? (
          <p className="text-sm text-muted-foreground">{player.bio}</p>
        ) : undefined
      }
    />
  );
}
