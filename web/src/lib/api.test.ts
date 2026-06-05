// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
import { describe, expect, it, vi, afterEach } from "vitest";
import { apiFetch, RateLimitedError } from "@/lib/api";

function mockFetch(status: number): void {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns the response on success", async () => {
    mockFetch(200);
    const resp = await apiFetch("http://localhost/test");
    expect(resp.status).toBe(200);
  });

  it("throws RateLimitedError on 429", async () => {
    mockFetch(429);
    await expect(apiFetch("http://localhost/test")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("does not throw RateLimitedError on 401 — caller handles auth errors", async () => {
    mockFetch(401);
    const resp = await apiFetch("http://localhost/test");
    expect(resp.status).toBe(401);
  });
});
