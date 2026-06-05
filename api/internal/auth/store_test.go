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

func TestStateStore_setUserID(t *testing.T) {
	s := newStateStore()
	s.put("state1", "verifier1", time.Minute)

	if ok := s.setUserID("state1", "01920f3a-0000-0000-0000-000000000000"); !ok {
		t.Fatal("setUserID returned false for existing entry")
	}

	e, _ := s.get("state1")
	if e.userID != "01920f3a-0000-0000-0000-000000000000" {
		t.Errorf("userID = %q, want %q", e.userID, "01920f3a-0000-0000-0000-000000000000")
	}
}

func TestStateStore_setUserID_missing(t *testing.T) {
	s := newStateStore()
	if ok := s.setUserID("nonexistent", "01920f3a-0000-0000-0000-000000000000"); ok {
		t.Error("setUserID returned true for missing entry")
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
