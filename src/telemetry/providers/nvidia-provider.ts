import { executeCommand, readTextFile } from '../../platform/runtime';
import type {
	AnyMetricSample,
	GpuDeviceValue,
	MetricId,
	MetricStatus,
	TelemetrySnapshot,
} from '../metrics/metric-sample';
import type { SnapshotProvider } from './system-provider';

const NVIDIA_QUERY_FIELDS = [
	'index',
	'uuid',
	'pci.bus_id',
	'name',
	'driver_version',
	'utilization.gpu',
	'memory.used',
	'memory.total',
	'temperature.gpu',
	'power.draw',
	'power.limit',
	'clocks.current.graphics',
	'clocks.current.memory',
	'pstate',
] as const;

const mebibytesToBytes = (value: number | null): number | null =>
	value === null ? null : value * 1024 ** 2;
const megahertzToHertz = (value: number | null): number | null =>
	value === null ? null : value * 1_000_000;

function parseOptionalNumber(value: string): number | null {
	const parsed = Number(value.trim());
	return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvRow(line: string): string[] {
	const fields: string[] = [];
	let field = '';
	let quoted = false;
	for (let index = 0; index < line.length; index += 1) {
		const character = line[index]!;
		if (character === '"') {
			if (quoted && line[index + 1] === '"') {
				field += '"';
				index += 1;
			} else {
				quoted = !quoted;
			}
		} else if (character === ',' && !quoted) {
			fields.push(field.trim());
			field = '';
		} else {
			field += character;
		}
	}
	fields.push(field.trim());
	return fields;
}

function normalizePciBusId(value: string): string {
	return value.replace(/^00000000:/, '0000:').toLowerCase();
}

export function parseNvidiaCsv(output: string): GpuDeviceValue[] {
	const devices: GpuDeviceValue[] = [];
	for (const line of output.split('\n')) {
		if (!line.trim()) continue;
		const fields = parseCsvRow(line);
		if (fields.length !== NVIDIA_QUERY_FIELDS.length) {
			throw new Error(`Unexpected NVIDIA field count: ${fields.length}`);
		}
		const index = parseOptionalNumber(fields[0]!);
		if (index === null || !fields[1] || !fields[3]) {
			throw new Error('NVIDIA identity fields are missing');
		}
		devices.push({
			deviceId: fields[1]!,
			driverVersion: fields[4]!,
			graphicsClockHertz: megahertzToHertz(parseOptionalNumber(fields[11]!)),
			index,
			memoryClockHertz: megahertzToHertz(parseOptionalNumber(fields[12]!)),
			memoryTotalBytes: mebibytesToBytes(parseOptionalNumber(fields[7]!)),
			memoryUsedBytes: mebibytesToBytes(parseOptionalNumber(fields[6]!)),
			name: fields[3]!,
			operationalState: 'active',
			pciBusId: normalizePciBusId(fields[2]!),
			performanceState: fields[13] === '[N/A]' ? null : fields[13]!,
			powerLimitWatts: parseOptionalNumber(fields[10]!),
			powerWatts: parseOptionalNumber(fields[9]!),
			temperatureCelsius: parseOptionalNumber(fields[8]!),
			utilizationPercent: parseOptionalNumber(fields[5]!),
			vendor: 'nvidia',
		});
	}
	return devices;
}

export function gpuStatus(value: GpuDeviceValue): MetricStatus {
	if (value.operationalState === 'sleeping') return 'sleeping';
	if (value.temperatureCelsius !== null && value.temperatureCelsius >= 90) return 'critical';
	if (value.temperatureCelsius !== null && value.temperatureCelsius >= 80) return 'warning';
	return 'normal';
}

const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

export class NvidiaProvider implements SnapshotProvider {
	private lastDevices: readonly GpuDeviceValue[] = [];

	reset(): void {}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const sampledAt = Date.now();
		if (!metricIds.has('gpu.device')) return { sampledAt, samples: [] };

		const alreadySleeping = await this.sleepingSamples(sampledAt);
		if (alreadySleeping.length > 0 && alreadySleeping.length === this.lastDevices.length) {
			return { sampledAt, samples: alreadySleeping };
		}
		try {
			const output = await executeCommand('nvidia-smi', [
				`--query-gpu=${NVIDIA_QUERY_FIELDS.join(',')}`,
				'--format=csv,noheader,nounits',
			]);
			const devices = parseNvidiaCsv(output);
			this.lastDevices = devices;
			return {
				sampledAt,
				samples: devices.map(
					(value): AnyMetricSample => ({
						metricId: 'gpu.device',
						sampledAt,
						sourceId: `nvidia:${value.index}`,
						status: gpuStatus(value),
						value,
					}),
				),
			};
		} catch (error) {
			const sleeping = await this.sleepingSamples(sampledAt);
			if (sleeping.length > 0) return { sampledAt, samples: sleeping };
			return {
				sampledAt,
				samples: [
					{
						error: `NVIDIA: ${errorMessage(error)}`,
						metricId: 'gpu.device',
						sampledAt,
						sourceId: 'nvidia:0',
						status: 'unavailable',
						value: null,
					},
				],
			};
		}
	}

	private async sleepingSamples(sampledAt: number): Promise<AnyMetricSample[]> {
		const sleeping: AnyMetricSample[] = [];
		for (const device of this.lastDevices) {
			try {
				const runtimeStatus = (
					await readTextFile(
						`/sys/bus/pci/devices/${device.pciBusId}/power/runtime_status`,
					)
				).trim();
				if (runtimeStatus !== 'suspended') continue;
				const value: GpuDeviceValue = {
					...device,
					graphicsClockHertz: null,
					memoryClockHertz: null,
					memoryUsedBytes: null,
					operationalState: 'sleeping',
					performanceState: null,
					powerWatts: null,
					temperatureCelsius: null,
					utilizationPercent: null,
				};
				sleeping.push({
					metricId: 'gpu.device',
					sampledAt,
					sourceId: `nvidia:${device.index}`,
					status: 'sleeping',
					value,
				});
			} catch {
				// A missing runtime power file is not evidence that the GPU is sleeping.
			}
		}
		return sleeping;
	}
}
