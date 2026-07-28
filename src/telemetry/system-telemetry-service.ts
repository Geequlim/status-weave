import { cancelTimeout, scheduleTimeout } from '../platform/runtime';
import { MetricHistoryStore } from './history/metric-history-store';
import type { MetricId, MetricRef, MetricSample, TelemetrySnapshot } from './metrics/metric-sample';
import type { SnapshotProvider } from './providers/system-provider';
import { StatusProvider } from './providers/status-provider';

export type SystemSnapshotListener = (snapshot: TelemetrySnapshot) => void;

export interface TelemetrySubscription {
	setMetrics(metricIds: Iterable<MetricId>): void;
	unsubscribe(): void;
}

export interface TelemetryScheduler {
	cancel(id: number): void;
	schedule(milliseconds: number, callback: () => void): number;
}

const cinnamonScheduler: TelemetryScheduler = {
	cancel: cancelTimeout,
	schedule: scheduleTimeout,
};

export class SystemTelemetryService {
	private readonly subscriptions = new Map<
		number,
		{
			readonly listener: SystemSnapshotListener;
			metricIds: Set<MetricId>;
		}
	>();
	private activeMetricIds = new Set<MetricId>();
	private generation = 0;
	private latestSnapshot: TelemetrySnapshot | null = null;
	private nextSubscriptionId = 1;
	private timeoutId: number | null = null;

	constructor(
		private readonly provider: SnapshotProvider,
		private readonly scheduler: TelemetryScheduler,
		private readonly intervalMilliseconds = 2000,
		private readonly history = new MetricHistoryStore(),
	) {}

	getHistory<K extends MetricId>(
		ref: MetricRef<K>,
		from?: number,
		to?: number,
	): readonly MetricSample<K>[] {
		return this.history.query(ref, from, to);
	}

	subscribe(
		metricIds: Iterable<MetricId>,
		listener: SystemSnapshotListener,
	): TelemetrySubscription {
		const id = this.nextSubscriptionId++;
		this.subscriptions.set(id, { listener, metricIds: new Set(metricIds) });
		if (this.latestSnapshot) listener(this.latestSnapshot);
		this.refreshActiveMetrics();

		let subscribed = true;
		return {
			setMetrics: (nextMetricIds: Iterable<MetricId>) => {
				if (!subscribed) return;
				const subscription = this.subscriptions.get(id);
				if (!subscription) return;
				subscription.metricIds = new Set(nextMetricIds);
				this.refreshActiveMetrics();
			},
			unsubscribe: () => {
				if (!subscribed) return;
				subscribed = false;
				this.subscriptions.delete(id);
				this.refreshActiveMetrics();
			},
		};
	}

	private refreshActiveMetrics(): void {
		const nextMetricIds = new Set<MetricId>();
		for (const subscription of this.subscriptions.values()) {
			for (const metricId of subscription.metricIds) nextMetricIds.add(metricId);
		}
		const wasActive = this.activeMetricIds.size > 0;
		this.activeMetricIds = nextMetricIds;
		const isActive = this.activeMetricIds.size > 0;
		if (!wasActive && isActive) this.start();
		else if (wasActive && !isActive) this.stop();
	}

	private start(): void {
		const generation = ++this.generation;
		void this.sampleAndSchedule(generation);
	}

	private stop(): void {
		this.generation += 1;
		if (this.timeoutId !== null) {
			this.scheduler.cancel(this.timeoutId);
			this.timeoutId = null;
		}
		this.provider.reset?.();
	}

	private async sampleAndSchedule(generation: number): Promise<void> {
		const requestedMetricIds = new Set(this.activeMetricIds);
		const sampledSnapshot = await this.provider.sample(requestedMetricIds);
		if (generation !== this.generation || this.activeMetricIds.size === 0) return;

		const snapshot: TelemetrySnapshot = {
			hardware: sampledSnapshot.hardware,
			sampledAt: sampledSnapshot.sampledAt,
			samples: sampledSnapshot.samples.filter((sample) =>
				this.activeMetricIds.has(sample.metricId),
			),
		};
		this.latestSnapshot = snapshot;
		for (const sample of snapshot.samples) this.history.record(sample);
		for (const { listener } of this.subscriptions.values()) {
			try {
				listener(snapshot);
			} catch (error) {
				const detail =
					error instanceof Error ? (error.stack ?? error.message) : String(error);
				global.logError(`[status-weave@geequlim] Snapshot listener failed: ${detail}`);
			}
		}

		this.timeoutId = this.scheduler.schedule(this.intervalMilliseconds, () => {
			this.timeoutId = null;
			void this.sampleAndSchedule(generation);
		});
	}
}

export const systemTelemetryService = new SystemTelemetryService(
	new StatusProvider(),
	cinnamonScheduler,
);
