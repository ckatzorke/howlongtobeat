# Release 1.9.0

Date: 2026-04-10

## Summary

Version 1.9.0 updates the request flow to match the current HowLongToBeat API and confirms end-to-end stability with full test coverage.

## Highlights

- Updated search flow to use `/api/find/init` and `/api/find`
- Added required auth and honeypot headers/fields for search requests
- Added token caching and one-time retry on HTTP 403
- Updated detail request route to `/game?id=`
- Added numeric `gameId` validation to reduce injection/SSRF risk
- Added `AbortSignal` support for `search()` and `detail()`
- Kept backward compatibility for `playableOn` while exposing `platforms`

## Validation

- Full test suite: 17/17 passing
- Integration tests: 8/8 passing

## Upgrade

Install or update to 1.9.0:

```bash
npm install howlongtobeat@^1.9.0
```

For GitHub releases, create and push a matching tag:

```bash
git tag v1.9.0
git push origin v1.9.0
```
