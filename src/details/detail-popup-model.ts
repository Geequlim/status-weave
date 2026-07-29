import type { LayoutSlot } from '../presentation/layout';
import { metricKey, type MetricRef } from '../telemetry/metrics/metric-sample';

const MINIMUM_CONTENT_HEIGHT = 320;
const SINGLE_PAGE_CHROME_HEIGHT = 96;
const TABBED_PAGE_CHROME_HEIGHT = 152;

export type DetailTabsPlacement = 'before-pages' | 'after-pages';

export function detailTabsPlacement(
	orientation: number,
	bottomOrientation: number,
): DetailTabsPlacement {
	return orientation === bottomOrientation ? 'after-pages' : 'before-pages';
}

export function calculateDetailContentHeight(workAreaHeight: number, pageCount: number): number {
	const chromeHeight = pageCount > 1 ? TABBED_PAGE_CHROME_HEIGHT : SINGLE_PAGE_CHROME_HEIGHT;
	return Math.max(MINIMUM_CONTENT_HEIGHT, Math.floor(workAreaHeight - chromeHeight));
}

export function detailRefsFromLayout(layout: readonly LayoutSlot[]): MetricRef[] {
	const refs: MetricRef[] = [];
	const seen = new Set<string>();
	for (const slot of layout) {
		if (slot.kind !== 'metric' || !slot.visible) continue;
		const ref: MetricRef = { metricId: slot.metric, sourceId: slot.sourceId };
		const key = metricKey(ref);
		if (seen.has(key)) continue;
		seen.add(key);
		refs.push(ref);
	}
	return refs;
}
