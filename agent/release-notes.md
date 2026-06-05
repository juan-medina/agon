The agent now handles API rate limiting gracefully — when the server returns 429 the queue pauses for 5 minutes before retrying, preventing retry storms if the API is under load.

The agent now sends a versioned `User-Agent` header (`YurnikAgent/x.y.z`) with every request.
