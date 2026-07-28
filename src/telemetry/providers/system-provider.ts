import { executeCommand, readTextFile } from '../../platform/runtime';
import type {
	AnyMetricSample,
	MetricId,
	SystemHardwareMetadata,
	TelemetrySnapshot,
} from '../metrics/metric-sample';
import { parseCpuFrequencyHertz } from './cpu-frequency';
import { parseCpuModelName, parseMemoryHardwareMetadata } from './hardware-metadata';
import { calculateCpuUsageValue, parseCpuCounters, parseMemorySnapshot } from './proc-parser';
import type { CpuCounters } from './proc-counters';
import { usageStatus } from '../metrics/metric-status';

interface SettledValue<T> {
	readonly value?: T;
	readonly error?: unknown;
}

async function settle<T>(promise: Promise<T>): Promise<SettledValue<T>> {
	try {
		return { value: await promise };
	} catch (error) {
		return { error };
	}
}

function errorMessage(source: string, error: unknown): string {
	const detail = error instanceof Error ? error.message : String(error);
	return `${source}: ${detail}`;
}

async function readCpuFrequencies(counters: CpuCounters): Promise<Map<number, number>> {
	const readings = await Promise.all(
		counters.cores.map(async (core) => {
			const path = `/sys/devices/system/cpu/cpu${core.index}/cpufreq/scaling_cur_freq`;
			const result = await settle(readTextFile(path).then(parseCpuFrequencyHertz));
			return [core.index, result.value ?? null] as const;
		}),
	);
	return new Map(
		readings.filter((reading): reading is readonly [number, number] => reading[1] !== null),
	);
}

export interface SnapshotProvider {
	reset?(): void;
	sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot>;
}

export class SystemProvider implements SnapshotProvider {
	private cpuMetadataLoaded = false;
	private hardware: SystemHardwareMetadata = {};
	private memoryMetadataLoaded = false;
	private previousCpuCounters: CpuCounters | null = null;

	reset(): void {
		this.previousCpuCounters = null;
	}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const cpuRequested = metricIds.has('cpu.usage');
		const memoryRequested = metricIds.has('memory.usage');
		if (!cpuRequested) this.previousCpuCounters = null;
		const [cpuResult, memoryResult, cpuMetadataResult, memoryMetadataResult] =
			await Promise.all([
				cpuRequested
					? settle(readTextFile('/proc/stat').then(parseCpuCounters))
					: Promise.resolve(null),
				memoryRequested
					? settle(readTextFile('/proc/meminfo').then(parseMemorySnapshot))
					: Promise.resolve(null),
				cpuRequested && !this.cpuMetadataLoaded
					? settle(readTextFile('/proc/cpuinfo').then(parseCpuModelName))
					: Promise.resolve(null),
				memoryRequested && !this.memoryMetadataLoaded
					? settle(
							executeCommand('udevadm', [
								'info',
								'-p',
								'/sys/devices/virtual/dmi/id',
							]).then(parseMemoryHardwareMetadata),
						)
					: Promise.resolve(null),
			]);
		if (cpuMetadataResult) {
			this.cpuMetadataLoaded = true;
			if (cpuMetadataResult.value) {
				this.hardware = {
					...this.hardware,
					cpu: { modelName: cpuMetadataResult.value },
				};
			}
		}
		if (memoryMetadataResult) {
			this.memoryMetadataLoaded = true;
			if (memoryMetadataResult.value) {
				this.hardware = {
					...this.hardware,
					memory: memoryMetadataResult.value,
				};
			}
		}
		const sampledAt = Date.now();
		const samples: AnyMetricSample[] = [];
		if (cpuResult?.value) {
			const frequencies = await readCpuFrequencies(cpuResult.value);
			const value = this.previousCpuCounters
				? calculateCpuUsageValue(this.previousCpuCounters, cpuResult.value, frequencies)
				: null;
			samples.push({
				metricId: 'cpu.usage',
				sourceId: 'system',
				sampledAt,
				status: value ? usageStatus(value.overallUsagePercent ?? 0) : 'waiting',
				value,
			});
			this.previousCpuCounters = cpuResult.value;
		} else if (cpuResult) {
			samples.push({
				metricId: 'cpu.usage',
				sourceId: 'system',
				sampledAt,
				status: 'unavailable',
				value: null,
				error: errorMessage('CPU', cpuResult.error),
			});
		}

		if (memoryResult?.value) {
			samples.push({
				metricId: 'memory.usage',
				sourceId: 'system',
				sampledAt,
				status: usageStatus(memoryResult.value.usagePercent),
				value: memoryResult.value,
			});
		} else if (memoryResult) {
			samples.push({
				metricId: 'memory.usage',
				sourceId: 'system',
				sampledAt,
				status: 'unavailable',
				value: null,
				error: errorMessage('Memory', memoryResult.error),
			});
		}
		return {
			hardware: this.hardware,
			sampledAt,
			samples,
		};
	}
}
