import {
	findMetricSample,
	type MetricRef,
	type TelemetrySnapshot,
} from '../../../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from '../../detail-page';
import { createDetailPageFrame } from '../../ui/detail-page-frame';
import { createNetworkPageModel } from './model';

export function createNetworkPage(
	ref: MetricRef<'network.traffic'>,
	context: DetailPageContext,
): DetailPage {
	const frame = createDetailPageFrame(context, '网络', 'network');
	const download = frame.addRow('下载速度');
	const upload = frame.addRow('上传速度');
	const received = frame.addRow('累计接收');
	const sent = frame.addRow('累计发送');
	const source = frame.addRow('当前来源');
	const defaultInterface = frame.addRow('默认路由');
	frame.addDivider();
	frame.addSection('网络接口');
	const interfaces = new context.St.BoxLayout({
		style_class: 'status-weave-detail-network-list',
		vertical: true,
		x_expand: true,
	});
	frame.content.add_child(interfaces);

	return {
		item: frame.item,
		ref,
		tabLabel: '网络',
		setVisible: frame.setVisible,
		update: (snapshot: TelemetrySnapshot) => {
			const model = createNetworkPageModel(findMetricSample(snapshot, ref));
			frame.setBadge(model.badge, model.status);
			download.set_text(model.download);
			upload.set_text(model.upload);
			received.set_text(model.received);
			sent.set_text(model.sent);
			source.set_text(model.source);
			defaultInterface.set_text(model.defaultInterface);
			interfaces.destroy_all_children();
			for (const entry of model.interfaces) {
				const row = new context.St.BoxLayout({
					style_class: `status-weave-detail-row ${
						entry.connected
							? 'status-weave-status-normal'
							: 'status-weave-status-unavailable'
					}`,
				});
				row.add_child(new context.St.Label({ text: entry.label, x_expand: true }));
				row.add_child(
					new context.St.Label({
						style_class: 'status-weave-detail-network-value',
						text: entry.value,
						x_align: context.St.Align.END,
					}),
				);
				interfaces.add_child(row);
			}
		},
	};
}
