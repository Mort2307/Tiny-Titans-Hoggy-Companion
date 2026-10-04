# Tiny Titans keeper deployment

Do not deploy `hosting:keeper` from a stale `dist` directory.

Use:

```powershell
npm run deploy:keeper
```

That command always runs the production build first and only then deploys the `tinytitanskeeper` Firebase Hosting target.

For a release that also changes Cloud Functions or Firestore indexes:

```powershell
npm run deploy:keeper:full
```

That sequence:

1. runs the complete Tiny Titans production build/contracts;
2. deploys the current `dist` to `hosting:keeper`;
3. deploys Firestore indexes;
4. deploys Functions with the repository's batched Functions deployment script.

A successful raw command such as `firebase deploy --only hosting:keeper` does **not** prove the newest application source was deployed. Firebase Hosting uploads the existing contents of `dist`; it does not run Vite automatically.
