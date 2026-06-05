// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getCurrentPlayer, updateProfile } from "@/services/auth";
import { getUserJourneys } from "@/services/journeys";
import { getFollowers, getFollowing, getMyProfile } from "@/services/players";
import ProfileView from "@/components/ProfileView";

export default function Hero() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: currentPlayer } = useQuery({ queryKey: ["auth", "me"], queryFn: getCurrentPlayer });
  const { data: profile } = useQuery({
    queryKey: ["player-profile", "me"],
    queryFn: getMyProfile,
    enabled: !!currentPlayer,
  });
  const { data: journeys = [] } = useQuery({ queryKey: ["journeys", "user"], queryFn: getUserJourneys });
  const { data: followers = [] } = useQuery({
    queryKey: ["follow-list", currentPlayer?.id, "followers"],
    queryFn: () => getFollowers(currentPlayer!.id),
    enabled: !!currentPlayer,
  });
  const { data: following = [] } = useQuery({
    queryKey: ["follow-list", currentPlayer?.id, "following"],
    queryFn: () => getFollowing(currentPlayer!.id),
    enabled: !!currentPlayer,
  });

  const [editingBio, setEditingBio] = useState(false);
  const [draftBio, setDraftBio] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["player-profile", "me"] });
    },
  });

  if (!profile) return null;

  const bio = profile.player.bio ?? "";

  function saveBio() {
    updateProfileMutation.mutate({ bio: draftBio.trim() });
    setEditingBio(false);
  }

  const bioContent = editingBio ? (
    <div>
      <textarea
        value={draftBio}
        onChange={(e) => setDraftBio(e.target.value)}
        rows={2}
        placeholder={t("hero_bio_placeholder")}
        aria-label="Bio"
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={saveBio}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
        >
          <Check size={12} />
          {t("hero_save")}
        </button>
        <button
          onClick={() => setEditingBio(false)}
          className="rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {t("hero_cancel")}
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-2">
      <p className="text-sm text-muted-foreground">{bio}</p>
      <button
        onClick={() => { setDraftBio(bio); setEditingBio(true); }}
        aria-label={t("hero_edit_bio")}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
      >
        <Pencil size={13} />
      </button>
    </div>
  );

  return (
    <ProfileView
      profile={profile}
      journeys={journeys}
      followers={followers}
      following={following}
      journeyQueryKey={["journeys", "user"]}
      sectionTitle={t("hero_section_journeys")}
      bioContent={bioContent}
    />
  );
}
