import type { CpuUsageValue, MemoryUsageValue } from '../metrics/metric-sample';
import type { CpuCounters, CpuTimes } from './proc-counters';

const CPU_COUNTER_COUNT = 8;
const KIBIBYTE = 1024;

function parseCpuLine(content: string, id: string): CpuTimes {
	const cpuLine = content.match(new RegExp(`^${id}\\s+(.+)$`, 'm'))?.[1];
	if (!cpuLine) throw new Error(`Missing ${id === 'cpu' ? 'aggregate ' : ''}CPU counters`);
	const counters = cpuLine.trim().split(/\s+/).slice(0, CPU_COUNTER_COUNT).map(Number);
	if (counters.length < 4 || counters.some((value) => !Number.isFinite(value) || value < 0)) {
		throw new Error(`Invalid ${id === 'cpu' ? 'aggregate ' : ''}CPU counters`);
	}
	const idle = counters[3] + (counters[4] ?? 0);
	const total = counters.reduce((sum, value) => sum + value, 0);
	return { idle, total };
}

export function parseCpuTimes(content: string): CpuTimes {
	return parseCpuLine(content, 'cpu');
}

export function parseCpuCounters(content: string): CpuCounters {
	const cores = [...content.matchAll(/^cpu(\d+)\s+/gm)].map((match) => ({
		id: `cpu${match[1]}`,
		index: Number(match[1]),
		times: parseCpuLine(content, `cpu${match[1]}`),
	}));
	return { aggregate: parseCpuTimes(content), cores };
}

export function calculateCpuUsage(previous: CpuTimes, current: CpuTimes): number | null {
	const totalDelta = current.total - previous.total;
	const idleDelta = current.idle - previous.idle;
	if (totalDelta <= 0 || idleDelta < 0) return null;

	const usage = ((totalDelta - idleDelta) / totalDelta) * 100;
	return Math.min(100, Math.max(0, usage));
}

export function calculateCpuUsageValue(
	previous: CpuCounters,
	current: CpuCounters,
	frequencies: ReadonlyMap<number, number> = new Map(),
): CpuUsageValue {
	const previousCores = new Map(previous.cores.map((core) => [core.id, core.times]));
	return {
		overallUsagePercent: calculateCpuUsage(previous.aggregate, current.aggregate),
		cores: current.cores.map((core) => ({
			frequencyHertz: frequencies.get(core.index) ?? null,
			id: core.id,
			index: core.index,
			usagePercent: previousCores.has(core.id)
				? calculateCpuUsage(previousCores.get(core.id)!, core.times)
				: null,
		})),
	};
}

export function parseMemorySnapshot(content: string): MemoryUsageValue {
	const values = new Map<string, number>();
	for (const line of content.split('\n')) {
		const match = line.match(/^([A-Za-z_()]+):\s+(\d+)\s+kB$/);
		if (match) values.set(match[1], Number(match[2]) * KIBIBYTE);
	}

	const totalBytes = values.get('MemTotal');
	const availableBytes = values.get('MemAvailable');
	const freeBytes = values.get('MemFree');
	if (
		!totalBytes ||
		availableBytes === undefined ||
		freeBytes === undefined ||
		availableBytes > totalBytes
	) {
		throw new Error('Missing or invalid memory counters');
	}

	const usedBytes = totalBytes - availableBytes;
	const swapTotalBytes = values.get('SwapTotal') ?? 0;
	const swapFreeBytes = Math.min(values.get('SwapFree') ?? 0, swapTotalBytes);
	return {
		availableBytes,
		buffersBytes: values.get('Buffers') ?? 0,
		cachedBytes: values.get('Cached') ?? 0,
		freeBytes,
		reclaimableBytes: values.get('SReclaimable') ?? 0,
		sharedBytes: values.get('Shmem') ?? 0,
		swapFreeBytes,
		swapTotalBytes,
		swapUsedBytes: swapTotalBytes - swapFreeBytes,
		totalBytes,
		usedBytes,
		usagePercent: (usedBytes / totalBytes) * 100,
	};
}
