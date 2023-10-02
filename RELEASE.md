## Releasing a new version of G3W-CLIENT

- [ ] Ensure all https://github.com/g3w-suite/g3w-client/milestones issues and pull requests are resolved.
- [ ] Create or checkeout to a new appropriate branch: (eg. `v3.5.x` when bumping code from `3.5.0` to `3.5.1`)
- [ ] Compile local code: `npm run build`
- [ ] New tag: `git tag v3.5.1`
- [ ] Push local code to remote: `git push`
- [ ] Push local tags to remote: `git push --tags`
- [ ] Draft a new GitHub relase: https://github.com/g3w-suite/g3w-client/releases

<details>

<summary> Some info about <code>git tag</code> usage </summary>

**Listing local tags:**
```sh
git tag
```

**Add a new tag:**
```sh
git tag v3.5
```

**Update an existing tag:**
```sh
git tag -f v3.5
```

**Delete an  existing tag:**
```sh
git tag -d v3.5
```

**Publish a local tag:**
```sh
git push origin v3.5
```

**Publish all local tags:**
```sh
git push --tags
```

---

Fore more info:

- https://www.atlassian.com/git/tutorials/inspecting-a-repository/git-tag

</details>

## Updating G3W-ADMIN after the release

- [ ] Create a new branch from client release zip archive: https://github.com/g3w-suite/g3w-client/releases
- [ ] Create a new PR with title: `Bump g3w-client from <old_version> to <new_version>`
- [ ] Add the [`dependencies`](https://github.com/g3w-suite/g3w-admin/pulls?q=is%3Apr+is%3Aclosed+label%3Adependencies) label
- [ ] Add a link to changelog page in PR description (eg: `**g3w-client: [v3.8.10](https://github.com/g3w-suite/g3w-client/releases/tag/v3.8.10)**`)