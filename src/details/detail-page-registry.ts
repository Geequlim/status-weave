import type { MetricId } from '../telemetry/metrics/metric-sample';
import type { DetailPageDefinition } from './detail-page';
import { createCpuUsagePage } from './pages/cpu-usage/page';
import { createDemoStatusPage } from './pages/demo-status/page';
import { createMemoryUsagePage } from './pages/memory-usage/page';

export const detailPageRegistry: Record<MetricId, DetailPageDefinition> = {
	'cpu.usage': {
		create: (ref, context) =>
			createCpuUsagePage(ref as { metricId: 'cpu.usage'; sourceId: string }, context),
		iconName: 'cpu',
		metricId: 'cpu.usage',
		title: 'CPU',
	},
	'memory.usage': {
		create: (ref, context) =>
			createMemoryUsagePage(ref as { metricId: 'memory.usage'; sourceId: string }, context),
		iconName: 'memory',
		metricId: 'memory.usage',
		title: '内存',
	},
	'demo.status': {
		create: (ref, context) =>
			createDemoStatusPage(ref as { metricId: 'demo.status'; sourceId: string }, context),
		iconName: null,
		metricId: 'demo.status',
		title: '状态演示',
	},
};
