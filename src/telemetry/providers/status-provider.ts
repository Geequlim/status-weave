import type { MetricId, TelemetrySnapshot } from '../metrics/metric-sample';
import { DemoStatusProvider } from './demo-status-provider';
import { HwmonProvider } from './hwmon-provider';
import { SystemProvider, type SnapshotProvider } from './system-provider';

export class StatusProvider implements SnapshotProvider {
	private readonly demo = new DemoStatusProvider();
	private readonly hwmon = new HwmonProvider();
	private readonly system = new SystemProvider();

	reset(): void {
		this.demo.reset();
		this.hwmon.reset();
		this.system.reset();
	}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const [snapshot, hwmon] = await Promise.all([
			this.system.sample(metricIds),
			this.hwmon.sample(metricIds),
		]);
		const samples = [...snapshot.samples, ...hwmon.samples];
		if (!metricIds.has('demo.status')) return { ...snapshot, samples };
		return {
			...snapshot,
			samples: [...samples, this.demo.sample(snapshot.sampledAt)],
		};
	}
}
