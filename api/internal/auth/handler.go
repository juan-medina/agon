// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import (
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Config holds OAuth endpoints and application URLs.
type Config struct {
	ClientID      string // e.g. http://localhost
	RedirectURI   string // e.g. http://127.0.0.1:8080/auth/callback
	FrontendURL   string // e.g. http://localhost:5173
	AuthEndpoint  string // Bluesky authorize URL
	PAREndpoint   string // Bluesky PAR URL (required by bsky.social)
	TokenEndpoint string // Bluesky token URL
}

// Handler handles the Bluesky OAuth flow.
type Handler struct {
	priv  *ecdsa.PrivateKey
	pub   *ecdsa.PublicKey
	store *stateStore
	cfg   Config
}

func NewHandler(priv *ecdsa.PrivateKey, cfg Config) *Handler {
	return &Handler{
		priv:  priv,
		pub:   &priv.PublicKey,
		store: newStateStore(),
		cfg:   cfg,
	}
}

// effectiveClientID returns the client_id to send to Bluesky.
//
// For the AT Proto loopback exception (client_id=http://localhost), the
// authorization server cannot fetch remote metadata, so allowed redirect URIs
// must be embedded as query parameters in the client_id URL itself:
//
//	http://localhost?redirect_uri=http%3A%2F%2F127.0.0.1%3A8080%2Fauth%2Fcallback
//
// The AS parses the query params to build the virtual client metadata rather
// than making an outbound request.
func (h *Handler) effectiveClientID() string {
	if h.cfg.ClientID != "http://localhost" {
		return h.cfg.ClientID
	}
	q := url.Values{}
	q.Set("redirect_uri", h.cfg.RedirectURI)
	return "http://localhost?" + q.Encode()
}

// Register mounts auth routes on mux.
func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /.well-known/oauth-client-metadata.json", h.clientMetadata)
	mux.HandleFunc("GET /auth/init", h.initAuth)
	mux.HandleFunc("GET /auth/callback", h.callback)
	mux.HandleFunc("POST /auth/session", h.session)
	mux.HandleFunc("POST /auth/logout", h.logout)
}

// clientMetadata serves AT Proto OAuth client metadata.
func (h *Handler) clientMetadata(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"client_id":                  h.effectiveClientID(),
		"client_name":                "Agōn",
		"redirect_uris":              []string{h.cfg.RedirectURI},
		"grant_types":                []string{"authorization_code"},
		"response_types":             []string{"code"},
		"scope":                      "atproto",
		"token_endpoint_auth_method": "none",
		"application_type":           "native",
		"dpop_bound_access_tokens":   true,
	})
}

// initAuth stores the frontend's PKCE challenge in a cookie, pushes the
// authorization request to Bluesky via PAR, then redirects the browser to the
// Bluesky authorize endpoint with just client_id + request_uri.
func (h *Handler) initAuth(w http.ResponseWriter, r *http.Request) {
	challenge := r.URL.Query().Get("challenge")
	if challenge == "" {
		http.Error(w, "missing challenge", http.StatusBadRequest)
		return
	}

	serverVerifier, err := GenerateVerifier()
	if err != nil {
		log.Printf("auth/init: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}
	serverChallenge := DeriveChallenge(serverVerifier)

	h.store.put(challenge, serverVerifier, 10*time.Minute)

	http.SetCookie(w, &http.Cookie{
		Name:     "pkce_challenge",
		Value:    challenge,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   600,
	})

	requestURI, err := h.doPAR(challenge, serverChallenge)
	if err != nil {
		log.Printf("auth/init: PAR: %v", err)
		http.Error(w, "authorization request failed", http.StatusBadGateway)
		return
	}

	params := url.Values{
		"client_id":   {h.effectiveClientID()},
		"request_uri": {requestURI},
	}
	http.Redirect(w, r, h.cfg.AuthEndpoint+"?"+params.Encode(), http.StatusFound)
}

type parResult struct {
	requestURI string
	retryNonce string
}

// doPAR pushes authorization parameters to Bluesky's PAR endpoint, retrying
// once with a DPoP nonce if the server demands one.
func (h *Handler) doPAR(state, serverChallenge string) (string, error) {
	nonce := ""
	for attempt := 0; attempt < 2; attempt++ {
		result, err := h.doPARRequest(state, serverChallenge, nonce)
		if err != nil {
			return "", err
		}
		if result.retryNonce != "" {
			nonce = result.retryNonce
			continue
		}
		return result.requestURI, nil
	}
	return "", fmt.Errorf("exhausted DPoP nonce retries for PAR")
}

func (h *Handler) doPARRequest(state, serverChallenge, nonce string) (parResult, error) {
	dpopProof, err := CreateDPoPProof(h.priv, "POST", h.cfg.PAREndpoint, nonce)
	if err != nil {
		return parResult{}, fmt.Errorf("dpop proof: %w", err)
	}

	body := url.Values{
		"response_type":         {"code"},
		"client_id":             {h.effectiveClientID()},
		"redirect_uri":          {h.cfg.RedirectURI},
		"scope":                 {"atproto"},
		"state":                 {state},
		"code_challenge":        {serverChallenge},
		"code_challenge_method": {"S256"},
	}

	req, err := http.NewRequest(http.MethodPost, h.cfg.PAREndpoint, strings.NewReader(body.Encode()))
	if err != nil {
		return parResult{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("DPoP", dpopProof)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return parResult{}, fmt.Errorf("PAR request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusCreated {
		dpopNonce := resp.Header.Get("DPoP-Nonce")
		log.Printf("PAR %d body=%s dpop-nonce=%s", resp.StatusCode, respBody, dpopNonce)
		// Retry once if the server demands a fresh DPoP nonce.
		var errResp struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(respBody, &errResp)
		if errResp.Error == "use_dpop_nonce" && dpopNonce != "" {
			return parResult{retryNonce: dpopNonce}, nil
		}
		return parResult{}, fmt.Errorf("PAR endpoint %d: %s", resp.StatusCode, respBody)
	}

	var pr struct {
		RequestURI string `json:"request_uri"`
	}
	if err := json.Unmarshal(respBody, &pr); err != nil {
		return parResult{}, fmt.Errorf("decode PAR response: %w", err)
	}
	if pr.RequestURI == "" {
		return parResult{}, fmt.Errorf("missing request_uri in PAR response")
	}
	return parResult{requestURI: pr.RequestURI}, nil
}

// callback receives the authorization code from Bluesky, exchanges it for a
// DID, stores the result, then redirects the browser to the frontend.
func (h *Handler) callback(w http.ResponseWriter, r *http.Request) {
	// Bluesky signals errors via query params even when redirecting to our URI.
	if errCode := r.URL.Query().Get("error"); errCode != "" {
		log.Printf("auth/callback: Bluesky error: %s — %s", errCode, r.URL.Query().Get("error_description"))
		http.Redirect(w, r, h.cfg.FrontendURL+"/login?error="+url.QueryEscape(errCode), http.StatusFound)
		return
	}

	code := r.URL.Query().Get("code")
	challenge := r.URL.Query().Get("state")

	if code == "" || challenge == "" {
		http.Error(w, "missing code or state", http.StatusBadRequest)
		return
	}

	// CSRF check: the pkce_challenge cookie was set by initAuth on 127.0.0.1;
	// Bluesky redirects back to 127.0.0.1 so the browser sends it here. The
	// cookie value must match the state param to confirm this is our redirect.
	cookie, err := r.Cookie("pkce_challenge")
	if err != nil || cookie.Value != challenge {
		http.Error(w, "state mismatch", http.StatusBadRequest)
		return
	}

	entry, ok := h.store.get(challenge)
	if !ok {
		http.Error(w, "unknown or expired state", http.StatusBadRequest)
		return
	}

	did, err := h.exchangeCode(code, entry.serverVerifier)
	if err != nil {
		log.Printf("auth/callback: %v", err)
		http.Error(w, "token exchange failed", http.StatusBadGateway)
		return
	}

	if !h.store.setDID(challenge, did) {
		http.Error(w, "state expired during exchange", http.StatusBadRequest)
		return
	}

	http.Redirect(w, r, h.cfg.FrontendURL+"/auth/complete", http.StatusFound)
}

// session verifies the frontend's PKCE verifier against the challenge cookie,
// issues a signed session JWT, and returns the DID.
func (h *Handler) session(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Verifier string `json:"verifier"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Verifier == "" {
		http.Error(w, "missing verifier", http.StatusBadRequest)
		return
	}

	cookie, err := r.Cookie("pkce_challenge")
	if err != nil {
		http.Error(w, "missing challenge cookie", http.StatusBadRequest)
		return
	}
	challenge := cookie.Value

	if !VerifyChallenge(body.Verifier, challenge) {
		http.Error(w, "verifier mismatch", http.StatusUnauthorized)
		return
	}

	entry, ok := h.store.get(challenge)
	if !ok || entry.did == "" {
		http.Error(w, "state not found or DID pending", http.StatusBadRequest)
		return
	}

	tokenString, err := CreateSessionJWT(entry.did, h.priv)
	if err != nil {
		log.Printf("auth/session: create JWT: %v", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	h.store.delete(challenge)

	http.SetCookie(w, &http.Cookie{
		Name:     "pkce_challenge",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     "agon_session",
		Value:    tokenString,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(sessionDuration.Seconds()),
	})
	// Non-HttpOnly flag cookie so the frontend can check auth state synchronously.
	http.SetCookie(w, &http.Cookie{
		Name:     "agon_authed",
		Value:    "1",
		Path:     "/",
		HttpOnly: false,
		SameSite: http.SameSiteStrictMode,
		MaxAge:   int(sessionDuration.Seconds()),
	})

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"did": entry.did})
}

// logout clears both session cookies.
func (h *Handler) logout(w http.ResponseWriter, _ *http.Request) {
	for _, name := range []string{"agon_session", "agon_authed"} {
		http.SetCookie(w, &http.Cookie{
			Name:   name,
			Value:  "",
			Path:   "/",
			MaxAge: -1,
		})
	}
	w.WriteHeader(http.StatusNoContent)
}

type exchangeResult struct {
	did        string
	retryNonce string
}

// exchangeCode swaps an authorization code for a DID using the Bluesky token
// endpoint. It retries once if the server demands a DPoP nonce.
func (h *Handler) exchangeCode(code, serverVerifier string) (string, error) {
	nonce := ""
	for attempt := 0; attempt < 2; attempt++ {
		result, err := h.doTokenExchange(code, serverVerifier, nonce)
		if err != nil {
			return "", err
		}
		if result.retryNonce != "" {
			nonce = result.retryNonce
			continue
		}
		return result.did, nil
	}
	return "", fmt.Errorf("exhausted DPoP nonce retries")
}

func (h *Handler) doTokenExchange(code, serverVerifier, nonce string) (exchangeResult, error) {
	dpopProof, err := CreateDPoPProof(h.priv, "POST", h.cfg.TokenEndpoint, nonce)
	if err != nil {
		return exchangeResult{}, fmt.Errorf("dpop proof: %w", err)
	}

	body := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {h.cfg.RedirectURI},
		"client_id":     {h.effectiveClientID()},
		"code_verifier": {serverVerifier},
	}

	req, err := http.NewRequest(http.MethodPost, h.cfg.TokenEndpoint, strings.NewReader(body.Encode()))
	if err != nil {
		return exchangeResult{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("DPoP", dpopProof)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return exchangeResult{}, fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusBadRequest {
		if dpopNonce := resp.Header.Get("DPoP-Nonce"); dpopNonce != "" {
			return exchangeResult{retryNonce: dpopNonce}, nil
		}
	}

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return exchangeResult{}, fmt.Errorf("token endpoint %d: %s", resp.StatusCode, b)
	}

	var tr struct {
		Sub string `json:"sub"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return exchangeResult{}, fmt.Errorf("decode response: %w", err)
	}
	if tr.Sub == "" {
		return exchangeResult{}, fmt.Errorf("missing sub in token response")
	}
	return exchangeResult{did: tr.Sub}, nil
}
