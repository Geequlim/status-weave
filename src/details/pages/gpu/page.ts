import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';
import { createGpuPageModel } from './model';

export function createGpuPage(
	ref: MetricRef<'gpu.device'>,
	context: DetailPageContext,
): DetailPage {
	const frame = createDetailPageFrame(context, 'NVIDIA GPU', 'gpu');
	const rows = new Map<string, Cinnamon.StLabel>();
	for (const row of createGpuPageModel(undefined).rows) {
		rows.set(row.id, frame.addRow(row.label));
	}

	return {
		item: frame.item,
		ref,
		tabLabel: 'GPU',
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const model = createGpuPageModel(findMetricSample(snapshot, ref));
			frame.setTitle(model.title);
			frame.setBadge(model.badge, model.status);
			for (const row of model.rows) rows.get(row.id)?.set_text(row.value);
		},
	};
}
