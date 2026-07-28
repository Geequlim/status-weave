import {
	findMetricSample,
	type MetricStatus,
	type TelemetrySnapshot,
} from '../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../telemetry/metrics/metric-status';
import {
	defaultLayout,
	metricLabels,
	type LayoutSlot,
	type MetricFormatId,
	type MetricSlot,
} from './layout';
import {
	formatBinaryBytes,
	formatByteRate,
	formatGibibytes,
	formatPercentage,
	formatRpm,
	formatTemperature,
} from './value-format';

export interface SystemSlotPresentation {
	readonly label: string | null;
	readonly status: MetricStatus;
	readonly value: string;
	readonly widthClass: string;
}

function formatOptionalPercentage(value: number | null | undefined, precise: boolean): string {
	if (value == null) return '—';
	return formatPercentage(value, precise ? 1 : 0);
}

function formatCpu(snapshot: TelemetrySnapshot, slot: MetricSlot): string {
	const value = findMetricSample(snapshot, {
		metricId: 'cpu.usage',
		sourceId: slot.sourceId,
	})?.value?.overallUsagePercent;
	return formatOptionalPercentage(value, slot.format === 'percent-precise');
}

function formatMemory(snapshot: TelemetrySnapshot, slot: MetricSlot): string {
	const memory = findMetricSample(snapshot, {
		metricId: 'memory.usage',
		sourceId: slot.sourceId,
	})?.value;
	if (!memory) return '—';
	const used = formatGibibytes(memory.usedBytes);
	const total = formatGibibytes(memory.totalBytes);
	const available = formatGibibytes(memory.availableBytes);
	switch (slot.format) {
		case 'percent':
			return formatPercentage(memory.usagePercent);
		case 'used':
			return used;
		case 'available':
			return `可用 ${available}`;
		default:
			return `${used.slice(0, used.lastIndexOf(' '))} / ${total}`;
	}
}

function formatDemo(snapshot: TelemetrySnapshot, slot: MetricSlot): string {
	const value = findMetricSample(snapshot, {
		metricId: 'demo.status',
		sourceId: slot.sourceId,
	})?.value;
	if (!value) return '—';
	switch (slot.format) {
		case 'temperature':
			return formatTemperature(value.temperatureCelsius);
		case 'bytes':
			return formatBinaryBytes(value.bytes);
		case 'rate':
			return formatByteRate(value.bytesPerSecond);
		case 'rpm':
			return formatRpm(value.rpm);
		default:
			return formatOptionalPercentage(value.percentage, slot.format === 'percent-precise');
	}
}

function formatHwmonTemperature(snapshot: TelemetrySnapshot, slot: MetricSlot): string {
	const value = findMetricSample(snapshot, {
		metricId: 'temperature.hwmon',
		sourceId: slot.sourceId,
	})?.value;
	if (!value) return '—';
	if (slot.format === 'temperature-peak') {
		return `最高 ${formatTemperature(value.peakCelsius)}`;
	}
	if (slot.format === 'temperature-average') {
		return `平均 ${formatTemperature(value.averageCelsius)}`;
	}
	return formatTemperature(value.primaryCelsius);
}

function formatHwmonFan(snapshot: TelemetrySnapshot, slot: MetricSlot): string {
	const value = findMetricSample(snapshot, {
		metricId: 'fan.hwmon',
		sourceId: slot.sourceId,
	})?.value;
	if (!value) return '—';
	if (slot.format === 'fan-peak') return `最高 ${formatRpm(value.peakRpm)}`;
	if (slot.format === 'fan-average') return `平均 ${formatRpm(value.averageRpm)}`;
	return formatRpm(value.primaryRpm);
}

function widthClass(metric: MetricSlot['metric'], format: MetricFormatId): string {
	if (metric === 'memory.usage') return `memory-${format}`;
	if (metric === 'temperature.hwmon') return format;
	if (metric === 'fan.hwmon') return format;
	if (metric === 'demo.status' && !format.startsWith('percent')) return `demo-${format}`;
	if (format === 'percent-precise') return 'percent-precise';
	return 'percent';
}

export function formatSystemSlotPresentation(
	snapshot: TelemetrySnapshot,
	slot: MetricSlot,
): SystemSlotPresentation {
	const sample = findMetricSample(snapshot, {
		metricId: slot.metric,
		sourceId: slot.sourceId,
	});
	const value =
		slot.metric === 'cpu.usage'
			? formatCpu(snapshot, slot)
			: slot.metric === 'memory.usage'
				? formatMemory(snapshot, slot)
				: slot.metric === 'temperature.hwmon'
					? formatHwmonTemperature(snapshot, slot)
					: slot.metric === 'fan.hwmon'
						? formatHwmonFan(snapshot, slot)
						: formatDemo(snapshot, slot);
	return {
		label: slot.showLabel
			? slot.metric === 'memory.usage'
				? 'RAM'
				: slot.metric === 'temperature.hwmon'
					? 'TEMP'
					: slot.metric === 'fan.hwmon'
						? 'FAN'
						: slot.metric === 'demo.status'
							? '演示'
							: 'CPU'
			: null,
		status: sample?.status ?? 'unavailable',
		value,
		widthClass: widthClass(slot.metric, slot.format),
	};
}

export function formatSystemSlot(snapshot: TelemetrySnapshot, slot: LayoutSlot): string {
	if (slot.kind === 'separator') return '·';
	const presentation = formatSystemSlotPresentation(snapshot, slot);
	return presentation.label ? `${presentation.label} ${presentation.value}` : presentation.value;
}

export function formatSystemLabel(
	snapshot: TelemetrySnapshot,
	layout: readonly LayoutSlot[] = defaultLayout,
): string {
	const parts = layout
		.filter((slot) => slot.visible)
		.map((slot) => formatSystemSlot(snapshot, slot));
	while (parts[0] === '·') parts.shift();
	while (parts[parts.length - 1] === '·') parts.pop();
	return parts.join('  ') || 'Status Weave';
}

function sourceLabel(slot: MetricSlot): string {
	if (slot.sourceId === 'synthetic') return '虚拟数据源';
	if (slot.sourceId !== 'system') return slot.sourceId;
	if (slot.metric === 'cpu.usage') return '系统 CPU';
	if (slot.metric === 'memory.usage') return '系统内存';
	return 'hwmon';
}

function unitLabel(slot: MetricSlot): string {
	if (slot.metric === 'temperature.hwmon') return '°C';
	if (slot.metric === 'fan.hwmon') return 'RPM';
	if (slot.metric === 'demo.status') {
		switch (slot.format) {
			case 'temperature':
				return '°C';
			case 'bytes':
				return '二进制字节';
			case 'rate':
				return '二进制字节/秒';
			case 'rpm':
				return 'RPM';
			default:
				return '%';
		}
	}
	if (slot.metric !== 'memory.usage' || slot.format === 'percent') return '%';
	return 'GiB';
}

export function formatSystemTooltip(
	snapshot: TelemetrySnapshot,
	instanceId: number,
	layout: readonly LayoutSlot[] = defaultLayout,
): string {
	const lines = [`Status Weave #${instanceId}`];
	for (const slot of layout) {
		if (slot.kind !== 'metric' || !slot.visible) continue;
		const sample = findMetricSample(snapshot, {
			metricId: slot.metric,
			sourceId: slot.sourceId,
		});
		const presentation = formatSystemSlotPresentation(snapshot, slot);
		lines.push(
			`${metricLabels[slot.metric]}（${sourceLabel(slot)}，${unitLabel(slot)}）`,
			`${presentation.value} · ${metricStatusLabels[presentation.status]}`,
		);
		if (sample?.error) lines.push(`原因：${sample.error}`);
	}
	return lines.join('\n');
}
