import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';
import { calculateCpuCoreColumnCount, createCpuUsagePageModel } from './model';

export function createCpuUsagePage(
	ref: MetricRef<'cpu.usage'>,
	context: DetailPageContext,
): DetailPage {
	const frame = createDetailPageFrame(context, 'CPU 使用率', 'cpu');
	const overall = frame.addRow('总体');
	frame.addDivider();
	frame.addSection('逻辑核心');
	const cores = new context.St.BoxLayout({
		style_class: 'status-weave-detail-core-list',
		x_expand: true,
	});
	frame.content.add_child(cores);

	return {
		item: frame.item,
		ref,
		tabLabel: ref.sourceId === 'system' ? 'CPU' : `CPU · ${ref.sourceId}`,
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const sample = findMetricSample(snapshot, ref);
			const model = createCpuUsagePageModel(sample);
			frame.setBadge(
				sample?.status === 'normal'
					? (snapshot.hardware?.cpu?.modelName ?? null)
					: model.status,
				sample?.status ?? 'unavailable',
			);
			overall.set_text(model.overall);
			cores.destroy_all_children();
			const columnCount = calculateCpuCoreColumnCount(
				model.cores.length,
				context.maxContentHeight,
			);
			const rowsPerColumn = Math.ceil(model.cores.length / columnCount);
			for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
				const column = new context.St.BoxLayout({
					style_class: 'status-weave-detail-core-column',
					vertical: true,
					x_expand: true,
				});
				const headings = new context.St.BoxLayout({
					style_class: 'status-weave-detail-core-headings',
				});
				headings.add_child(new context.St.Label({ text: '核心', x_expand: true }));
				headings.add_child(
					new context.St.Label({
						style_class: 'status-weave-detail-core-usage',
						text: '占用率',
						x_align: context.St.Align.END,
					}),
				);
				headings.add_child(
					new context.St.Label({
						style_class: 'status-weave-detail-core-frequency',
						text: '当前频率',
						x_align: context.St.Align.END,
					}),
				);
				column.add_child(headings);
				const start = columnIndex * rowsPerColumn;
				const end = Math.min(start + rowsPerColumn, model.cores.length);
				for (const core of model.cores.slice(start, end)) {
					const row = new context.St.BoxLayout({
						style_class: 'status-weave-detail-row status-weave-detail-core-row',
					});
					row.add_child(new context.St.Label({ text: core.label, x_expand: true }));
					row.add_child(
						new context.St.Label({
							style_class: 'status-weave-detail-core-usage',
							text: core.usage,
							x_align: context.St.Align.END,
						}),
					);
					row.add_child(
						new context.St.Label({
							style_class: 'status-weave-detail-core-frequency',
							text: core.frequency,
							x_align: context.St.Align.END,
						}),
					);
					column.add_child(row);
				}
				cores.add_child(column);
			}
		},
	};
}
