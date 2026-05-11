# Krilix Talk Desktop Auto-update

A Desktop Pack 3 GitHub Releases alapú frissítést használ.

## Egyszeri GitHub Secrets beállítás

GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add hozzá:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_VAPID_PUBLIC_KEY
```

Ugyanazokkal az értékekkel, mint a helyi `.env` és Netlify env.

## Release készítés

Frissítés után:

```powershell
git add .
git commit -m "Desktop Pack 3"
git push
git tag v1.2.0
git push origin v1.2.0
```

A tag push elindítja a GitHub Actions workflow-t, ami elkészíti a Windows telepítőt és a release fájlokat.

## Fontos

A Desktop Pack 3-at még egyszer kézzel kell telepíteni.
Ezután a következő verzióknál az app Beállítások → Desktop app részében lehet frissítést keresni, letölteni és telepíteni.

## Következő verziók

A verziószámot mindig emelni kell a `package.json`-ban.

Példa:

```json
"version": "1.2.1"
```

Majd:

```powershell
git add .
git commit -m "Desktop update 1.2.1"
git push
git tag v1.2.1
git push origin v1.2.1
```
