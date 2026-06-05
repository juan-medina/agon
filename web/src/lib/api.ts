// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export class RateLimitedError extends Error {
  constructor() {
    super("too many requests");
  }
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resp = await fetch(input, init);
  if (resp.status === 429) throw new RateLimitedError();
  return resp;
}
