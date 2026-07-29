import { describe, expect, it } from 'vitest';
import {
	calculateDetailContentHeight,
	detailRefsFromLayout,
	detailTabsPlacement,
} from '../../src/details/detail-popup-model';
import { addMetricSlot, defaultLayout, setSlotVisible } from '../../src/presentation/layout';

describe('detail popup model', () => {
	it('places tabs next to the panel that opened the popup', () => {
		expect(detailTabsPlacement(2, 2)).toBe('after-pages');
		expect(detailTabsPlacement(0, 2)).toBe('before-pages');
		expect(detailTabsPlacement(1, 2)).toBe('before-pages');
	});

	it('uses the available work area while reserving space for popup chrome', () => {
		expect(calculateDetailContentHeight(1040, 1)).toBe(944);
		expect(calculateDetailContentHeight(1040, 2)).toBe(888);
		expect(calculateDetailContentHeight(400, 2)).toBe(320);
	});

	it('uses visible metric order while deduplicating repeated data sources', () => {
		let layout = addMetricSlot(defaultLayout, 'cpu.usage');
		layout = setSlotVisible(layout, 'memory.usage', false);
		expect(detailRefsFromLayout(layout)).toEqual([
			{ metricId: 'cpu.usage', sourceId: 'system' },
		]);
	});

	it('keeps separate pages for distinct sources of the same metric', () => {
		expect(
			detailRefsFromLayout([
				{
					id: 'first',
					kind: 'metric',
					metric: 'cpu.usage',
					sourceId: 'cpu-a',
					format: 'percent',
					showIcon: true,
					showLabel: true,
					visible: true,
				},
				{
					id: 'second',
					kind: 'metric',
					metric: 'cpu.usage',
					sourceId: 'cpu-b',
					format: 'percent',
					showIcon: true,
					showLabel: true,
					visible: true,
				},
			]),
		).toEqual([
			{ metricId: 'cpu.usage', sourceId: 'cpu-a' },
			{ metricId: 'cpu.usage', sourceId: 'cpu-b' },
		]);
	});
});
