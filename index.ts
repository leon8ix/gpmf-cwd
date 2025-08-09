#!/usr/bin/env bun

import { glob } from 'fast-glob';
import gpmfExtract from 'gpmf-extract';
import goproTelemetry from 'gopro-telemetry';
import { Buffer } from 'buffer';

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
			// Read file as ArrayBuffer and convert to Node Buffer
			const arrayBuffer = await Bun.file(filePath).arrayBuffer();
			const nodeBuffer = Buffer.from(arrayBuffer);

			// Extract raw GPMF data
			const extracted = await gpmfExtract(nodeBuffer);

			// First list available streams to pick GPS keys dynamically
			const streamsInfo = await goproTelemetry(extracted, { streamList: true, promisify: true });
			const gpsKeys = Object.values(streamsInfo)
				.flatMap((dev: any) => Object.keys((dev as any)?.streams || {}))
				.filter((s: string) => s.toUpperCase().startsWith('GPS'));

			if (!gpsKeys.length) {
				console.warn(`  ⚠ No GPS streams found for ${filePath}`);
				await Bun.write(jsonName, JSON.stringify(streamsInfo, null, 2));
				continue;
			}

			// Extract full telemetry for detected GPS streams
			const telemetry = await goproTelemetry(extracted, { stream: gpsKeys as any, promisify: true });

			// Write JSON next to the MP4
			await Bun.write(jsonName, JSON.stringify(telemetry, null, 2));
			console.log(`  ✅ Wrote ${jsonName}`);
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
