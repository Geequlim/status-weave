import type { MetricId, TelemetrySnapshot } from '../metrics/metric-sample';
import { DemoStatusProvider } from './demo-status-provider';
import { HwmonProvider } from './hwmon-provider';
import { NvidiaProvider } from './nvidia-provider';
import { NetworkProvider } from './network-provider';
import { SystemProvider, type SnapshotProvider } from './system-provider';

const SLOW_PROVIDER_INTERVAL_MILLISECONDS = 2000;

export class StatusProvider implements SnapshotProvider {
	private readonly demo = new DemoStatusProvider();
	private readonly hwmon = new HwmonProvider();
	private hwmonCache: TelemetrySnapshot | null = null;
	private hwmonRequestKey = '';
	private readonly nvidia = new NvidiaProvider();
	private nvidiaCache: TelemetrySnapshot | null = null;
	private readonly network = new NetworkProvider();
	private readonly system = new SystemProvider();

	reset(): void {
		this.demo.reset();
		this.hwmon.reset();
		this.nvidia.reset();
		this.network.reset();
		this.system.reset();
		this.hwmonCache = null;
		this.hwmonRequestKey = '';
		this.nvidiaCache = null;
	}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const now = Date.now();
		const [snapshot, hwmon, nvidia, network] = await Promise.all([
			this.system.sample(metricIds),
			this.sampleHwmon(metricIds, now),
			this.sampleNvidia(metricIds, now),
			this.network.sample(metricIds),
		]);
		const samples = [
			...snapshot.samples,
			...hwmon.samples,
			...nvidia.samples,
			...network.samples,
		];
		if (!metricIds.has('demo.status')) return { ...snapshot, samples };
		return {
			...snapshot,
			samples: [...samples, this.demo.sample(snapshot.sampledAt)],
		};
	}

	private async sampleHwmon(
		metricIds: ReadonlySet<MetricId>,
		now: number,
	): Promise<TelemetrySnapshot> {
		const requested = ['fan.hwmon', 'temperature.hwmon'].filter((metricId) =>
			metricIds.has(metricId as MetricId),
		);
		const requestKey = requested.join(',');
		if (!requestKey) {
			this.hwmonCache = null;
			this.hwmonRequestKey = '';
			return { sampledAt: now, samples: [] };
		}
		if (
			this.hwmonCache &&
			this.hwmonRequestKey === requestKey &&
			now - this.hwmonCache.sampledAt < SLOW_PROVIDER_INTERVAL_MILLISECONDS
		) {
			return this.hwmonCache;
		}
		this.hwmonRequestKey = requestKey;
		this.hwmonCache = await this.hwmon.sample(metricIds);
		return this.hwmonCache;
	}

	private async sampleNvidia(
		metricIds: ReadonlySet<MetricId>,
		now: number,
	): Promise<TelemetrySnapshot> {
		if (!metricIds.has('gpu.device')) {
			this.nvidiaCache = null;
			return { sampledAt: now, samples: [] };
		}
		if (
			this.nvidiaCache &&
			now - this.nvidiaCache.sampledAt < SLOW_PROVIDER_INTERVAL_MILLISECONDS
		) {
			return this.nvidiaCache;
		}
		this.nvidiaCache = await this.nvidia.sample(metricIds);
		return this.nvidiaCache;
	}
}
