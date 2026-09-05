# Focus

A deliberately small Manifest V3 Chrome extension for protected focus sessions.

## Development

```sh
npm install
npm run typecheck
npm run build
```

Load the generated `dist/` directory from `chrome://extensions` with Developer mode enabled. To apply the same session in Incognito windows, enable **Allow in Incognito** for the extension.