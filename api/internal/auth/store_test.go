// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import (
	"testing"
	"time"
)

func TestStateStore_miss(t *testing.T) {
	s := newStateStore()
	if _, ok := s.get("unknown"); ok {
		t.Error("expected miss for unknown state key")
	}
}

func TestStateStore_putAndGet(t *testing.T) {
	s := newStateStore()
	s.put("state1", "verifier1", time.Minute)

	e, ok := s.get("state1")
	if !ok {
		t.Fatal("expected hit after put")
	}
	if e.serverVerifier != "verifier1" {
		t.Errorf("serverVerifier = %q, want %q", e.serverVerifier, "verifier1")
	}
}

func TestStateStore_setDID(t *testing.T) {
	s := newStateStore()
	s.put("state1", "verifier1", time.Minute)

	if ok := s.setDID("state1", "did:plc:test"); !ok {
		t.Fatal("setDID returned false for existing entry")
	}

	e, _ := s.get("state1")
	if e.did != "did:plc:test" {
		t.Errorf("did = %q, want %q", e.did, "did:plc:test")
	}
}

func TestStateStore_setDID_missing(t *testing.T) {
	s := newStateStore()
	if ok := s.setDID("nonexistent", "did:plc:test"); ok {
		t.Error("setDID returned true for missing entry")
	}
}

func TestStateStore_expiry(t *testing.T) {
	s := newStateStore()
	s.put("state1", "verifier1", time.Millisecond)
	time.Sleep(10 * time.Millisecond)

	if _, ok := s.get("state1"); ok {
		t.Error("expected miss for expired entry")
	}
}
