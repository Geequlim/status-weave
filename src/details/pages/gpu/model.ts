import {
	formatFrequencyHertz,
	formatGigabytes,
	formatPercentage,
	formatTemperature,
	formatWatts,
} from '../../../presentation/value-format';
import type { MetricSample } from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';

const optional = (value: number | null, format: (value: number) => string): string =>
	value === null ? '—' : format(value);

export function shortGpuName(name: string): string {
	return (
		name
			.replace(/^NVIDIA\s+(?:GeForce\s+)?/i, '')
			.replace(/\s+Laptop GPU$/i, '')
			.trim() || name
	);
}

export function createGpuPageModel(sample: MetricSample<'gpu.device'> | undefined) {
	const value = sample?.value;
	const memory =
		value?.memoryUsedBytes !== null &&
		value?.memoryUsedBytes !== undefined &&
		value.memoryTotalBytes !== null
			? `${formatGigabytes(value.memoryUsedBytes).replace(' GB', '')} / ${formatGigabytes(
					value.memoryTotalBytes,
				)}`
			: '—';
	const memoryPercent =
		value?.memoryUsedBytes !== null &&
		value?.memoryUsedBytes !== undefined &&
		value.memoryTotalBytes !== null &&
		value.memoryTotalBytes > 0
			? formatPercentage((value.memoryUsedBytes / value.memoryTotalBytes) * 100, 1)
			: '—';
	const power =
		value?.powerWatts === null || value?.powerWatts === undefined
			? '—'
			: value.powerLimitWatts === null
				? formatWatts(value.powerWatts)
				: `${formatWatts(value.powerWatts)} / ${formatWatts(value.powerLimitWatts)}`;
	return {
		badge:
			sample?.status === 'sleeping'
				? '休眠'
				: value
					? value.performanceState
						? `运行中 · ${value.performanceState}`
						: '运行中'
					: metricStatusLabels[sample?.status ?? 'unavailable'],
		rows: [
			{
				id: 'state',
				label: '状态',
				value:
					sample?.status === 'normal'
						? '运行中'
						: metricStatusLabels[sample?.status ?? 'unavailable'],
			},
			{
				id: 'utilization',
				label: '利用率',
				value: value
					? optional(value.utilizationPercent, (entry) => formatPercentage(entry))
					: '—',
			},
			{
				id: 'temperature',
				label: '温度',
				value: value ? optional(value.temperatureCelsius, formatTemperature) : '—',
			},
			{ id: 'memory', label: '显存', value: memory },
			{ id: 'memoryPercent', label: '显存占用', value: memoryPercent },
			{ id: 'power', label: '功耗', value: power },
			{
				id: 'graphicsClock',
				label: '核心频率',
				value: value ? optional(value.graphicsClockHertz, formatFrequencyHertz) : '—',
			},
			{
				id: 'memoryClock',
				label: '显存频率',
				value: value ? optional(value.memoryClockHertz, formatFrequencyHertz) : '—',
			},
			{
				id: 'driver',
				label: '驱动版本',
				value: value?.driverVersion || '—',
			},
			{
				id: 'pci',
				label: 'PCI 地址',
				value: value?.pciBusId || '—',
			},
		],
		status: sample?.status ?? 'unavailable',
		title: value ? shortGpuName(value.name) : 'NVIDIA GPU',
	};
}
