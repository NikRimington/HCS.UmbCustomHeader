# Contributing Guidelines

Contributions to this package are most welcome! 

There is a test site in the solution to make working with this repository easier.
It is configured to do an unattended install, check `appSettings.json` for the login details.
## Running the tests

```
# server
dotnet test test/HCS.UmbCustomHeader.Tests

# client (nav model has a 100% coverage threshold)
cd src/HCS.UmbCustomHeader/Client && npm ci && npm run test:coverage && npm run build

# end to end: start the test site first
cd src/HCS.UmbCustomHeader.TestSite
ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=https://localhost:44301 dotnet run --no-launch-profile
cd test/e2e && npm ci && npx playwright install chromium && npx playwright test --project=grouped-nav
```

To check the fallbacks, restart the site with `HCS__UmbCustomHeader__Enabled=false` (or `HCS__UmbCustomHeader__Groups__0__Label=""` for invalid config) and run
`GN_SCENARIO=disabled npx playwright test --project=scenario`.

## Pull requests

`main` is protected: changes go in through a pull request, are squash-merged, and need the `ci-ok` check (all CI jobs) to pass.
The branch and tag rules live in `.github/rulesets/` and can be re-applied with
`gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/<file>.json`.
