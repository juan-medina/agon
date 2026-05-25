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

// Generates a PKCE pair, stashes the verifier in sessionStorage, then
// navigates the browser to the API's auth/init endpoint. The server sets a
// challenge cookie and redirects to Bluesky — this function does not return.
export async function signIn(): Promise<void> {
  const verifier = generateVerifier();
  const challenge = await deriveChallenge(verifier);
  sessionStorage.setItem("agon_pkce_verifier", verifier);
  window.location.href = `${API_BASE}/auth/init?challenge=${challenge}`;
}

// Called by the /auth/complete page after Bluesky redirects back. Reads the
// verifier from sessionStorage and exchanges it for a session JWT cookie.
export async function completeSignIn(): Promise<void> {
  const verifier = sessionStorage.getItem("agon_pkce_verifier");
  if (!verifier) throw new Error("pkce verifier missing from sessionStorage");
  sessionStorage.removeItem("agon_pkce_verifier");

  const resp = await fetch(`${API_BASE}/auth/session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ verifier }),
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

function generateVerifier(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function deriveChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
