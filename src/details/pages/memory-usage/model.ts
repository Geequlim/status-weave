import type { MemoryUsageValue, MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';
import { formatGigabytes, formatPercentage } from '../../../presentation/value-format';

export interface MemoryUsagePageModel {
	readonly rows: readonly {
		readonly id: keyof MemoryUsageValue;
		readonly label: string;
		readonly value: string;
	}[];
	readonly sampledAt: number | null;
	readonly status: string;
}

const memoryRows = [
	['usagePercent', '占用率', (value: number) => formatPercentage(value, 1)],
	['usedBytes', '已用', formatGigabytes],
	['availableBytes', '可用', formatGigabytes],
	['totalBytes', '总量', formatGigabytes],
	['freeBytes', '空闲', formatGigabytes],
	['cachedBytes', '页面缓存', formatGigabytes],
	['buffersBytes', '缓冲区', formatGigabytes],
	['reclaimableBytes', '可回收 Slab', formatGigabytes],
	['sharedBytes', '共享内存', formatGigabytes],
	['swapUsedBytes', 'Swap 已用', formatGigabytes],
	['swapTotalBytes', 'Swap 总量', formatGigabytes],
] as const;

export function createMemoryUsagePageModel(
	sample: MetricSample<'memory.usage'> | undefined,
): MemoryUsagePageModel {
	return {
		rows: memoryRows.map(([id, label, format]) => ({
			id,
			label,
			value: sample?.value ? format(sample.value[id]) : '—',
		})),
		sampledAt: sample?.sampledAt ?? null,
		status: metricStatusLabels[sample?.status ?? 'unavailable'],
	};
}
