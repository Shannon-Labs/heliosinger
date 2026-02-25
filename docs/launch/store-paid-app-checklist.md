# Paid App Store Launch Checklist ($4.99)

Last updated: 2026-02-18

## Strategy

- Monetization model: paid download
- Price target: USD `$4.99`
- In-app purchase code: not required

## Current execution status (2026-02-18)

- Result: `FAIL (not executed in terminal session)`
- Evidence: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/store/2026-02-18-terminal-only/store-console-blocked.md`
- Blocker: App Store Connect and Google Play Console actions require external authenticated console/device access.

## App Store Connect checklist

- [ ] Apple Developer account active and agreements accepted
- [ ] New iOS app record created (`com.shannonlabs.heliosinger`)
- [ ] Price set to Tier matching ~$4.99 in target storefronts
- [ ] App name, subtitle, keywords, description, privacy URL, support URL entered
- [ ] Screenshots uploaded for all required device classes
- [ ] Age rating questionnaire completed
- [ ] Export compliance completed
- [ ] App Privacy nutrition labels completed
- [ ] Build uploaded and attached to version
- [ ] Submission notes include background audio + notification behavior

## Play Console checklist

- [ ] Google Play developer account active
- [ ] New app record created (`com.shannonlabs.heliosinger`)
- [ ] Pricing set to paid (`$4.99` base in US)
- [ ] Country pricing localization reviewed and accepted
- [ ] Short description + full description entered
- [ ] Feature graphic and screenshots uploaded
- [ ] Content rating and target audience completed
- [ ] Data safety form completed
- [ ] Release notes entered
- [ ] Production rollout configured

## Localization and pricing checklist

- [ ] Confirm US base price `$4.99`
- [ ] Review auto-converted local prices for major markets
- [ ] Override regions where psychological pricing adjustment is preferred
- [ ] Confirm tax handling is store-managed

## Pre-submit gates

- [ ] Device validation matrix completed for iOS and Android
- [ ] Push alert flow validated against production endpoints
- [ ] Background audio and lockscreen controls validated
- [ ] Rollback drill completed and logged
