# Vauldy React Native

Mobile client for [Vauldy](https://github.com/knoxmedia/Vauldy) media server. Cross-platform (Android / iOS) app built with Expo and React Native.

## Phase 1 (MVP)

- Server setup and JWT login
- Home: libraries, continue watching, recently added
- Browse libraries (video / music / photo / document)
- Media detail, favorites
- Video/audio playback (HLS / direct stream)
- Photo lightbox, document reader (PDF / Office preview)
- Settings: language, server URL, logout

## Prerequisites

- Node.js 20+
- Expo CLI (`npx expo`)
- Android Studio or Xcode for device builds

## Development

```bash
cd Vauldy-ReactNative
npm install
npx expo start
```

Configure the Vauldy server URL on first launch (default `http://127.0.0.1:8200`). Demo login: `admin` / `admin123`.

## Project layout

```
app/           Expo Router screens
src/api/       Vauldy REST client
src/components/ Shared UI
src/constants/ Theme (aligned with Vauldy Web)
src/i18n/      zh-CN / en
src/lib/       Media URL helpers
src/store/     Auth & server config (Zustand)
doc/           Requirements specification
```

## Related

- Main server: [knoxmedia/Vauldy](https://github.com/knoxmedia/Vauldy)
- Requirements: `doc/移动终端需求规格书.md`
