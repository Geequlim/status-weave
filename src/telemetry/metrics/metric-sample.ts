export type MetricId =
	| 'cpu.usage'
	| 'memory.usage'
	| 'temperature.hwmon'
	| 'fan.hwmon'
	| 'gpu.device'
	| 'network.traffic'
	| 'demo.status';
export type MetricStatus =
	| 'normal'
	| 'warning'
	| 'critical'
	| 'sleeping'
	| 'waiting'
	| 'unavailable';

export interface CpuCoreUsage {
	readonly frequencyHertz: number | null;
	readonly id: string;
	readonly index: number;
	readonly usagePercent: number | null;
}

export interface CpuUsageValue {
	readonly overallUsagePercent: number | null;
	readonly cores: readonly CpuCoreUsage[];
}

export interface MemoryUsageValue {
	readonly availableBytes: number;
	readonly buffersBytes: number;
	readonly cachedBytes: number;
	readonly freeBytes: number;
	readonly reclaimableBytes: number;
	readonly sharedBytes: number;
	readonly swapFreeBytes: number;
	readonly swapTotalBytes: number;
	readonly swapUsedBytes: number;
	readonly totalBytes: number;
	readonly usedBytes: number;
	readonly usagePercent: number;
}

export interface DemoStatusValue {
	readonly bytes: number;
	readonly bytesPerSecond: number;
	readonly percentage: number;
	readonly rpm: number;
	readonly temperatureCelsius: number;
}

export interface HwmonTemperatureSensor {
	readonly criticalCelsius: number | null;
	readonly deviceName: string;
	readonly id: string;
	readonly label: string;
	readonly maximumCelsius: number | null;
	readonly valueCelsius: number;
}

export interface HwmonTemperatureValue {
	readonly averageCelsius: number;
	readonly peakCelsius: number;
	readonly primaryCelsius: number;
	readonly primaryLabel: string;
	readonly sensors: readonly HwmonTemperatureSensor[];
}

export interface HwmonFanSensor {
	readonly deviceName: string;
	readonly id: string;
	readonly label: string;
	readonly rpm: number;
}

export interface HwmonFanValue {
	readonly averageRpm: number;
	readonly peakRpm: number;
	readonly primaryLabel: string;
	readonly primaryRpm: number;
	readonly sensors: readonly HwmonFanSensor[];
}

export interface GpuDeviceValue {
	readonly deviceId: string;
	readonly driverVersion: string;
	readonly fanSpeedPercent: number | null;
	readonly graphicsClockHertz: number | null;
	readonly index: number;
	readonly memoryClockHertz: number | null;
	readonly memoryTotalBytes: number | null;
	readonly memoryUsedBytes: number | null;
	readonly name: string;
	readonly operationalState: 'active' | 'sleeping';
	readonly pciBusId: string;
	readonly performanceState: string | null;
	readonly powerLimitWatts: number | null;
	readonly powerWatts: number | null;
	readonly temperatureCelsius: number | null;
	readonly utilizationPercent: number | null;
	readonly vendor: 'nvidia';
}

export interface NetworkInterfaceTraffic {
	readonly connected: boolean;
	readonly downloadBytesPerSecond: number | null;
	readonly isPhysical: boolean;
	readonly linkSpeedBitsPerSecond: number | null;
	readonly mtu: number | null;
	readonly name: string;
	readonly receivedBytes: number;
	readonly sentBytes: number;
	readonly type: 'ethernet' | 'wifi' | 'virtual' | 'other';
	readonly uploadBytesPerSecond: number | null;
}

export interface NetworkTrafficValue {
	readonly defaultInterfaceName: string | null;
	readonly downloadBytesPerSecond: number | null;
	readonly interfaces: readonly NetworkInterfaceTraffic[];
	readonly receivedBytes: number;
	readonly selectedInterfaceNames: readonly string[];
	readonly sourceLabel: string;
	readonly sentBytes: number;
	readonly uploadBytesPerSecond: number | null;
}

export interface CpuHardwareMetadata {
	readonly modelName: string;
}

export interface MemoryHardwareMetadata {
	readonly configuredSpeedMegatransfersPerSecond: number | null;
	readonly manufacturer: string | null;
	readonly type: string | null;
}

export interface SystemHardwareMetadata {
	readonly cpu?: CpuHardwareMetadata;
	readonly memory?: MemoryHardwareMetadata;
}

export interface MetricValueMap {
	readonly 'cpu.usage': CpuUsageValue;
	readonly 'memory.usage': MemoryUsageValue;
	readonly 'temperature.hwmon': HwmonTemperatureValue;
	readonly 'fan.hwmon': HwmonFanValue;
	readonly 'gpu.device': GpuDeviceValue;
	readonly 'network.traffic': NetworkTrafficValue;
	readonly 'demo.status': DemoStatusValue;
}

export interface MetricRef<K extends MetricId = MetricId> {
	readonly metricId: K;
	readonly sourceId: string;
}

export interface MetricSample<K extends MetricId = MetricId> extends MetricRef<K> {
	readonly error?: string;
	readonly sampledAt: number;
	readonly status: MetricStatus;
	readonly value: MetricValueMap[K] | null;
}

export type AnyMetricSample = {
	[K in MetricId]: MetricSample<K>;
}[MetricId];

export interface TelemetrySnapshot {
	readonly hardware?: SystemHardwareMetadata;
	readonly sampledAt: number;
	readonly samples: readonly AnyMetricSample[];
}

export const metricKey = (ref: MetricRef): string => `${ref.metricId}\u0000${ref.sourceId}`;

export function findMetricSample<K extends MetricId>(
	snapshot: TelemetrySnapshot,
	ref: MetricRef<K>,
): MetricSample<K> | undefined {
	return snapshot.samples.find(
		(sample) => sample.metricId === ref.metricId && sample.sourceId === ref.sourceId,
	) as MetricSample<K> | undefined;
}
