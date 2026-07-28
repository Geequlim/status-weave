import type { MetricId, TelemetrySnapshot } from '../metrics/metric-sample';
import { DemoStatusProvider } from './demo-status-provider';
import { SystemProvider, type SnapshotProvider } from './system-provider';

export class StatusProvider implements SnapshotProvider {
	private readonly demo = new DemoStatusProvider();
	private readonly system = new SystemProvider();

	reset(): void {
		this.demo.reset();
		this.system.reset();
	}

	async sample(metricIds: ReadonlySet<MetricId>): Promise<TelemetrySnapshot> {
		const snapshot = await this.system.sample(metricIds);
		if (!metricIds.has('demo.status')) return snapshot;
		return {
			...snapshot,
			samples: [...snapshot.samples, this.demo.sample(snapshot.sampledAt)],
		};
	}
}
