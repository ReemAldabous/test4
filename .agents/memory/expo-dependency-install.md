---
name: Expo dependency install
description: Replit package-firewall behavior encountered while preparing the PharmaTel Expo preview.
---

Expo preview setup may fail before the app starts when the package firewall blocks transitive npm archives, leaving `node_modules` incomplete and `expo` unavailable.

**Why:** The project depends on Expo CLI and React Native packages whose transitive archives were blocked during installation, so source-level checks and the preview cannot run until the environment permits a complete install.

**How to apply:** Treat a missing `node_modules/.bin/expo` as an installation/environment issue first; do not change the backend or restructure the app to work around it.