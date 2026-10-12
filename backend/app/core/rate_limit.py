"""
Rate limiting configuration using slowapi.

We key on remote IP. In production behind a reverse proxy (nginx, Cloudflare),
remember to set `trusted_proxy_count` or inspect X-Forwarded-For, or all
requests will appear to come from the proxy's IP.

Usage in an endpoint:

    from app.core.rate_limit import limiter

    @router.post("/login")
    @limiter.limit("5/15minutes")
    async def login(request: Request, ...):
        ...
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
