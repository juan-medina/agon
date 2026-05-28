// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// CreateSessionWithAppPassword authenticates with a Bluesky PDS using an app
// password and returns the access token. This bypasses the OAuth flow and is
// intended for use in integration tests only — never in production code paths.
func CreateSessionWithAppPassword(ctx context.Context, pds, handle, appPassword string) (string, error) {
	body, err := json.Marshal(map[string]string{
		"identifier": handle,
		"password":   appPassword,
	})
	if err != nil {
		return "", fmt.Errorf("appsession: marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		pds+"/xrpc/com.atproto.server.createSession",
		bytes.NewReader(body),
	)
	if err != nil {
		return "", fmt.Errorf("appsession: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("appsession: request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("appsession: %d: %s", resp.StatusCode, b)
	}

	var result struct {
		AccessToken string `json:"accessJwt"`
		DID         string `json:"did"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("appsession: decode: %w", err)
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("appsession: empty access token in response")
	}
	return result.AccessToken, nil
}
