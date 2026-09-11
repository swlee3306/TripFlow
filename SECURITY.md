# Configuration security

Redis connections read `REDIS_URL` from the process environment. Set it through your local or deployment secret store before using Redis-backed routes. No production connection or credential validity was tested during portfolio maintenance.

Do not place a real connection string in source, screenshots or issue reports. Previously committed credentials are not made safe by removing them from the current tree: their owner must revoke them if active. This change does not rotate any remote credential or rewrite Git history.

Use synthetic inputs to report bugs. Never test someone else's Redis instance or upload private customer data.
