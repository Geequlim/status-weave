import type { MetricId } from '../telemetry/metrics/metric-sample';

export type { MetricId } from '../telemetry/metrics/metric-sample';
export type IconStyle = 'regular' | 'bold' | 'fill';
export type MetricFormatId =
	| 'percent'
	| 'percent-precise'
	| 'used'
	| 'used-total'
	| 'available'
	| 'temperature'
	| 'bytes'
	| 'rate'
	| 'rpm'
	| 'temperature-primary'
	| 'temperature-peak'
	| 'temperature-average'
	| 'fan-primary'
	| 'fan-peak'
	| 'fan-average'
	| 'gpu-utilization'
	| 'gpu-temperature'
	| 'gpu-memory-used'
	| 'gpu-memory-used-total'
	| 'gpu-memory-percent'
	| 'gpu-power'
	| 'gpu-clock'
	| 'gpu-fan-speed'
	| 'network-both'
	| 'network-download'
	| 'network-upload'
	| 'network-total';
export type MetricPresetId = 'compact' | 'standard' | 'detailed';
export type MoveDirection = 'left' | 'right';

export interface MetricSlot {
	readonly id: string;
	readonly kind: 'metric';
	readonly metric: MetricId;
	readonly sourceId: string;
	readonly format: MetricFormatId;
	readonly showIcon: boolean;
	readonly showLabel: boolean;
	readonly visible: boolean;
}

export interface SeparatorSlot {
	readonly id: string;
	readonly kind: 'separator';
	readonly visible: boolean;
}

export type LayoutSlot = MetricSlot | SeparatorSlot;

export interface FormatOption {
	readonly id: MetricFormatId;
	readonly label: string;
}

export interface MetricPresetOption {
	readonly id: MetricPresetId;
	readonly label: string;
}

export const metricLabels: Record<MetricId, string> = {
	'cpu.usage': 'CPU 使用率',
	'memory.usage': '内存',
	'temperature.hwmon': '温度',
	'fan.hwmon': '风扇',
	'gpu.device': 'NVIDIA 显卡',
	'network.traffic': '网速',
	'demo.status': '状态演示',
};

export const metricFormatOptions: Record<MetricId, readonly FormatOption[]> = {
	'cpu.usage': [
		{ id: 'percent', label: '整数百分比 · 18%' },
		{ id: 'percent-precise', label: '精确百分比 · 18.4%' },
	],
	'memory.usage': [
		{ id: 'percent', label: '占用百分比 · 24%' },
		{ id: 'used', label: '已用量 · 7.4 GB' },
		{ id: 'used-total', label: '已用 / 总量 · 7.4 / 31.1 GB' },
		{ id: 'available', label: '可用量 · 可用 23.7 GB' },
	],
	'temperature.hwmon': [
		{ id: 'temperature-primary', label: '主要温度 · 56 °C' },
		{ id: 'temperature-peak', label: '最高温度 · 56 °C' },
		{ id: 'temperature-average', label: '平均温度 · 47 °C' },
	],
	'fan.hwmon': [
		{ id: 'fan-primary', label: '主要风扇 · 1800 RPM' },
		{ id: 'fan-peak', label: '最高转速 · 2500 RPM' },
		{ id: 'fan-average', label: '平均转速 · 2182 RPM' },
	],
	'gpu.device': [
		{ id: 'gpu-utilization', label: '利用率 · 18%' },
		{ id: 'gpu-temperature', label: '温度 · 56 °C' },
		{ id: 'gpu-memory-used', label: '显存已用量 · 1.3 GB' },
		{ id: 'gpu-memory-used-total', label: '显存已用 / 总量 · 1.3 / 12.0 GB' },
		{ id: 'gpu-memory-percent', label: '显存占用 · 11%' },
		{ id: 'gpu-power', label: '功耗 · 22.8 W' },
		{ id: 'gpu-clock', label: '核心频率 · 1.03 GHz' },
		{ id: 'gpu-fan-speed', label: '风扇转速 · 35%' },
	],
	'network.traffic': [
		{ id: 'network-both', label: '下载和上传 · ↓ 12.3 M  ↑ 1.20 M' },
		{ id: 'network-download', label: '仅下载 · ↓ 12.3 M' },
		{ id: 'network-upload', label: '仅上传 · ↑ 1.20 M' },
		{ id: 'network-total', label: '合计 · 13.5 M' },
	],
	'demo.status': [
		{ id: 'percent', label: '整数百分比 · 42%' },
		{ id: 'percent-precise', label: '精确百分比 · 42.0%' },
		{ id: 'temperature', label: '温度 · 68 °C' },
		{ id: 'bytes', label: '字节量 · 7.4 GiB' },
		{ id: 'rate', label: '速率 · 125.6 MiB/s' },
		{ id: 'rpm', label: '转速 · 1420 RPM' },
	],
};

export const metricPresetOptions: readonly MetricPresetOption[] = [
	{ id: 'compact', label: '紧凑' },
	{ id: 'standard', label: '标准' },
	{ id: 'detailed', label: '详细' },
];

const defaultFormats: Record<MetricId, MetricFormatId> = {
	'cpu.usage': 'percent',
	'memory.usage': 'used-total',
	'temperature.hwmon': 'temperature-primary',
	'fan.hwmon': 'fan-primary',
	'gpu.device': 'gpu-utilization',
	'network.traffic': 'network-both',
	'demo.status': 'percent',
};

const defaultShowIcons: Record<MetricId, boolean> = {
	'cpu.usage': true,
	'memory.usage': true,
	'temperature.hwmon': true,
	'fan.hwmon': true,
	'gpu.device': true,
	'network.traffic': true,
	'demo.status': false,
};

const defaultSourceIds: Record<MetricId, string> = {
	'cpu.usage': 'system',
	'memory.usage': 'system',
	'temperature.hwmon': 'system',
	'fan.hwmon': 'system',
	'gpu.device': 'nvidia:0',
	'network.traffic': 'network:auto',
	'demo.status': 'synthetic',
};

export const metricIconNames: Record<
	MetricId,
	'cpu' | 'memory' | 'temperature' | 'fan' | 'gpu' | 'network' | null
> = {
	'cpu.usage': 'cpu',
	'memory.usage': 'memory',
	'temperature.hwmon': 'temperature',
	'fan.hwmon': 'fan',
	'gpu.device': 'gpu',
	'network.traffic': 'network',
	'demo.status': null,
};

export const defaultLayout: readonly LayoutSlot[] = [
	{
		id: 'cpu.usage',
		kind: 'metric',
		metric: 'cpu.usage',
		sourceId: 'system',
		format: defaultFormats['cpu.usage'],
		showIcon: true,
		showLabel: true,
		visible: true,
	},
	{ id: 'separator.system', kind: 'separator', visible: true },
	{
		id: 'memory.usage',
		kind: 'metric',
		metric: 'memory.usage',
		sourceId: 'system',
		format: defaultFormats['memory.usage'],
		showIcon: true,
		showLabel: true,
		visible: true,
	},
];

const isMetricId = (value: unknown): value is MetricId =>
	value === 'cpu.usage' ||
	value === 'memory.usage' ||
	value === 'temperature.hwmon' ||
	value === 'fan.hwmon' ||
	value === 'gpu.device' ||
	value === 'network.traffic' ||
	value === 'demo.status';

const isMetricFormat = (metric: MetricId, value: unknown): value is MetricFormatId =>
	metricFormatOptions[metric].some((option) => option.id === value);

function normalizeMetricFormat(metric: MetricId, value: unknown): MetricFormatId {
	if (value === 'label-percent') return 'percent';
	if (metric === 'cpu.usage' && value === 'label-percent-precise') {
		return 'percent-precise';
	}
	return isMetricFormat(metric, value) ? value : defaultFormats[metric];
}

const normalizeShowLabel = (candidate: Record<string, unknown>): boolean =>
	typeof candidate.showLabel === 'boolean' ? candidate.showLabel : candidate.format !== 'percent';

export const normalizeIconStyle = (value: unknown): IconStyle =>
	value === 'bold' || value === 'fill' ? value : 'regular';

const normalizeShowIcon = (metric: MetricId, candidate: Record<string, unknown>): boolean => {
	if (typeof candidate.showIcon === 'boolean') return candidate.showIcon;
	if (candidate.iconStyle === 'none') return false;
	return defaultShowIcons[metric];
};

const cloneSlot = (slot: LayoutSlot): LayoutSlot => ({ ...slot });

function migrateLegacySlot(candidate: Record<string, unknown>): LayoutSlot | null {
	const visible = candidate.visible !== false;
	if (candidate.id === 'separator.system') {
		return { id: 'separator.system', kind: 'separator', visible };
	}
	if (isMetricId(candidate.id)) {
		return {
			id: candidate.id,
			kind: 'metric',
			metric: candidate.id,
			sourceId: defaultSourceIds[candidate.id],
			format: defaultFormats[candidate.id],
			showIcon: defaultShowIcons[candidate.id],
			showLabel: true,
			visible,
		};
	}
	return null;
}

export function normalizeLayout(value: unknown): LayoutSlot[] {
	if (!Array.isArray(value)) return defaultLayout.map(cloneSlot);
	const slots: LayoutSlot[] = [];
	const seen = new Set<string>();
	for (const candidate of value) {
		if (typeof candidate !== 'object' || candidate === null) continue;
		const record = candidate as Record<string, unknown>;
		let slot: LayoutSlot | null = null;
		if (record.kind === 'separator' && typeof record.id === 'string') {
			slot = { id: record.id, kind: 'separator', visible: record.visible !== false };
		} else if (
			record.kind === 'metric' &&
			typeof record.id === 'string' &&
			isMetricId(record.metric)
		) {
			slot = {
				id: record.id,
				kind: 'metric',
				metric: record.metric,
				sourceId:
					typeof record.sourceId === 'string'
						? record.sourceId
						: defaultSourceIds[record.metric],
				format: normalizeMetricFormat(record.metric, record.format),
				showIcon: normalizeShowIcon(record.metric, record),
				showLabel: normalizeShowLabel(record),
				visible: record.visible !== false,
			};
		} else {
			slot = migrateLegacySlot(record);
		}
		if (!slot || seen.has(slot.id)) continue;
		seen.add(slot.id);
		slots.push(slot);
	}
	return slots;
}

function nextSlotId(layout: readonly LayoutSlot[], base: string): string {
	const ids = new Set(layout.map((slot) => slot.id));
	if (!ids.has(base)) return base;
	let suffix = 2;
	while (ids.has(`${base}#${suffix}`)) suffix += 1;
	return `${base}#${suffix}`;
}

export function addMetricSlot(layout: readonly LayoutSlot[], metric: MetricId): LayoutSlot[] {
	return [
		...layout.map(cloneSlot),
		{
			id: nextSlotId(layout, metric),
			kind: 'metric',
			metric,
			sourceId: defaultSourceIds[metric],
			format: defaultFormats[metric],
			showIcon: defaultShowIcons[metric],
			showLabel: true,
			visible: true,
		},
	];
}

export function addSeparatorSlot(layout: readonly LayoutSlot[]): LayoutSlot[] {
	return [
		...layout.map(cloneSlot),
		{
			id: nextSlotId(layout, 'separator'),
			kind: 'separator',
			visible: true,
		},
	];
}

export function duplicateSlot(layout: readonly LayoutSlot[], id: string): LayoutSlot[] {
	const index = layout.findIndex((slot) => slot.id === id);
	if (index < 0) return layout.map(cloneSlot);
	const result = layout.map(cloneSlot);
	const source = result[index]!;
	result.splice(index + 1, 0, { ...source, id: nextSlotId(layout, source.id) });
	return result;
}

export function removeSlot(layout: readonly LayoutSlot[], id: string): LayoutSlot[] {
	return layout.filter((slot) => slot.id !== id).map(cloneSlot);
}

export function setSlotVisible(
	layout: readonly LayoutSlot[],
	id: string,
	visible: boolean,
): LayoutSlot[] {
	return layout.map((slot) => (slot.id === id ? { ...slot, visible } : cloneSlot(slot)));
}

export function setSlotFormat(
	layout: readonly LayoutSlot[],
	id: string,
	format: MetricFormatId,
): LayoutSlot[] {
	return layout.map((slot) =>
		slot.id === id && slot.kind === 'metric' && isMetricFormat(slot.metric, format)
			? { ...slot, format }
			: cloneSlot(slot),
	);
}

export function setSlotShowIcon(
	layout: readonly LayoutSlot[],
	id: string,
	showIcon: boolean,
): LayoutSlot[] {
	return layout.map((slot) =>
		slot.id === id && slot.kind === 'metric' ? { ...slot, showIcon } : cloneSlot(slot),
	);
}

export function setSlotShowLabel(
	layout: readonly LayoutSlot[],
	id: string,
	showLabel: boolean,
): LayoutSlot[] {
	return layout.map((slot) =>
		slot.id === id && slot.kind === 'metric' ? { ...slot, showLabel } : cloneSlot(slot),
	);
}

export function setSlotSourceId(
	layout: readonly LayoutSlot[],
	id: string,
	sourceId: string,
): LayoutSlot[] {
	return layout.map((slot) =>
		slot.id === id && slot.kind === 'metric' && sourceId
			? { ...slot, sourceId }
			: cloneSlot(slot),
	);
}

export function applySlotPreset(
	layout: readonly LayoutSlot[],
	id: string,
	preset: MetricPresetId,
): LayoutSlot[] {
	return layout.map((slot) => {
		if (slot.id !== id || slot.kind !== 'metric') return cloneSlot(slot);
		const formats: Record<MetricId, Record<MetricPresetId, MetricFormatId>> = {
			'cpu.usage': {
				compact: 'percent',
				standard: 'percent',
				detailed: 'percent-precise',
			},
			'memory.usage': {
				compact: 'percent',
				standard: 'used',
				detailed: 'used-total',
			},
			'temperature.hwmon': {
				compact: 'temperature-primary',
				standard: 'temperature-primary',
				detailed: 'temperature-peak',
			},
			'fan.hwmon': {
				compact: 'fan-primary',
				standard: 'fan-primary',
				detailed: 'fan-peak',
			},
			'gpu.device': {
				compact: 'gpu-utilization',
				standard: 'gpu-utilization',
				detailed: 'gpu-temperature',
			},
			'network.traffic': {
				compact: 'network-download',
				standard: 'network-both',
				detailed: 'network-both',
			},
			'demo.status': {
				compact: 'percent',
				standard: 'percent',
				detailed: 'percent-precise',
			},
		};
		return {
			...slot,
			format: formats[slot.metric][preset],
			showLabel: preset !== 'compact',
		};
	});
}

export function canMoveSlot(
	layout: readonly LayoutSlot[],
	id: string,
	direction: MoveDirection,
): boolean {
	const index = layout.findIndex((slot) => slot.id === id);
	if (index < 0) return false;
	const step = direction === 'left' ? -1 : 1;
	for (let cursor = index + step; cursor >= 0 && cursor < layout.length; cursor += step) {
		if (layout[cursor]?.visible) return true;
	}
	return false;
}

export function moveSlot(
	layout: readonly LayoutSlot[],
	id: string,
	direction: MoveDirection,
): LayoutSlot[] {
	const result = layout.map(cloneSlot);
	const index = result.findIndex((slot) => slot.id === id);
	if (index < 0) return result;
	const step = direction === 'left' ? -1 : 1;
	for (let cursor = index + step; cursor >= 0 && cursor < result.length; cursor += step) {
		if (!result[cursor]?.visible) continue;
		[result[index], result[cursor]] = [result[cursor]!, result[index]!];
		break;
	}
	return result;
}
