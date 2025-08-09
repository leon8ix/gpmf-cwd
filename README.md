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

## CI builds

On push to `main`, GitHub Actions builds a Windows binary and publishes a GitHub Release using the version from `package.json`. The raw `.exe` is attached to the release (no zip).

## ToDo

- Add macOS/Linux build matrix and release publishing
- Fix running large files (RAM)

## Versions

### 0.2.0 (250809)

- Windows exe build script via Bun (`bun run build:win`)
- GitHub Actions workflow to build and add exe to releases on `main`

### 0.1.0 (250809)

- Baseline working
