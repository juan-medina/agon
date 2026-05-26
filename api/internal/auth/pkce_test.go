// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import "testing"

// TestDeriveChallenge_RFC7636 verifies the S256 encoding against the test
// vector from RFC 7636 Appendix B. Wrong encoding silently breaks the Bluesky
// auth flow because Bluesky rejects the PAR request with a 400.
func TestDeriveChallenge_RFC7636(t *testing.T) {
	const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	const want = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
	if got := DeriveChallenge(verifier); got != want {
		t.Errorf("DeriveChallenge = %q, want %q", got, want)
	}
}
