import { describe, expect, it } from 'vitest';
import {
	addMetricSlot,
	addSeparatorSlot,
	applySlotPreset,
	canMoveSlot,
	defaultLayout,
	duplicateSlot,
	moveSlot,
	normalizeLayout,
	removeSlot,
	setSlotFormat,
	setSlotIconStyle,
	setSlotShowLabel,
	setSlotVisible,
} from '../../src/presentation/layout';

describe('instance layout', () => {
	it('migrates the previous fixed slots while preserving order and visibility', () => {
		expect(
			normalizeLayout([
				{ id: 'memory.usage', visible: true },
				{ id: 'cpu.usage', visible: false },
				{ id: 'unknown', visible: true },
			]),
		).toEqual([
			{
				id: 'memory.usage',
				kind: 'metric',
				metric: 'memory.usage',
				sourceId: 'system',
				format: 'used-total',
				iconStyle: 'regular',
				showLabel: true,
				visible: true,
			},
			{
				id: 'cpu.usage',
				kind: 'metric',
				metric: 'cpu.usage',
				sourceId: 'system',
				format: 'percent',
				iconStyle: 'regular',
				showLabel: true,
				visible: false,
			},
		]);
	});

	it('separates titles from legacy formats without changing their appearance', () => {
		expect(
			normalizeLayout([
				{
					id: 'cpu',
					kind: 'metric',
					metric: 'cpu.usage',
					format: 'label-percent-precise',
				},
				{
					id: 'memory',
					kind: 'metric',
					metric: 'memory.usage',
					format: 'percent',
				},
			]),
		).toMatchObject([
			{ format: 'percent-precise', showLabel: true },
			{ format: 'percent', showLabel: false },
		]);
	});

	it('adds, duplicates, formats, and removes independent display slots', () => {
		let layout = addMetricSlot(defaultLayout, 'memory.usage');
		expect(layout[3]?.id).toBe('memory.usage#2');
		layout = setSlotFormat(layout, 'memory.usage#2', 'percent');
		layout = setSlotIconStyle(layout, 'memory.usage#2', 'fill');
		layout = setSlotShowLabel(layout, 'memory.usage#2', false);
		layout = duplicateSlot(layout, 'memory.usage#2');
		expect(layout[4]).toMatchObject({
			id: 'memory.usage#2#2',
			metric: 'memory.usage',
			format: 'percent',
			iconStyle: 'fill',
			showLabel: false,
		});
		layout = addSeparatorSlot(layout);
		expect(layout[5]?.id).toBe('separator');
		expect(removeSlot(layout, 'memory.usage#2#2')).toHaveLength(5);
	});

	it('applies compact, standard, and detailed presets without locking later edits', () => {
		let layout = addMetricSlot([], 'memory.usage');
		layout = applySlotPreset(layout, 'memory.usage', 'compact');
		expect(layout[0]).toMatchObject({ format: 'percent', showLabel: false });
		layout = applySlotPreset(layout, 'memory.usage', 'standard');
		expect(layout[0]).toMatchObject({ format: 'used', showLabel: true });
		layout = applySlotPreset(layout, 'memory.usage', 'detailed');
		expect(layout[0]).toMatchObject({ format: 'used-total', showLabel: true });
		layout = setSlotFormat(layout, 'memory.usage', 'available');
		expect(layout[0]).toMatchObject({ format: 'available', showLabel: true });
	});

	it('adds the development status metric without an unrelated icon', () => {
		expect(addMetricSlot([], 'demo.status')[0]).toMatchObject({
			metric: 'demo.status',
			iconStyle: 'none',
			format: 'percent',
		});
	});

	it('keeps a hidden slot in place so showing it restores its position', () => {
		const hidden = setSlotVisible(defaultLayout, 'separator.system', false);
		expect(setSlotVisible(hidden, 'separator.system', true)).toEqual(defaultLayout);
	});

	it('moves across hidden slots to the next visible slot', () => {
		const layout = setSlotVisible(defaultLayout, 'separator.system', false);
		expect(canMoveSlot(layout, 'memory.usage', 'left')).toBe(true);
		expect(moveSlot(layout, 'memory.usage', 'left').map((slot) => slot.id)).toEqual([
			'memory.usage',
			'separator.system',
			'cpu.usage',
		]);
		expect(canMoveSlot(layout, 'cpu.usage', 'left')).toBe(false);
	});
});
