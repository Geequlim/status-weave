const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'] as const;

export function formatPercentage(value: number, precision = 0): string {
	return `${value.toFixed(precision)}%`;
}

export function formatBinaryBytes(bytes: number): string {
	let value = Math.max(0, bytes);
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < BINARY_UNITS.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	const precision = unitIndex === 0 ? 0 : 1;
	return `${value.toFixed(precision)} ${BINARY_UNITS[unitIndex]}`;
}

export function formatGigabytes(bytes: number): string {
	return `${(Math.max(0, bytes) / 1_000_000_000).toFixed(1)} GB`;
}

export function formatByteRate(bytesPerSecond: number): string {
	return `${formatBinaryBytes(bytesPerSecond)}/s`;
}

export function formatTemperature(celsius: number): string {
	return `${celsius.toFixed(1)} °C`;
}

export function formatRpm(rpm: number): string {
	return `${Math.round(rpm)} RPM`;
}

export function formatFrequencyHertz(hertz: number): string {
	return `${(hertz / 1_000_000_000).toFixed(2)} GHz`;
}

export function formatWatts(watts: number): string {
	return `${watts.toFixed(1)} W`;
}
