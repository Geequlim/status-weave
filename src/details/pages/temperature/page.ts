import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';
import { calculateTemperatureColumnCount, createTemperaturePageModel } from './model';

export function createTemperaturePage(
	ref: MetricRef<'temperature.hwmon'>,
	context: DetailPageContext,
): DetailPage {
	const frame = createDetailPageFrame(context, '温度', 'temperature');
	const primary = frame.addRow('主要');
	const peak = frame.addRow('最高');
	const average = frame.addRow('平均');
	frame.addDivider();
	frame.addSection('传感器');
	const sensors = new context.St.BoxLayout({
		style_class: 'status-weave-detail-sensor-list',
		x_expand: true,
	});
	frame.content.add_child(sensors);

	return {
		item: frame.item,
		ref,
		tabLabel: '温度',
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const sample = findMetricSample(snapshot, ref);
			const model = createTemperaturePageModel(sample);
			frame.setBadge(model.badge, model.status);
			primary.set_text(model.primary);
			peak.set_text(model.peak);
			average.set_text(model.average);
			sensors.destroy_all_children();
			const columnCount = calculateTemperatureColumnCount(
				model.sensors.length,
				context.maxContentHeight,
			);
			const rowsPerColumn = Math.ceil(model.sensors.length / columnCount);
			for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
				const column = new context.St.BoxLayout({
					style_class: 'status-weave-detail-sensor-column',
					vertical: true,
					x_expand: true,
				});
				const start = columnIndex * rowsPerColumn;
				for (const sensor of model.sensors.slice(start, start + rowsPerColumn)) {
					const row = new context.St.BoxLayout({
						style_class: 'status-weave-detail-row status-weave-detail-sensor-row',
					});
					row.add_child(new context.St.Label({ text: sensor.label, x_expand: true }));
					row.add_child(
						new context.St.Label({
							style_class: 'status-weave-detail-sensor-current',
							text: sensor.value,
							x_align: context.St.Align.END,
						}),
					);
					column.add_child(row);
				}
				sensors.add_child(column);
			}
		},
	};
}
