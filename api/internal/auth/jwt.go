// SPDX-FileCopyrightText: 2026 Juan Medina
// SPDX-License-Identifier: MIT
package auth

import (
	"crypto/ed25519"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const sessionDuration = 7 * 24 * time.Hour

type sessionClaims struct {
	jwt.RegisteredClaims
}

// CreateSessionJWT issues a signed EdDSA JWT containing the user's DID as subject.
func CreateSessionJWT(did string, priv ed25519.PrivateKey) (string, error) {
	now := time.Now()
	claims := sessionClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   did,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(sessionDuration)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
	return t.SignedString(priv)
}

// ParseSessionJWT verifies a session JWT and returns the DID.
func ParseSessionJWT(tokenString string, pub ed25519.PublicKey) (string, error) {
	t, err := jwt.ParseWithClaims(tokenString, &sessionClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return pub, nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := t.Claims.(*sessionClaims)
	if !ok || !t.Valid {
		return "", fmt.Errorf("invalid token")
	}
	return claims.Subject, nil
}
