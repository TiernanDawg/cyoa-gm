# DeadEnd 1.0.0
**Every path ends somewhere.**

DeadEnd is a portrait-first survival-horror adventure with a local branching engine, six procedurally varied story styles, risk-based d20 checks, local saves, a profile and optional AI narration. Built-in gameplay is designed to remain playable without an API key or network connection.

## Build
The app retains Expo SDK 52 / React Native 0.76.5, slug `cyoa-gm`, and bundle identifier `com.tiernan.cyoagm`. The release workflow generates a deterministic 1024×1024 creepy yellow smile icon from `scripts/generate-icon.js` before Expo validates or packages the app. On Node 20:
```sh
npm install
npx expo install --check
npm test
npm run audio:verify
npx expo export --platform ios
``
GitHub Actions generates and verifies the WAV pack, runs game-rule checks, validates the iOS bundle, then builds an unsigned IPA artifact named **DeadEnd**. It must be signed with your own sideloading workflow before installation.

## AI narrator
AI is optional. Add a provider key in Options → AI Connection. Never commit keys or paste them into issues. Client-side keys can be extracted from a sideloaded app. Requests send the scene and relevant game state to the selected provider. Built-in mode does not send game data anywhere. API keys are session-only by default and are excluded from save files.

## Audio
`scripts/generate-audio.js` synthesizes original atmospheric mono WAVs without third-party audio packages. Expect subtle ambience and UI cues, not cinematic sound design. Background playback is not enabled, and missing audio assets should never block gameplay.

## Privacy
No ads, analytics or tracking are included. Local saves, profile data and settings are stored on-device.
