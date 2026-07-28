import type { CpuCoreUsage, MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';
import { formatFrequencyHertz } from '../../../presentation/value-format';

export interface CpuUsagePageModel {
	readonly cores: readonly {
		readonly frequency: string;
		readonly id: string;
		readonly label: string;
		readonly usage: string;
	}[];
	readonly overall: string;
	readonly sampledAt: number | null;
	readonly status: string;
}

const percentage = (value: number | null): string =>
	value === null ? '—' : `${value.toFixed(1)}%`;

const CPU_PAGE_FIXED_HEIGHT = 210;
const CPU_CORE_ROW_HEIGHT = 28;
const MAXIMUM_CORE_COLUMNS = 4;

export function calculateCpuCoreColumnCount(coreCount: number, maxContentHeight: number): number {
	if (coreCount <= 0) return 1;
	const rowsPerColumn = Math.max(
		1,
		Math.floor((maxContentHeight - CPU_PAGE_FIXED_HEIGHT) / CPU_CORE_ROW_HEIGHT),
	);
	return Math.min(MAXIMUM_CORE_COLUMNS, Math.max(1, Math.ceil(coreCount / rowsPerColumn)));
}

const formatCore = (core: CpuCoreUsage) => ({
	frequency: core.frequencyHertz === null ? '—' : formatFrequencyHertz(core.frequencyHertz),
	id: core.id,
	label: `核心 ${core.index}`,
	usage: percentage(core.usagePercent),
});

export function createCpuUsagePageModel(
	sample: MetricSample<'cpu.usage'> | undefined,
): CpuUsagePageModel {
	return {
		cores: sample?.value?.cores.map(formatCore) ?? [],
		overall: percentage(sample?.value?.overallUsagePercent ?? null),
		sampledAt: sample?.sampledAt ?? null,
		status: metricStatusLabels[sample?.status ?? 'unavailable'],
	};
}
