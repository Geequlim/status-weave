import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import { metricStatusLabels } from '../../../telemetry/metrics/metric-status';
import {
	formatBinaryBytes,
	formatByteRate,
	formatPercentage,
	formatRpm,
	formatTemperature,
} from '../../../presentation/value-format';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';

export function createDemoStatusPage(
	ref: MetricRef<'demo.status'>,
	context: DetailPageContext,
): DetailPage {
	const frame = createDetailPageFrame(context, '状态演示', null);
	const value = frame.addRow('模拟数值');
	const state = frame.addRow('当前状态');
	const temperature = frame.addRow('温度');
	const bytes = frame.addRow('字节量');
	const rate = frame.addRow('速率');
	const rpm = frame.addRow('转速');
	frame.addDivider();
	frame.addSection('说明');
	frame.addRow('状态顺序').set_text('正常 → 警告 → 危险 → 不可用 → 等待');

	return {
		item: frame.item,
		ref,
		tabLabel: '演示',
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const sample = findMetricSample(snapshot, ref);
			const status = sample?.status ?? 'unavailable';
			const label = metricStatusLabels[status];
			value.set_text(sample?.value ? formatPercentage(sample.value.percentage, 1) : '—');
			state.set_text(label);
			temperature.set_text(
				sample?.value ? formatTemperature(sample.value.temperatureCelsius) : '—',
			);
			bytes.set_text(sample?.value ? formatBinaryBytes(sample.value.bytes) : '—');
			rate.set_text(sample?.value ? formatByteRate(sample.value.bytesPerSecond) : '—');
			rpm.set_text(sample?.value ? formatRpm(sample.value.rpm) : '—');
			frame.setBadge(label, status);
		},
	};
}
