// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package main

import (
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/juan-medina/agon/internal/auth"
)

func main() {
	keyFile := envOr("KEY_FILE", "../keys/server.pem")
	addr := envOr("SERVER_ADDR", ":8080")
	allowedOrigin := envOr("ALLOWED_ORIGIN", "http://127.0.0.1:5173")

	priv, err := loadPrivateKey(keyFile)
	if err != nil {
		log.Fatalf("load key: %v\nRun `make gen-keys` first.", err)
	}

	cfg := auth.Config{
		ClientID:      envOr("BLUESKY_CLIENT_ID", "http://localhost"),
		RedirectURI:   envOr("BLUESKY_REDIRECT_URI", "http://127.0.0.1:8080/auth/callback"),
		FrontendURL:   envOr("FRONTEND_URL", "http://127.0.0.1:5173"),
		AuthEndpoint:  envOr("BLUESKY_AUTH_ENDPOINT", "https://bsky.social/oauth/authorize"),
		PAREndpoint:   envOr("BLUESKY_PAR_ENDPOINT", "https://bsky.social/oauth/par"),
		TokenEndpoint: envOr("BLUESKY_TOKEN_ENDPOINT", "https://bsky.social/oauth/token"),
	}

	mux := http.NewServeMux()
	auth.NewHandler(priv, cfg).Register(mux)

	log.Printf("listening on %s (frontend: %s)", addr, cfg.FrontendURL)
	if err := http.ListenAndServe(addr, cors(allowedOrigin, mux)); err != nil {
		log.Fatalf("server: %v", err)
	}
}

// cors adds CORS headers for credentialed fetch requests from the frontend.
func cors(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin == allowedOrigin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loadPrivateKey(path string) (*ecdsa.PrivateKey, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	block, _ := pem.Decode(data)
	if block == nil {
		return nil, fmt.Errorf("no PEM block in %s", path)
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse key: %w", err)
	}
	priv, ok := key.(*ecdsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("%s does not contain a P-256 key (run `make gen-keys` to regenerate)", path)
	}
	return priv, nil
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
