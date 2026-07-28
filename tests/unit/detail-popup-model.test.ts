import { describe, expect, it } from 'vitest';
import {
	calculateDetailContentHeight,
	detailBadgeMinimumWidthEm,
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

	it('reserves hardware badge width without enlarging state labels', () => {
		expect(detailBadgeMinimumWidthEm('SK Hynix', 'normal')).toBe(4.25);
		expect(detailBadgeMinimumWidthEm('Intel Core Ultra 9 386H', 'normal')).toBe(11.5);
		expect(detailBadgeMinimumWidthEm('20 个传感器', 'normal')).toBe(5.5);
		expect(detailBadgeMinimumWidthEm('等待采样', 'waiting')).toBe(4.25);
		expect(detailBadgeMinimumWidthEm('x'.repeat(100), 'normal')).toBe(14);
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
					iconStyle: 'regular',
					showLabel: true,
					visible: true,
				},
				{
					id: 'second',
					kind: 'metric',
					metric: 'cpu.usage',
					sourceId: 'cpu-b',
					format: 'percent',
					iconStyle: 'regular',
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
