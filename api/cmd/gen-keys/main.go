// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	out := flag.String("out", "keys/server.pem", "path to write the private key PEM")
	flag.Parse()

	// ES256 (P-256) is required for Bluesky's DPoP; EdDSA is not supported.
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		fmt.Fprintf(os.Stderr, "generate key: %v\n", err)
		os.Exit(1)
	}

	pkcs8, err := x509.MarshalPKCS8PrivateKey(priv)
	if err != nil {
		fmt.Fprintf(os.Stderr, "marshal key: %v\n", err)
		os.Exit(1)
	}

	if err := os.MkdirAll(filepath.Dir(*out), 0700); err != nil {
		fmt.Fprintf(os.Stderr, "mkdir: %v\n", err)
		os.Exit(1)
	}

	f, err := os.OpenFile(*out, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		fmt.Fprintf(os.Stderr, "open %s: %v\n", *out, err)
		os.Exit(1)
	}
	defer f.Close()

	if err := pem.Encode(f, &pem.Block{Type: "PRIVATE KEY", Bytes: pkcs8}); err != nil {
		fmt.Fprintf(os.Stderr, "write PEM: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("P-256 key written to %s (mode 0600)\n", *out)
}
