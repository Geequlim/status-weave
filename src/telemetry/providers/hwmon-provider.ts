import { executeCommand, readTextFile } from '../../platform/runtime';
import type {
	AnyMetricSample,
	HwmonFanSensor,
	HwmonFanValue,
	HwmonTemperatureSensor,
	HwmonTemperatureValue,
	MetricId,
	MetricStatus,
	TelemetrySnapshot,
} from '../metrics/metric-sample';
import type { SnapshotProvider } from './system-provider';

const HWMON_ROOT = '/sys/class/hwmon';
const REDISCOVERY_INTERVAL = 30;

interface SensorDefinition {
	readonly critical: number | null;
	readonly deviceName: string;
	readonly id: string;
	readonly inputPath: string;
	readonly kind: 'temperature' | 'fan';
	readonly label: string;
	readonly maximum: number | null;
}

const parseNumber = (value: string | undefined): number | null => {
	if (value === undefined) return null;
	const parsed = Number(value.trim());
	return Number.isFinite(parsed) ? parsed : null;
};

export function parseHwmonLinks(manifest: string): Map<string, string> {
	const links = new Map<string, string>();
	for (const line of manifest.split('\n')) {
		const [name, target] = line.split('\t');
		if (name && target) links.set(name, target);
	}
	return links;
}

export function parseHwmonFiles(manifest: string): Map<string, Set<string>> {
	const files = new Map<string, Set<string>>();
	for (const line of manifest.split('\n')) {
		const [directory, name] = line.split('\t');
		const hwmon = directory?.split('/').pop();
		if (!hwmon || !name) continue;
		const names = files.get(hwmon) ?? new Set<string>();
		names.add(name);
		files.set(hwmon, names);
	}
	return files;
}

export function stableHwmonDevicePath(target: string): string {
	return target
		.replace(/^\.\.\/\.\.\/devices\//, '')
		.replace(/\/hwmon\/hwmon\d+$/, '')
		.replace(/\/hwmon\d+$/, '');
}

export function temperatureStatus(sensors: readonly HwmonTemperatureSensor[]): MetricStatus {
	let warning = false;
	for (const sensor of sensors) {
		const critical = sensor.criticalCelsius ?? 95;
		if (sensor.valueCelsius >= critical) return 'critical';
		const warningThreshold = Math.min(sensor.maximumCelsius ?? 85, critical - 10);
		if (sensor.valueCelsius >= warningThreshold) warning = true;
	}
	return warning ? 'warning' : 'normal';
}

const average = (values: readonly number[]): number =>
	values.reduce((sum, value) => sum + value, 0) / values.length;

const temperatureValue = (sensors: readonly HwmonTemperatureSensor[]): HwmonTemperatureValue => {
	const primary =
		sensors.find(
			(sensor) =>
				sensor.deviceName === 'coretemp' &&
				sensor.label.toLowerCase().startsWith('package'),
		) ?? sensors[0]!;
	const values = sensors.map((sensor) => sensor.valueCelsius);
	return {
		averageCelsius: average(values),
		peakCelsius: Math.max(...values),
		primaryCelsius: primary.valueCelsius,
		primaryLabel: primary.label,
		sensors,
	};
};

const fanValue = (sensors: readonly HwmonFanSensor[]): HwmonFanValue => {
	const primary =
		sensors.find((sensor) => sensor.label.toLowerCase().replace(/-/g, '_') === 'cpu_fan') ??
		sensors[0]!;
	const values = sensors.map((sensor) => sensor.rpm);
	return {
		averageRpm: average(values),
		peakRpm: Math.max(...values),
		primaryLabel: primary.label,
		primaryRpm: primary.rpm,
		sensors,
	};
};

const errorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

export class HwmonProvider implements SnapshotProvider {
	private definitions: readonly SensorDefinition[] | null = null;
	private samplesUntilRediscovery = 0;

	reset(): void {}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const temperatureRequested = metricIds.has('temperature.hwmon');
		const fanRequested = metricIds.has('fan.hwmon');
		const sampledAt = Date.now();
		if (!temperatureRequested && !fanRequested) return { sampledAt, samples: [] };

		try {
			if (!this.definitions || this.samplesUntilRediscovery <= 0) {
				this.definitions = await this.discover();
				this.samplesUntilRediscovery = REDISCOVERY_INTERVAL;
			}
			this.samplesUntilRediscovery -= 1;
			const requestedDefinitions = this.definitions.filter(
				(definition) =>
					(definition.kind === 'temperature' && temperatureRequested) ||
					(definition.kind === 'fan' && fanRequested),
			);
			const readings = await Promise.all(
				requestedDefinitions.map(async (definition) => {
					try {
						const raw = parseNumber(await readTextFile(definition.inputPath));
						return raw === null ? null : { definition, raw };
					} catch {
						return null;
					}
				}),
			);
			const available = readings.filter(
				(reading): reading is NonNullable<typeof reading> => reading !== null,
			);
			if (requestedDefinitions.length > 0 && available.length === 0) {
				this.definitions = null;
			}
			const samples: AnyMetricSample[] = [];
			if (temperatureRequested) {
				const sensors: HwmonTemperatureSensor[] = available
					.filter((reading) => reading.definition.kind === 'temperature')
					.map(({ definition, raw }) => ({
						criticalCelsius: definition.critical,
						deviceName: definition.deviceName,
						id: definition.id,
						label: definition.label,
						maximumCelsius: definition.maximum,
						valueCelsius: raw / 1000,
					}));
				samples.push(
					sensors.length > 0
						? {
								metricId: 'temperature.hwmon',
								sampledAt,
								sourceId: 'system',
								status: temperatureStatus(sensors),
								value: temperatureValue(sensors),
							}
						: {
								error: '未发现可读取的温度传感器',
								metricId: 'temperature.hwmon',
								sampledAt,
								sourceId: 'system',
								status: 'unavailable',
								value: null,
							},
				);
			}
			if (fanRequested) {
				const sensors: HwmonFanSensor[] = available
					.filter((reading) => reading.definition.kind === 'fan')
					.map(({ definition, raw }) => ({
						deviceName: definition.deviceName,
						id: definition.id,
						label: definition.label,
						rpm: raw,
					}));
				samples.push(
					sensors.length > 0
						? {
								metricId: 'fan.hwmon',
								sampledAt,
								sourceId: 'system',
								status: 'normal',
								value: fanValue(sensors),
							}
						: {
								error: '未发现可读取的风扇转速传感器',
								metricId: 'fan.hwmon',
								sampledAt,
								sourceId: 'system',
								status: 'unavailable',
								value: null,
							},
				);
			}
			return { sampledAt, samples };
		} catch (error) {
			const detail = errorMessage(error);
			const samples: AnyMetricSample[] = [];
			if (temperatureRequested) {
				samples.push({
					error: `hwmon: ${detail}`,
					metricId: 'temperature.hwmon',
					sampledAt,
					sourceId: 'system',
					status: 'unavailable',
					value: null,
				});
			}
			if (fanRequested) {
				samples.push({
					error: `hwmon: ${detail}`,
					metricId: 'fan.hwmon',
					sampledAt,
					sourceId: 'system',
					status: 'unavailable',
					value: null,
				});
			}
			return { sampledAt, samples };
		}
	}

	private async discover(): Promise<readonly SensorDefinition[]> {
		const linkManifest = await executeCommand('find', [
			HWMON_ROOT,
			'-mindepth',
			'1',
			'-maxdepth',
			'1',
			'-type',
			'l',
			'-printf',
			'%f\t%l\n',
		]);
		const links = parseHwmonLinks(linkManifest);
		if (links.size === 0) return [];
		const fileManifest = await executeCommand('find', [
			'-H',
			...Array.from(links.keys(), (hwmon) => `${HWMON_ROOT}/${hwmon}`),
			'-mindepth',
			'1',
			'-maxdepth',
			'1',
			'-type',
			'f',
			'-printf',
			'%h\t%f\n',
		]);
		const files = parseHwmonFiles(fileManifest);
		const definitions: SensorDefinition[] = [];
		for (const [hwmon, names] of files) {
			const classPath = `${HWMON_ROOT}/${hwmon}`;
			const deviceName = (await readTextFile(`${classPath}/name`)).trim();
			const stablePath = stableHwmonDevicePath(links.get(hwmon) ?? hwmon);
			for (const fileName of names) {
				const match = /^(temp|fan)(\d+)_input$/.exec(fileName);
				if (!match) continue;
				const prefix = `${match[1]}${match[2]}`;
				const readOptional = async (suffix: string): Promise<string | undefined> => {
					if (!names.has(`${prefix}_${suffix}`)) return undefined;
					try {
						return await readTextFile(`${classPath}/${prefix}_${suffix}`);
					} catch {
						return undefined;
					}
				};
				const [label, maximum, critical] = await Promise.all([
					readOptional('label'),
					readOptional('max'),
					readOptional('crit'),
				]);
				const kind = match[1] === 'temp' ? 'temperature' : 'fan';
				definitions.push({
					critical:
						kind === 'temperature' ? (parseNumber(critical) ?? 0) / 1000 || null : null,
					deviceName,
					id: `${deviceName}:${stablePath}:${prefix}`,
					inputPath: `${classPath}/${fileName}`,
					kind,
					label: label?.trim() || `${deviceName} ${prefix}`,
					maximum:
						kind === 'temperature'
							? (parseNumber(maximum) ?? 0) / 1000 || null
							: parseNumber(maximum),
				});
			}
		}
		return definitions;
	}
}
