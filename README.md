# CYOA GM

A portrait iPhone choose-your-own-adventure horror game with prewritten scenes, deterministic branching, d20 checks, health/sanity, inventory, and an optional AI narrator for freeform actions.

## AI is optional

- With AI disabled, the prewritten story and dice mechanics work without a network connection.
- Enable AI in **AI settings**, enter an OpenRouter API key, and select a model ID. The app sends the current scene, action, and roll outcome to OpenRouter for narration.
- The key is kept in app memory for the current session; it is not committed to this repository. A client-side key can still be extracted from a running app, so this is intended for personal use. For a public app, route requests through a server you control.
- AI narration can describe freeform actions, but the current local map remains the authoritative set of scenes and listed choices. AI responses are not guaranteed to be factually consistent; check them against the game state.

## Build an unsigned IPA with GitHub Actions

1. Open **Actions** and enable workflows if GitHub asks.
2. The workflow runs on pushes to `main`, or manually from **Actions → Build unsigned iOS IPA → Run workflow**.
3. Download the `CYOA-GM-unsigned-IPA` artifact from the completed workflow run.

The workflow builds on a GitHub-hosted macOS runner and packages an unsigned IPA. It does not sign the app or install it on your phone. Import the IPA into your preferred sideloading workflow and sign it with your own supported signing setup. An unsigned IPA cannot be installed directly.

## Build locally

Requires Node.js 20 and Xcode on macOS:

```sh
npm install
npx expo start
```

For native iOS builds, run `npx expo prebuild --platform ios` on macOS, then build the generated Xcode workspace.

## Important

The bundle identifier is `com.tiernan.cyoagm`. Change it in `app.json` if you need a different unique identifier. The starter project uses Expo SDK 52 and is intended as a starting build; if the hosted build fails, inspect the GitHub Actions log and update dependencies/toolchain accordingly.
