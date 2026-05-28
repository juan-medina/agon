// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT

// Package atproto provides a thin client for writing and deleting records on a
// Bluesky PDS. It covers only the operations Agōn needs — CreateRecord,
// DeleteRecord, and GetRecord — and nothing else.
package atproto

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

const defaultPDS = "https://bsky.social"

// Client writes and deletes AT Proto records on a PDS on behalf of a user.
// The accessToken must already be a valid Bluesky OAuth access token for the
// given DID. Token refresh is the caller's responsibility.
type Client struct {
	pds        string
	httpClient *http.Client
}

// New returns a Client targeting the given PDS URL.
// Pass an empty string to use the default (https://bsky.social).
func New(pds string, httpClient *http.Client) *Client {
	if pds == "" {
		pds = defaultPDS
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Client{pds: pds, httpClient: httpClient}
}

// Record is the payload passed to CreateRecord.
type Record struct {
	// Collection is the NSID of the lexicon, e.g. "app.agon.journey".
	Collection string `json:"collection"`
	// Repo is the DID of the user whose repo the record is written into.
	Repo string `json:"repo"`
	// Record is the record body — any JSON-serialisable value.
	Record any `json:"record"`
}

// CreateResult is returned by CreateRecord on success.
type CreateResult struct {
	// URI is the at:// URI of the newly created record.
	URI string `json:"uri"`
	// CID is the content-addressed identifier of the record.
	CID string `json:"cid"`
}

// CreateRecord writes a record to the PDS and returns its AT URI and CID.
func (c *Client) CreateRecord(ctx context.Context, accessToken string, rec Record) (CreateResult, error) {
	body, err := json.Marshal(rec)
	if err != nil {
		return CreateResult{}, fmt.Errorf("atproto: marshal record: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.pds+"/xrpc/com.atproto.repo.createRecord",
		bytes.NewReader(body),
	)
	if err != nil {
		return CreateResult{}, fmt.Errorf("atproto: build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return CreateResult{}, fmt.Errorf("atproto: create record: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return CreateResult{}, fmt.Errorf("atproto: create record %d: %s", resp.StatusCode, b)
	}

	var result CreateResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return CreateResult{}, fmt.Errorf("atproto: decode create response: %w", err)
	}
	return result, nil
}

// DeleteRecord removes a record from the PDS by its AT URI.
// uri must be a fully-qualified at:// URI, e.g. at://did:plc:abc/app.agon.journey/xyz.
func (c *Client) DeleteRecord(ctx context.Context, accessToken, uri string) error {
	repo, collection, rkey, err := parseATURI(uri)
	if err != nil {
		return fmt.Errorf("atproto: delete record: %w", err)
	}

	payload := map[string]string{
		"repo":       repo,
		"collection": collection,
		"rkey":       rkey,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("atproto: marshal delete payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.pds+"/xrpc/com.atproto.repo.deleteRecord",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("atproto: build delete request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("atproto: delete record: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("atproto: delete record %d: %s", resp.StatusCode, b)
	}
	return nil
}

// GetRecord fetches a record from the PDS by its AT URI and decodes it into out.
// uri must be a fully-qualified at:// URI.
func (c *Client) GetRecord(ctx context.Context, uri string, out any) error {
	repo, collection, rkey, err := parseATURI(uri)
	if err != nil {
		return fmt.Errorf("atproto: get record: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.pds+"/xrpc/com.atproto.repo.getRecord",
		nil,
	)
	if err != nil {
		return fmt.Errorf("atproto: build get request: %w", err)
	}
	q := req.URL.Query()
	q.Set("repo", repo)
	q.Set("collection", collection)
	q.Set("rkey", rkey)
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("atproto: get record: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("atproto: get record %d: %s", resp.StatusCode, b)
	}

	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("atproto: decode get response: %w", err)
	}
	return nil
}

// parseATURI splits an at:// URI into repo, collection, and rkey.
// Expected form: at://<repo>/<collection>/<rkey>
func parseATURI(uri string) (repo, collection, rkey string, err error) {
	const prefix = "at://"
	if len(uri) <= len(prefix) || uri[:len(prefix)] != prefix {
		return "", "", "", fmt.Errorf("invalid AT URI: %q", uri)
	}
	rest := uri[len(prefix):]
	// repo ends at the first slash
	slash1 := indexOf(rest, '/')
	if slash1 < 0 {
		return "", "", "", fmt.Errorf("invalid AT URI (no collection): %q", uri)
	}
	repo = rest[:slash1]
	rest = rest[slash1+1:]
	// collection ends at the next slash
	slash2 := indexOf(rest, '/')
	if slash2 < 0 {
		return "", "", "", fmt.Errorf("invalid AT URI (no rkey): %q", uri)
	}
	collection = rest[:slash2]
	rkey = rest[slash2+1:]
	if rkey == "" {
		return "", "", "", fmt.Errorf("invalid AT URI (empty rkey): %q", uri)
	}
	return repo, collection, rkey, nil
}

func indexOf(s string, b byte) int {
	for i := range s {
		if s[i] == b {
			return i
		}
	}
	return -1
}
