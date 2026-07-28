import type { MemoryUsageValue, MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';
import { formatGibibytes, formatPercentage } from '../../../presentation/value-format';

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
	['usedBytes', '已用', formatGibibytes],
	['availableBytes', '可用', formatGibibytes],
	['totalBytes', '总量', formatGibibytes],
	['freeBytes', '空闲', formatGibibytes],
	['cachedBytes', '页面缓存', formatGibibytes],
	['buffersBytes', '缓冲区', formatGibibytes],
	['reclaimableBytes', '可回收 Slab', formatGibibytes],
	['sharedBytes', '共享内存', formatGibibytes],
	['swapUsedBytes', 'Swap 已用', formatGibibytes],
	['swapTotalBytes', 'Swap 总量', formatGibibytes],
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
