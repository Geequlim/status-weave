import type { DetailPageContext } from '../detail-page';
import type { MetricStatus } from '../../telemetry/metrics/metric-sample';
import { detailBadgeMinimumWidthEm } from '../detail-popup-model';

export interface DetailValueRow {
	readonly actor: Cinnamon.StBoxLayout;
	readonly value: Cinnamon.StLabel;
}

export interface DetailPageFrame {
	readonly content: Cinnamon.StBoxLayout;
	readonly item: Cinnamon.PopupMenuItem;
	addDivider(): void;
	addRow(title: string): Cinnamon.StLabel;
	addSection(title: string): void;
	createRow(title: string): DetailValueRow;
	setBadge(text: string | null, status?: MetricStatus): void;
	setVisible(visible: boolean): void;
}

export function createDetailPageFrame(
	context: DetailPageContext,
	title: string,
	iconName: 'cpu' | 'memory' | null,
): DetailPageFrame {
	const { Gio, PopupBaseMenuItem, St, maxContentHeight, metadataPath } = context;
	const item = new PopupBaseMenuItem({ activate: false, hover: false, reactive: true });
	const scroll = new St.ScrollView({ style_class: 'status-weave-detail-scroll' });
	scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
	scroll.set_style(`max-height: ${maxContentHeight}px;`);
	const content = new St.BoxLayout({
		style_class: 'status-weave-detail-page',
		vertical: true,
	});
	scroll.add_actor(content);
	item.addActor(scroll, { expand: true, span: -1 });

	const header = new St.BoxLayout({ style_class: 'status-weave-detail-header-row' });
	if (iconName) {
		const iconPath = `${metadataPath}/icons/phosphor/regular/${iconName}-symbolic.svg`;
		header.add_child(
			new St.Icon({
				gicon: new Gio.FileIcon({ file: Gio.file_new_for_path(iconPath) }),
				icon_size: 16,
				icon_type: St.IconType.SYMBOLIC,
				style_class: 'popup-menu-icon',
			}),
		);
	}
	header.add_child(
		new St.Label({
			text: title,
			style_class: 'status-weave-detail-header',
		}),
	);
	const status = new St.Label({
		style_class: 'status-weave-detail-status',
		text: '等待采样',
		x_align: St.Align.END,
	});
	const statusContainer = new St.Bin({
		x_align: St.Align.END,
		x_expand: true,
	});
	statusContainer.set_child(status);
	header.add_child(statusContainer);
	content.add_child(header);

	const createRow = (rowTitle: string): DetailValueRow => {
		const actor = new St.BoxLayout({ style_class: 'status-weave-detail-row' });
		actor.add_child(new St.Label({ text: rowTitle, x_expand: true }));
		const value = new St.Label({
			style_class: 'status-weave-detail-value',
			text: '—',
			x_align: St.Align.END,
		});
		actor.add_child(value);
		return { actor, value };
	};

	return {
		content,
		item,
		addDivider: () => {
			content.add_child(new St.BoxLayout({ style_class: 'status-weave-detail-divider' }));
		},
		addRow: (rowTitle: string) => {
			const row = createRow(rowTitle);
			content.add_child(row.actor);
			return row.value;
		},
		addSection: (sectionTitle: string) => {
			content.add_child(
				new St.Label({
					text: sectionTitle,
					style_class: 'status-weave-detail-section-title',
				}),
			);
		},
		createRow,
		setBadge: (text: string | null, metricStatus = 'normal') => {
			if (text) {
				for (const name of ['normal', 'warning', 'critical', 'waiting', 'unavailable']) {
					status.remove_style_class_name(`status-weave-status-${name}`);
				}
				status.add_style_class_name(`status-weave-status-${metricStatus}`);
				status.set_style(`min-width: ${detailBadgeMinimumWidthEm(text, metricStatus)}em;`);
				status.set_text(text);
				status.show();
			} else {
				status.hide();
			}
		},
		setVisible: (visible: boolean) => (visible ? item.actor.show() : item.actor.hide()),
	};
}
