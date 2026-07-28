import type { MemoryHardwareMetadata } from '../metrics/metric-sample';

export function parseCpuModelName(content: string): string | null {
	const modelName = content.match(/^model name\s*:\s*(.+)$/m)?.[1];
	if (!modelName) return null;
	return modelName
		.replace(/\((?:R|TM)\)/gi, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function parseMemoryHardwareMetadata(content: string): MemoryHardwareMetadata | null {
	const devices = new Map<number, Map<string, string>>();
	for (const line of content.split('\n')) {
		const match = line.match(/^E: MEMORY_DEVICE_(\d+)_([A-Z0-9_]+)=(.*)$/);
		if (!match) continue;
		const index = Number(match[1]);
		let fields = devices.get(index);
		if (!fields) {
			fields = new Map<string, string>();
			devices.set(index, fields);
		}
		fields.set(match[2], match[3]);
	}

	const installed = [...devices.values()].filter((fields) => fields.get('PRESENT') !== '0');
	if (installed.length === 0) return null;
	const distinct = (field: string): string[] => [
		...new Set(
			installed
				.map((fields) => fields.get(field))
				.filter((value): value is string => Boolean(value) && value !== 'Unknown'),
		),
	];
	const manufacturers = distinct('MANUFACTURER');
	const types = distinct('TYPE');
	const speeds = distinct('CONFIGURED_SPEED_MTS').length
		? distinct('CONFIGURED_SPEED_MTS')
		: distinct('SPEED_MTS');

	return {
		configuredSpeedMegatransfersPerSecond:
			speeds.length === 1 && Number.isFinite(Number(speeds[0])) ? Number(speeds[0]) : null,
		manufacturer: manufacturers.length > 0 ? manufacturers.join(' / ') : null,
		type: types.length > 0 ? types.join(' / ') : null,
	};
}
