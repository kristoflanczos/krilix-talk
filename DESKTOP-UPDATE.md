# Krilix Talk Desktop Auto-update

A Desktop Pack 4 már külön release-only repót használ.

## Repo felállás

```text
kristoflanczos/krilix-talk
= forráskód, lehet PRIVATE

kristoflanczos/krilix-talk-releases
= csak desktop release fájlok, PUBLIC
```

Az app frissítője a public `krilix-talk-releases` repó GitHub Releases részét olvassa.

## Szükséges GitHub Actions secrets a krilix-talk repóban

GitHub repo → Settings → Secrets and variables → Actions

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_VAPID_PUBLIC_KEY
RELEASE_REPO_TOKEN
```

A `RELEASE_REPO_TOKEN` csak a `krilix-talk-releases` repóra kapjon jogosultságot:

```text
Contents: Read and write
Metadata: Read-only
```

## Release készítés

```powershell
git add .
git commit -m "Desktop Pack 4 release repo split"
git push

git tag v1.2.2
git push origin v1.2.2
```

A workflow a privát kód repóból buildel, de a kész fájlokat a public release repóba tölti.

## Miután ez működik

A `krilix-talk` forráskód repót vissza lehet állítani PRIVATE-ra.
A `krilix-talk-releases` repo maradjon PUBLIC.
