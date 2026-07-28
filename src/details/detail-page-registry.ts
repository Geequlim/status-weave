import type { MetricId } from '../telemetry/metrics/metric-sample';
import type { DetailPageDefinition } from './detail-page';
import { createCpuUsagePage } from './pages/cpu-usage/page';
import { createDemoStatusPage } from './pages/demo-status/page';
import { createFanPage } from './pages/fan/page';
import { createGpuPage } from './pages/gpu/page';
import { createMemoryUsagePage } from './pages/memory-usage/page';
import { createNetworkPage } from './pages/network/page';
import { createTemperaturePage } from './pages/temperature/page';

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
	'temperature.hwmon': {
		create: (ref, context) =>
			createTemperaturePage(
				ref as { metricId: 'temperature.hwmon'; sourceId: string },
				context,
			),
		iconName: 'temperature',
		metricId: 'temperature.hwmon',
		title: '温度',
	},
	'fan.hwmon': {
		create: (ref, context) =>
			createFanPage(ref as { metricId: 'fan.hwmon'; sourceId: string }, context),
		iconName: 'fan',
		metricId: 'fan.hwmon',
		title: '风扇',
	},
	'gpu.device': {
		create: (ref, context) =>
			createGpuPage(ref as { metricId: 'gpu.device'; sourceId: string }, context),
		iconName: 'gpu',
		metricId: 'gpu.device',
		title: 'GPU',
	},
	'network.traffic': {
		create: (ref, context) =>
			createNetworkPage(ref as { metricId: 'network.traffic'; sourceId: string }, context),
		iconName: 'network',
		metricId: 'network.traffic',
		title: '网络',
	},
	'demo.status': {
		create: (ref, context) =>
			createDemoStatusPage(ref as { metricId: 'demo.status'; sourceId: string }, context),
		iconName: null,
		metricId: 'demo.status',
		title: '状态演示',
	},
};
