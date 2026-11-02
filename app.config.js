// Extends app.json with values that must not live in the repo.
//
// GOOGLE_MAPS_ANDROID_KEY powers the gym map on Android (react-native-maps uses
// Google Maps there; iOS uses Apple Maps and needs no key). Set it as an EAS
// environment variable so builds pick it up:
//
//   eas env:create --name GOOGLE_MAPS_ANDROID_KEY --value <key> --environment production --environment preview --environment development --visibility sensitive
//
// Without it the app still builds, but the map on Android shows a blank grid.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '' },
    },
  },
});
