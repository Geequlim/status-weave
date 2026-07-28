import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';
import { createFanPageModel } from './model';

export function createFanPage(ref: MetricRef<'fan.hwmon'>, context: DetailPageContext): DetailPage {
	const frame = createDetailPageFrame(context, '风扇', 'fan');
	const primary = frame.addRow('主要');
	const peak = frame.addRow('最高');
	const average = frame.addRow('平均');
	frame.addDivider();
	frame.addSection('风扇');
	const rows = new context.St.BoxLayout({
		style_class: 'status-weave-detail-fan-list',
		vertical: true,
		x_expand: true,
	});
	frame.content.add_child(rows);

	return {
		item: frame.item,
		ref,
		tabLabel: '风扇',
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const sample = findMetricSample(snapshot, ref);
			const model = createFanPageModel(sample);
			frame.setBadge(model.badge, model.status);
			primary.set_text(model.primary);
			peak.set_text(model.peak);
			average.set_text(model.average);
			rows.destroy_all_children();
			for (const sensor of model.sensors) {
				const row = new context.St.BoxLayout({
					style_class: 'status-weave-detail-row',
				});
				row.add_child(new context.St.Label({ text: sensor.label, x_expand: true }));
				row.add_child(
					new context.St.Label({
						style_class: 'status-weave-detail-value',
						text: sensor.value,
						x_align: context.St.Align.END,
					}),
				);
				rows.add_child(row);
			}
		},
	};
}
