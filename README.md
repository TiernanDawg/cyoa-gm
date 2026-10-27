# DeadEnd
**Every path ends somewhere.**

DeadEnd is a portrait-first survival-horror adventure with a local branching engine and optional AI narration. The game remains playable without an API key or network connection. The original tale is **The Dark Below**; new runs can vary their style and premise.

## Build
The project uses Expo SDK 52 / React Native 0.76.5 and retains bundle identifier `com.tiernan.cyoagm`. On Node 20:
```sh
npm install
npx expo install --check
npm run audio:generate
npm run audio:verify
npm test
npx expo export --platform ios
``
GitHub Actions builds an unsigned IPA named `DeadEnd-unsigned.ipa`. It is not signed for installation; sign it with your personal sideloading workflow.

## AI narrator
AI is optional. Add a provider key in Options → AI Connection. Never commit keys or paste them into issues. Client-side keys can be extracted from a sideloaded app. Requests send the scene and relevant game state to the provider. Built-in mode does not send game data anywhere. Keys are session-only and excluded from settings and save files.

## Audio
`scripts/generate-audio.js` synthesizes original, modest atmospheric mono WAVs without third-party audio packages. Expect restrained ambience and UI cues, not cinematic sound design. The GitHub workflow generates and verifies the audio pack before the export. Missing or failed audio must not prevent built-in gameplay.

## Privacy
No ads, analytics, or tracking are included. Local saves, profile data and settings are stored on-device. Background audio and special entitlements are not required. The currently uploaded icon image is 256×256 WEBP rather than the requested 1024×1024 PNG; the app continues to use Expo's default icon until the full-resolution PNG is supplied at `assets/icon.png`.
