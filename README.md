# GPMF CWD

This is a simple setup for extracting the GPMF data from all GoPro footage in a directory for usage in After Effects as JSON. The hard parts are handled by the 'gpmf-extract' and 'gopro-telemetry' packages. This is just a setup for easy usage.

## Usage

### With Bun (development)

Run against a directory containing MP4 files (writes a JSON next to each file):

```sh
bun index.ts ./data
```

### As a Windows binary

Build the binary locally (Windows):

```sh
bun run build:win
```

This produces `dist/gpmf-cwd.exe`.

Run it the same way:

```powershell
./dist/gpmf-cwd.exe ./data
```

Notes:

- Input arg is a directory. The tool finds `*.MP4`/`*.mp4` and writes `*.json` next to each.
- JSON contains telemetry grouped by device and streams (e.g., `GPS9.samples`).

### Install on Windows (add to PATH)

Goal: be able to run `gpmf-cwd` in any folder and process the MP4s in that folder.

1. Download the latest release asset from GitHub (file name like `gpmf-cwd-vX.Y.Z.exe`).
2. Create a tools folder, e.g. `C:\Tools\gpmf-cwd`.
3. Move the downloaded file there and rename it to `gpmf-cwd.exe` (optional but recommended for a stable command name).
4. Add that folder to your PATH:
    - Windows Settings → System → About → Advanced system settings → Environment Variables
    - Select your user `Path` → Edit → New → `C:\Tools\gpmf-cwd` → OK
5. Open a new PowerShell or CMD window. In any folder with MP4s, run:

```powershell
gpmf-cwd
```

Notes:

- With no arguments, it processes the current directory. You can also pass a directory explicitly: `gpmf-cwd D:\videos`.
- JSON is written next to each `.MP4` file.

## CI builds

On push to `main`, GitHub Actions builds a Windows binary and publishes a GitHub Release using the version from `package.json`. The raw `.exe` is attached to the release (no zip).

## ToDo

- Add macOS/Linux build matrix and release publishing
- Fix running large files (RAM)

## Versions

### 0.3.0 (250809)

- Skip JSON creation when no GPS streams are found (avoids near-empty files)

### 0.2.0 (250809)

- Windows exe build script via Bun (`bun run build:win`)
- GitHub Actions workflow to build and add exe to releases on `main`

### 0.1.0 (250809)

- Baseline working
