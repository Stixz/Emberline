## Signed Release Setup

This project supports two Windows build paths:

- `npm run build`
  Creates an unsigned installer for local testing.

- `npm run build:signed`
  Requires a valid code-signing certificate and fails if signing is unavailable.

### Required environment variables

Electron Builder will use standard certificate environment variables.

For a `.pfx` certificate file:

```powershell
$env:CSC_LINK = "C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "your-certificate-password"
```

For a base64 or remote certificate URL, `CSC_LINK` can also point to that source.

### Signed build command

```powershell
npm run build:signed
```

### Expected behavior

- The build should produce a signed installer in `dist/`.
- If the certificate is missing or invalid, the build should fail immediately.
- The default `npm run build` path remains unsigned for local smoke testing.

### Notes

- The current unsigned build disables `win.signAndEditExecutable` because this Windows environment cannot unpack the helper tools needed for that path without elevated symlink privileges.
- The signed build script overrides that setting and forces code signing on purpose.
- If SmartScreen reputation matters, use a real EV or OV code-signing certificate and distribute the signed installer consistently.