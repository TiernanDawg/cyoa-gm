# CYOA GM

A portrait iPhone choose-your-own-adventure horror game with prewritten scenes, deterministic branching, d20 checks, health/sanity, inventory, and an optional AI narrator for freeform actions.

## AI is optional

- With AI disabled, the prewritten story and dice mechanics work without a network connection.
- Enable AI in **AI settings**, choose a provider, enter its API key, and select a model ID. Google Gemini accepts a key from [Google AI Studio](https://aistudio.google.com/api-keys) (default model: `gemini-2.5-flash`). OpenRouter remains supported. The OpenAI-compatible option accepts a custom Chat Completions endpoint, model ID, and provider key for services that implement that API format.
- The key is kept in app memory for the current session; it is not committed to this repository. A client-side key can still be extracted from a running app, so this is intended for personal use. For a public app, route requests through a server you control.
- AI narration can describe freeform actions, but the current local map remains the authoritative set of scenes and listed choices. AI responses are not guaranteed to be factually consistent; check them against the game state.
- A key only works with the provider it was issued for; keys are not interchangeable between providers. The custom endpoint option is for OpenAI Chat Completions-compatible APIs, not every API on the internet. API keys are kept in app memory for the current session and are not persisted. A key embedded in a client app can still be extracted, so this is intended for personal use; for a public app, route requests through a server you control.

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
