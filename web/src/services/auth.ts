// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

import type { Player } from "@/models/player";
import { MY_PLAYER, MY_PLAYER_ID as MOCK_MY_PLAYER_ID } from "@/lib/mock";
import { API_BASE } from "@/lib/api";

export const MY_PLAYER_ID: string = MOCK_MY_PLAYER_ID;

let _profile: Player = { ...MY_PLAYER };

export async function getCurrentPlayer(): Promise<Player> {
  return { ..._profile };
}

export async function updateProfile(patch: { name?: string; bio?: string }): Promise<void> {
  _profile = { ..._profile, ...patch };
}

export async function uploadAvatar(file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  _profile = { ..._profile, avatarUrl: url };
}

const AUTHED_KEY = "agon_authed";

// Reads a localStorage flag written by completeSignIn(). Works in both
// same-origin and cross-origin setups (cookie-based checks fail cross-origin).
export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTHED_KEY) === "1";
}

// Navigates the browser to the API's auth/init endpoint. The server generates
// a state nonce, sets it in a cookie, and redirects to Bluesky — does not return.
export function signIn(): void {
  window.location.href = `${API_BASE}/auth/init`;
}

// Called by the /auth/complete page after Bluesky redirects back. The server
// reads the auth_state cookie to look up the completed flow and issues a session JWT.
export async function completeSignIn(): Promise<void> {
  const resp = await fetch(`${API_BASE}/auth/session`, {
    method: "POST",
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`session exchange failed: ${resp.status}`);
  localStorage.setItem(AUTHED_KEY, "1");
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(AUTHED_KEY);
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
  window.location.href = "/login";
}

export function _reset(): void {
  _profile = { ...MY_PLAYER };
}

