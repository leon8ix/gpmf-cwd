# GPMF CWD

This is a simple tool for extracting GPMF telemetry from GoPro MP4s and writing MGJSON files for Adobe After Effects. It relies on `gpmf-extract` and `gopro-telemetry` under the hood.

Bun is used to build this setup to a binary. The goal is being able to run `gpmf-cwd` from any folder to convert all its contents (mp4 files) to mgjson.

## Usage

### With Bun (development)

Run against a directory containing MP4 files (writes an `.mgjson` next to each):

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

- If you omit the path argument, it processes the current directory.
- The tool finds `*.MP4`/`*.mp4` and writes `*.mgjson` next to each.

### Export for Adobe After Effects (MGJSON)

For each processed MP4 the tool writes an `.mgjson`. Import it in After Effects as footage to get data streams you can link properties/effects to.

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
- An `.mgjson` is written next to each `.MP4` file.

## Prerequisites for large files

For multi‑GB MP4s, install ffmpeg/ffprobe so the tool can extract only the GoPro MET (GPMD) stream and avoid loading the whole video into memory.

- Windows (winget):

```powershell
winget install "FFmpeg (Essentials Build)"
```

Behavior with large files:

- If ffmpeg/ffprobe are available: the tool extracts only the telemetry track first (memory‑safe) and proceeds.
- If ffmpeg/ffprobe are not available: files ≳4 GB are skipped with an install suggestion; smaller files are attempted in‑memory and, if an out‑of‑memory occurs, a friendly suggestion is shown.

## CI builds

On push to `main`, GitHub Actions builds a Windows binary and publishes a GitHub Release using the version from `package.json`. The raw `.exe` is attached to the release (no zip).

## License

- This project is licensed under the MIT License. See `LICENSE` for details.
- It uses `gpmf-extract` (MIT) and `gopro-telemetry` (ISC). Please retain their notices when redistributing.

## ToDo

- Add macOS/Linux build matrix and release publishing

## Versions

### 0.5.0 (250810)

- Output actual MGJSON for After Effects instead of general JSON

### 0.4.0 (250810)

- Large-file handling: prefer ffmpeg/ffprobe to extract only the GPMD track; skip very large files if ffmpeg is unavailable; README adds ffmpeg install.

### 0.3.0 (250809)

- Skip JSON creation when no GPS streams are found (avoids near-empty files)

### 0.2.0 (250809)

- Windows exe build script via Bun (`bun run build:win`)
- GitHub Actions workflow to build and add exe to releases on `main`

### 0.1.0 (250809)

- Baseline working
