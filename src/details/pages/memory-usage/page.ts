import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';
import { createMemoryUsagePageModel } from './model';

export function createMemoryUsagePage(
	ref: MetricRef<'memory.usage'>,
	context: DetailPageContext,
): DetailPage {
	const frame = createDetailPageFrame(context, '内存', 'memory');
	const initial = createMemoryUsagePageModel(undefined);
	const values = new Map(initial.rows.map((row) => [row.id, frame.addRow(row.label)]));
	frame.addDivider();
	frame.addSection('硬件信息');
	const memoryType = frame.addRow('类型');
	const memorySpeed = frame.addRow('配置频率');

	return {
		item: frame.item,
		ref,
		tabLabel: ref.sourceId === 'system' ? '内存' : `内存 · ${ref.sourceId}`,
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const sample = findMetricSample(snapshot, ref);
			const model = createMemoryUsagePageModel(sample);
			const hardware = snapshot.hardware?.memory;
			frame.setBadge(
				sample?.status === 'normal' ? (hardware?.manufacturer ?? null) : model.status,
				sample?.status ?? 'unavailable',
			);
			for (const row of model.rows) values.get(row.id)?.set_text(row.value);
			memoryType.set_text(hardware?.type ?? '—');
			memorySpeed.set_text(
				hardware?.configuredSpeedMegatransfersPerSecond
					? `${hardware.configuredSpeedMegatransfersPerSecond} MT/s`
					: '—',
			);
		},
	};
}
