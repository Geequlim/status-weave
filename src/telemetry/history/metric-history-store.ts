import {
	metricKey,
	type AnyMetricSample,
	type MetricId,
	type MetricRef,
	type MetricSample,
} from '../metrics/metric-sample';
import { HistoryBuffer, type HistoryRetention } from './history-buffer';

export const defaultHistoryRetention: HistoryRetention = {
	maxAgeMilliseconds: 15 * 60 * 1000,
	maxSamples: 600,
};

export class MetricHistoryStore {
	private readonly buffers = new Map<string, HistoryBuffer<AnyMetricSample>>();
	private readonly latestSampledAt = new Map<string, number>();

	constructor(private readonly retention: HistoryRetention = defaultHistoryRetention) {}

	record(sample: AnyMetricSample): void {
		const key = metricKey(sample);
		if (this.latestSampledAt.get(key) === sample.sampledAt) return;
		let buffer = this.buffers.get(key);
		if (!buffer) {
			buffer = new HistoryBuffer<AnyMetricSample>(this.retention);
			this.buffers.set(key, buffer);
		}
		buffer.append(sample);
		this.latestSampledAt.set(key, sample.sampledAt);
	}

	query<K extends MetricId>(
		ref: MetricRef<K>,
		from?: number,
		to?: number,
	): readonly MetricSample<K>[] {
		return (this.buffers.get(metricKey(ref))?.query(from, to) ??
			[]) as readonly MetricSample<K>[];
	}
}
