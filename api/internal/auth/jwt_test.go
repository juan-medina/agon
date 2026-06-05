// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import (
	"crypto/ed25519"
	"crypto/rand"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func newTestKeyPair(t *testing.T) (ed25519.PublicKey, ed25519.PrivateKey) {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	return pub, priv
}

func TestSessionJWT_roundtrip(t *testing.T) {
	pub, priv := newTestKeyPair(t)
	const did = "did:plc:abc123"

	token, err := CreateSessionJWT(did, priv)
	if err != nil {
		t.Fatalf("CreateSessionJWT: %v", err)
	}

	got, err := ParseSessionJWT(token, pub)
	if err != nil {
		t.Fatalf("ParseSessionJWT: %v", err)
	}
	if got != did {
		t.Errorf("DID = %q, want %q", got, did)
	}
}

func TestSessionJWT_wrongKey(t *testing.T) {
	_, priv := newTestKeyPair(t)
	otherPub, _ := newTestKeyPair(t)

	token, err := CreateSessionJWT("did:plc:abc123", priv)
	if err != nil {
		t.Fatalf("CreateSessionJWT: %v", err)
	}

	if _, err := ParseSessionJWT(token, otherPub); err == nil {
		t.Error("expected error when verifying with wrong key, got nil")
	}
}

func TestSessionJWT_expired(t *testing.T) {
	pub, priv := newTestKeyPair(t)

	claims := sessionClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "did:plc:abc123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Second)),
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims).SignedString(priv)
	if err != nil {
		t.Fatalf("sign expired token: %v", err)
	}

	if _, err := ParseSessionJWT(token, pub); err == nil {
		t.Error("expected error for expired token, got nil")
	}
}
