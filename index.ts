#!/usr/bin/env bun

import { glob } from 'fast-glob';
import gpmfExtract from 'gpmf-extract';
import goproTelemetry from 'gopro-telemetry';
import { Buffer } from 'buffer';
import os from 'os';
import path from 'path';
import { stat as fsStat, unlink as fsUnlink } from 'fs/promises';

async function runCommand(command: string, args: string[]) {
	const proc = Bun.spawn([command, ...args], { stdout: 'pipe', stderr: 'pipe' });
	const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
	const code = await proc.exited;
	return { code, stdout, stderr };
}

async function findGpmdStreamIndex(filePath: string): Promise<number | null> {
	// Use ffprobe JSON to find GPMD telemetry stream reliably (by codec tag/name or handler_name)
	const { code, stdout } = await runCommand('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'stream=index,codec_name,codec_tag,codec_tag_string:stream_tags=handler_name',
		'-of',
		'json',
		filePath,
	]);
	if (code !== 0) return null;
	try {
		const info = JSON.parse(stdout);
		const streams: any[] = info?.streams || [];
		const match = streams.find(s => {
			const codecName = String(s?.codec_name || '').toLowerCase();
			const codecTag = String(s?.codec_tag_string || s?.codec_tag || '').toLowerCase();
			const handler = String(s?.tags?.handler_name || '').toLowerCase();
			return (
				codecName === 'gpmd' || codecTag === 'gpmd' || handler.includes('gopro met') || handler.includes('met')
			);
		});
		return typeof match?.index === 'number' ? match.index : null;
	} catch {
		return null;
	}
}

function isLikelyEnomem(error: unknown): boolean {
	if (!error) return false;
	const anyErr = error as any;
	const msg = String(anyErr?.message || anyErr || '').toUpperCase();
	return anyErr?.code === 'ENOMEM' || msg.includes('ENOMEM') || msg.includes('OUT OF MEMORY');
}

async function extractGpmdOnlyMp4(inputPath: string): Promise<string | null> {
	const gpmdIndex = await findGpmdStreamIndex(inputPath);
	if (gpmdIndex == null) return null;
	const tmpOut = path.join(os.tmpdir(), `gpmd-${path.basename(inputPath)}.mp4`);
	const { code } = await runCommand('ffmpeg', [
		'-y',
		'-v',
		'error',
		'-i',
		inputPath,
		'-map',
		`0:${gpmdIndex}`,
		'-c',
		'copy',
		tmpOut,
	]);
	return code === 0 ? tmpOut : null;
}

async function main() {
	// Start timing the entire batch
	const timeStart = performance.now();

	const dir = process.argv[2] || process.cwd();
	const files = await glob(['*.mp4', '*.MP4'], { cwd: dir, absolute: true });

	if (!files.length) {
		console.error('❌ No MP4 files found in', dir);
		process.exit(1);
	}

	for (const filePath of files) {
		const baseName = filePath.replace(/\.[^/.]+$/, '');
		const jsonName = `${baseName}.json`;

		console.log(`🔄 Processing ${filePath}`);

		try {
			// Try extracting only the GPMF (GoPro MET) track with ffmpeg to avoid loading the whole file
			let extracted: any;
			let tmpForCleanup: string | null = null;
			const fileStats = await fsStat(filePath);
			const isVeryLarge = fileStats.size >= 4_000_000_000; // ~4 GB threshold for proactive skip
			const gpmdOnly = await extractGpmdOnlyMp4(filePath).catch(() => null);
			if (gpmdOnly) {
				tmpForCleanup = gpmdOnly;
				const arrayBuffer = await Bun.file(gpmdOnly).arrayBuffer();
				const nodeBuffer = Buffer.from(arrayBuffer);
				extracted = await gpmfExtract(nodeBuffer);
			} else {
				// No GPMD-only path found. For very large files (>~4 GB), skip proactively to avoid Buffer limits
				if (isVeryLarge) {
					console.warn(
						`  ⚠ File is large (${(fileStats.size / 1024 ** 3).toFixed(2)} GB) and telemetry pre-extraction failed.\n` +
							`    Install ffmpeg to enable memory-safe extraction (Windows: winget install "FFmpeg (Essentials Build)")`,
					);
					continue;
				}
				// Fallback: try reading the full file (works for smaller files). If it fails due to ENOMEM, suggest ffmpeg.
				try {
					const arrayBuffer = await Bun.file(filePath).arrayBuffer();
					const nodeBuffer = Buffer.from(arrayBuffer);
					extracted = await gpmfExtract(nodeBuffer);
				} catch (e) {
					if (isLikelyEnomem(e)) {
						console.warn(
							`  ⚠ Ran out of memory reading file (${(fileStats.size / 1024 ** 3).toFixed(2)} GB).\n` +
								`    Install ffmpeg to enable memory-safe extraction (Windows: winget install "FFmpeg (Essentials Build)")`,
						);
						continue;
					}
					throw e;
				}
			}

			// First list available streams to pick GPS keys dynamically
			const streamsInfo = await goproTelemetry(extracted, { streamList: true, promisify: true });
			const gpsKeys = Object.values(streamsInfo)
				.flatMap((dev: any) => Object.keys((dev as any)?.streams || {}))
				.filter((s: string) => s.toUpperCase().startsWith('GPS'));

			if (!gpsKeys.length) {
				console.warn(`  ⚠ No GPS streams found for ${filePath} — skipping JSON output`);
				continue;
			}

			// Extract full telemetry for detected GPS streams
			const telemetry = await goproTelemetry(extracted, { stream: gpsKeys as any, promisify: true });

			// Write JSON next to the MP4
			await Bun.write(jsonName, JSON.stringify(telemetry, null, 2));
			console.log(`  ✅ Wrote ${jsonName}`);

			// Cleanup any temporary files
			if (tmpForCleanup) {
				await fsUnlink(tmpForCleanup).catch(() => void 0);
			}
		} catch (err) {
			console.error(`  🛑 Error processing ${filePath}:`, err);
		}
	}

	// End timing and report duration
	const timeEnd = performance.now();
	const durationSecs = (timeEnd - timeStart) / 1000;
	console.log(`Processed ${files.length} files in ${Math.round(durationSecs * 100) / 100}s`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
