import type { MetricSample, MetricStatus } from '../metrics/metric-sample';

const states: readonly {
	readonly error?: string;
	readonly percentage: number | null;
	readonly status: MetricStatus;
}[] = [
	{ percentage: 42, status: 'normal' },
	{ percentage: 78, status: 'warning' },
	{ percentage: 96, status: 'critical' },
	{
		error: '模拟数据源暂时不可用',
		percentage: null,
		status: 'unavailable',
	},
	{ percentage: null, status: 'waiting' },
];

export class DemoStatusProvider {
	private index = 0;

	reset(): void {
		this.index = 0;
	}

	sample(sampledAt: number): MetricSample<'demo.status'> {
		const state = states[this.index % states.length]!;
		this.index += 1;
		return {
			...(state.error ? { error: state.error } : {}),
			metricId: 'demo.status',
			sampledAt,
			sourceId: 'synthetic',
			status: state.status,
			value:
				state.percentage === null
					? null
					: {
							bytes: 7.4 * 1024 ** 3,
							bytesPerSecond: 125.6 * 1024 ** 2,
							percentage: state.percentage,
							rpm: 1420,
							temperatureCelsius: 68.4,
						},
		};
	}
}
