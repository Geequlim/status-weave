const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB'] as const;
const DECIMAL_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatPercentage(value: number, precision = 0): string {
	return `${value.toFixed(precision)}%`;
}

export function formatCompactPercentage(value: number): string {
	return formatPercentage(value, Math.abs(Math.round(value)) < 10 ? 1 : 0);
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

export function formatDecimalBytes(bytes: number): string {
	let value = Math.max(0, bytes);
	let unitIndex = 0;
	while (value >= 1000 && unitIndex < DECIMAL_UNITS.length - 1) {
		value /= 1000;
		unitIndex += 1;
	}
	return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${DECIMAL_UNITS[unitIndex]}`;
}

export function formatNetworkRate(bytesPerSecond: number, compact = false): string {
	const value = formatDecimalBytes(bytesPerSecond);
	return compact ? value : `${value}/s`;
}

export function formatCompactNetworkRate(bytesPerSecond: number): string {
	const units = ['B', 'K', 'M', 'G', 'T'] as const;
	let value = Math.max(0, bytesPerSecond) / 1000;
	let unitIndex = 1;
	while (value >= 1000 && unitIndex < units.length - 1) {
		value /= 1000;
		unitIndex += 1;
	}
	const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
	const rounded = Number(value.toFixed(precision));
	if (rounded >= 1000 && unitIndex < units.length - 1) {
		return `1.00 ${units[unitIndex + 1]}`;
	}
	return `${rounded.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatByteRate(bytesPerSecond: number): string {
	return `${formatBinaryBytes(bytesPerSecond)}/s`;
}

export function formatTemperature(celsius: number): string {
	return `${celsius.toFixed(1)} °C`;
}

export function formatCompactTemperature(celsius: number): string {
	return `${celsius.toFixed(Math.abs(Math.round(celsius)) < 10 ? 1 : 0)} °C`;
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
