The issue identifies duplicated code in GitHub auth logic between `packages/github-bot/src/github-auth.ts` and `packages/control-plane/src/auth/github-app.ts`.

My plan is to:
1. Extract `base64UrlEncode`, `parsePemPrivateKey`, `importPrivateKey`, `importPrivateKeyCached`, and `generateAppJwt` from `packages/control-plane/src/auth/github-app.ts` into a new file `packages/shared/src/github-auth.ts`.
2. Update `packages/shared/src/index.ts` to export from `./github-auth`.
3. Refactor `packages/control-plane/src/auth/github-app.ts` to import `generateAppJwt` from `@open-inspect/shared` and remove its duplicated internal implementation.
4. Refactor `packages/github-bot/src/github-auth.ts` to also import `generateAppJwt` from `@open-inspect/shared` and remove its duplicated `base64UrlEncode`, `parsePemPrivateKey`, `importPrivateKey` and `generateAppJwt` implementations. I will also unify the `GitHubAppConfig` interface and put it in `shared`.
5. Run tests for both packages `npm run test -w @open-inspect/github-bot` and `npm run test -w @open-inspect/control-plane`. Run pre-commit instructions.
6. Submit the change.
