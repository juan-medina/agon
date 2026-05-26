// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package main

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	if err := writeECDSA("../keys/dpop.pem"); err != nil {
		fmt.Fprintf(os.Stderr, "dpop key: %v\n", err)
		os.Exit(1)
	}
	if err := writeEd25519("../keys/session.pem"); err != nil {
		fmt.Fprintf(os.Stderr, "session key: %v\n", err)
		os.Exit(1)
	}
}

// writeECDSA generates a P-256 key. ES256 is required by AT Protocol for DPoP.
func writeECDSA(path string) error {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return fmt.Errorf("generate: %w", err)
	}
	return writePKCS8(path, priv, "P-256")
}

// writeEd25519 generates an Ed25519 key for signing session JWTs.
func writeEd25519(path string) error {
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return fmt.Errorf("generate: %w", err)
	}
	return writePKCS8(path, priv, "Ed25519")
}

func writePKCS8(path string, key interface{}, label string) error {
	pkcs8, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()
	if err := pem.Encode(f, &pem.Block{Type: "PRIVATE KEY", Bytes: pkcs8}); err != nil {
		return fmt.Errorf("write PEM: %w", err)
	}
	fmt.Printf("%s key written to %s (mode 0600)\n", label, path)
	return nil
}
