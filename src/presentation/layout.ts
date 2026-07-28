import type { MetricId } from '../telemetry/metrics/metric-sample';

export type { MetricId } from '../telemetry/metrics/metric-sample';
export type IconStyle = 'none' | 'regular' | 'bold' | 'fill';
export type MetricFormatId =
	| 'percent'
	| 'percent-precise'
	| 'used'
	| 'used-total'
	| 'available'
	| 'temperature'
	| 'bytes'
	| 'rate'
	| 'rpm';
export type MetricPresetId = 'compact' | 'standard' | 'detailed';
export type MoveDirection = 'left' | 'right';

export interface MetricSlot {
	readonly id: string;
	readonly kind: 'metric';
	readonly metric: MetricId;
	readonly sourceId: string;
	readonly format: MetricFormatId;
	readonly iconStyle: IconStyle;
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

export interface IconStyleOption {
	readonly id: IconStyle;
	readonly label: string;
}

export interface MetricPresetOption {
	readonly id: MetricPresetId;
	readonly label: string;
}

export const iconStyleOptions: readonly IconStyleOption[] = [
	{ id: 'none', label: '无图标' },
	{ id: 'regular', label: '线性' },
	{ id: 'bold', label: '粗线' },
	{ id: 'fill', label: '填充' },
];

export const metricLabels: Record<MetricId, string> = {
	'cpu.usage': 'CPU 使用率',
	'memory.usage': '内存',
	'demo.status': '状态演示',
};

export const metricFormatOptions: Record<MetricId, readonly FormatOption[]> = {
	'cpu.usage': [
		{ id: 'percent', label: '整数百分比 · 18%' },
		{ id: 'percent-precise', label: '精确百分比 · 18.4%' },
	],
	'memory.usage': [
		{ id: 'percent', label: '占用百分比 · 24%' },
		{ id: 'used', label: '已用量 · 7.4 GiB' },
		{ id: 'used-total', label: '已用 / 总量 · 7.4 / 31.1 GiB' },
		{ id: 'available', label: '可用量 · 可用 23.7 GiB' },
	],
	'demo.status': [
		{ id: 'percent', label: '整数百分比 · 42%' },
		{ id: 'percent-precise', label: '精确百分比 · 42.0%' },
		{ id: 'temperature', label: '温度 · 68.4 °C' },
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
	'demo.status': 'percent',
};

const defaultIconStyles: Record<MetricId, IconStyle> = {
	'cpu.usage': 'regular',
	'memory.usage': 'regular',
	'demo.status': 'none',
};

const defaultSourceIds: Record<MetricId, string> = {
	'cpu.usage': 'system',
	'memory.usage': 'system',
	'demo.status': 'synthetic',
};

export const metricIconNames: Record<MetricId, 'cpu' | 'memory' | null> = {
	'cpu.usage': 'cpu',
	'memory.usage': 'memory',
	'demo.status': null,
};

export const defaultLayout: readonly LayoutSlot[] = [
	{
		id: 'cpu.usage',
		kind: 'metric',
		metric: 'cpu.usage',
		sourceId: 'system',
		format: defaultFormats['cpu.usage'],
		iconStyle: 'regular',
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
		iconStyle: 'regular',
		showLabel: true,
		visible: true,
	},
];

const isMetricId = (value: unknown): value is MetricId =>
	value === 'cpu.usage' || value === 'memory.usage' || value === 'demo.status';

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

const isIconStyle = (value: unknown): value is IconStyle =>
	iconStyleOptions.some((option) => option.id === value);

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
			iconStyle: defaultIconStyles[candidate.id],
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
				iconStyle: isIconStyle(record.iconStyle)
					? record.iconStyle
					: defaultIconStyles[record.metric],
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
			iconStyle: defaultIconStyles[metric],
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

export function setSlotIconStyle(
	layout: readonly LayoutSlot[],
	id: string,
	iconStyle: IconStyle,
): LayoutSlot[] {
	if (!isIconStyle(iconStyle)) return layout.map(cloneSlot);
	return layout.map((slot) =>
		slot.id === id && slot.kind === 'metric' ? { ...slot, iconStyle } : cloneSlot(slot),
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

export function applySlotPreset(
	layout: readonly LayoutSlot[],
	id: string,
	preset: MetricPresetId,
): LayoutSlot[] {
	return layout.map((slot) => {
		if (slot.id !== id || slot.kind !== 'metric') return cloneSlot(slot);
		const format =
			preset === 'detailed'
				? slot.metric === 'memory.usage'
					? 'used-total'
					: 'percent-precise'
				: preset === 'compact'
					? 'percent'
					: slot.metric === 'memory.usage'
						? 'used'
						: 'percent';
		return {
			...slot,
			format,
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
