# CYOA GM

A portrait iPhone choose-your-own-adventure horror game with branching scenes, locally resolved d20 checks, health/sanity, inventory, randomized opening styles, and optional AI narration for custom actions.

## AI setup

1. Open **AI & story settings**.
2. Enable **Use live AI narrator** and choose the provider that issued your key.
3. Select a model from the dropdown, enter your key, then tap **TEST AI CONNECTION**.
4. Tap **SAVE & CLOSE SETTINGS**, then choose **New story** to generate an AI-written opening.

Google Gemini is the default provider. The default model is `gemini-3.5-flash-lite`, selected as a lightweight option for testing with a free Google AI Studio API key; `gemini-3.8-flash` and `gemini-3.6-flash` are also available in the model picker. Create a key with [Google AI Studio](https://aistudio.google.com/api-keys). Google’s free tier has model-specific rate limits and availability can vary by project; see the [official Gemini API pricing and free-tier details](https://ai.google.dev/gemini-api/docs/pricing). OpenRouter and custom OpenAI Chat Completions-compatible endpoints are also supported. Keys are provider-specific; a Google key will not work with OpenRouter or another provider.

The connection test has a 12-second timeout and narration requests have an 18-second timeout. While narration is pending, **STOP WAITING · USE BUILT-IN STORY** returns you to the built-in scene immediately. A late AI response cannot overwrite a newer action. Network issues, invalid keys, unsupported model IDs and provider quota limits can still prevent live AI from responding.

## Story customization

- **Randomize on every new story** selects one of four opening styles: Dark Folktale, Psychological Dread, Cosmic Horror, or Gothic Mystery.
- Choose a specific style to reuse it.
- Use **Custom premise or story direction** to give the AI a premise, setting details, tone, or mystery. Start **New story** after saving to generate a tailored opening.
- The local engine remains authoritative for dice, health, sanity, inventory and terminal states. AI may narrate consequences for listed choices and select a valid existing map destination for freeform actions, but it cannot create new map node IDs.

## Privacy and key safety

The API key stays in app memory for the current app session. It is not written to this GitHub repository or persistent storage. A key used by a client-side app can still be extracted from the installed app or device traffic; this is intended for personal use. Do not commit a real key. For public distribution, put the provider key behind a server you control.

## Interface direction

The UI uses a dark, worn-wood palette with aged-paper story panels, restrained amber dice accents, muted health/sanity meters, compact archival labels, and high-contrast action rows. The visual direction is informed by the candlelit tabletop and parchment atmosphere of horror games, without including their art or assets. The story uses a keyboard-aware scrolling layout; the action composer dismisses the keyboard when submitted and remains available after AI errors.

## Build an unsigned IPA with GitHub Actions

1. Open [Actions](https://github.com/TiernanDawg/cyoa-gm/actions).
2. Pushes to `main` and manual dispatches trigger **Build unsigned iOS IPA**.
3. Download the `CYOA-GM-unsigned-IPA` artifact from a successful workflow run.

The GitHub-hosted macOS runner exports the JavaScript bundle, generates the iOS project, compiles the app, and packages an unsigned IPA. The artifact does not sign or install the app. Import it into your preferred supported sideloading tool and sign it before installation.

## Build locally

Requires Node.js 20. On macOS, install dependencies and start Expo:

```sh
npm install
npx expo start
```

For native iOS builds, run `npx expo prebuild --platform ios` on macOS, then build the generated `ios/CYOAGM.xcworkspace`.

## App identifier

Bundle identifier: `com.tiernan.cyoagm` (configured in `app.json`).