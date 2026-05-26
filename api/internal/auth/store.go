// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import (
	"sync"
	"time"
)

// stateEntry holds OAuth state keyed by the server-generated state nonce.
// serverVerifier is set on initAuth; did is set after the Bluesky callback.
type stateEntry struct {
	serverVerifier string
	did            string
	expires        time.Time
}

type stateStore struct {
	mu      sync.Mutex
	entries map[string]stateEntry
}

func newStateStore() *stateStore {
	s := &stateStore{entries: make(map[string]stateEntry)}
	go s.gc()
	return s
}

func (s *stateStore) put(state, serverVerifier string, ttl time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries[state] = stateEntry{
		serverVerifier: serverVerifier,
		expires:        time.Now().Add(ttl),
	}
}

// setDID populates the DID for an existing entry. Returns false if the entry
// is missing or expired.
func (s *stateStore) setDID(state, did string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[state]
	if !ok || time.Now().After(e.expires) {
		return false
	}
	e.did = did
	s.entries[state] = e
	return true
}

func (s *stateStore) get(state string) (stateEntry, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[state]
	if !ok || time.Now().After(e.expires) {
		return stateEntry{}, false
	}
	return e, true
}

func (s *stateStore) delete(state string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.entries, state)
}

func (s *stateStore) gc() {
	t := time.NewTicker(5 * time.Minute)
	defer t.Stop()
	for range t.C {
		s.mu.Lock()
		now := time.Now()
		for k, e := range s.entries {
			if now.After(e.expires) {
				delete(s.entries, k)
			}
		}
		s.mu.Unlock()
	}
}
