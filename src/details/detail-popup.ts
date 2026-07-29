import type { IconStyle, LayoutSlot } from '../presentation/layout';
import {
	metricKey,
	type MetricId,
	type MetricRef,
	type MetricSample,
	type TelemetrySnapshot,
} from '../telemetry/metrics/metric-sample';
import type { DetailPage, DetailPageContext } from './detail-page';
import { detailPageRegistry } from './detail-page-registry';
import {
	calculateDetailContentHeight,
	detailRefsFromLayout,
	detailTabsPlacement,
} from './detail-popup-model';

export interface DetailPopupDependencies extends Omit<DetailPageContext, 'maxContentHeight'> {
	readonly AppletPopupMenu: Cinnamon.AppletPopupMenuConstructor;
	readonly PopupMenuManager: Cinnamon.PopupMenuManagerConstructor;
	readonly context: Cinnamon.TextAppletContext;
	readonly getWorkAreaHeight: (actor: Cinnamon.StActor) => number;
	readonly getHistory: <K extends MetricId>(
		ref: MetricRef<K>,
		from?: number,
		to?: number,
	) => readonly MetricSample<K>[];
	readonly orientation: number;
}

export interface DetailPopup {
	destroy(): void;
	setIconStyle(iconStyle: IconStyle): void;
	setLayout(layout: readonly LayoutSlot[]): void;
	setOrientation(orientation: number): void;
	toggle(): void;
	update(snapshot: TelemetrySnapshot): void;
}

export function createDetailPopup(dependencies: DetailPopupDependencies): DetailPopup {
	const {
		AppletPopupMenu,
		Gio,
		PopupBaseMenuItem,
		PopupMenuManager,
		St,
		context,
		metadataPath,
		orientation,
	} = dependencies;
	const menuManager = new PopupMenuManager(context);
	const menu = new AppletPopupMenu(context, orientation);
	menuManager.addMenu(menu);

	let latestSnapshot: TelemetrySnapshot | null = null;
	let pages: DetailPage[] = [];
	let selectedKey: string | null = null;
	let tabButtons = new Map<string, Cinnamon.StButton>();
	let currentLayout: readonly LayoutSlot[] = [];
	let currentIconStyle = dependencies.iconStyle;
	let currentOrientation = orientation;

	const select = (key: string) => {
		if (!pages.some((page) => metricKey(page.ref) === key)) return;
		selectedKey = key;
		for (const page of pages) {
			const pageKey = metricKey(page.ref);
			const selected = pageKey === key;
			page.setVisible(selected);
			const button = tabButtons.get(pageKey);
			if (selected) button?.add_style_pseudo_class('active');
			else button?.remove_style_pseudo_class('active');
			if (selected && latestSnapshot) page.update(latestSnapshot);
		}
	};

	const createTabButton = (page: DetailPage) => {
		const definition = detailPageRegistry[page.ref.metricId];
		const button = new St.Button({
			can_focus: true,
			reactive: true,
			style_class: 'popup-menu-item status-weave-detail-tab',
		});
		const content = new St.BoxLayout({ style_class: 'status-weave-detail-tab-content' });
		if (definition.iconName) {
			const iconPath = `${metadataPath}/icons/phosphor/${currentIconStyle}/${definition.iconName}-symbolic.svg`;
			content.add_child(
				new St.Icon({
					gicon: new Gio.FileIcon({ file: Gio.file_new_for_path(iconPath) }),
					icon_size: 14,
					icon_type: St.IconType.SYMBOLIC,
					style_class: 'popup-menu-icon',
				}),
			);
		}
		content.add_child(new St.Label({ text: page.tabLabel }));
		button.set_child(content);
		const key = metricKey(page.ref);
		button.connect('clicked', () => select(key));
		tabButtons.set(key, button);
		return button;
	};

	const setLayout = (layout: readonly LayoutSlot[]) => {
		currentLayout = layout;
		const refs = detailRefsFromLayout(layout);
		const previousSelection = selectedKey;
		menu.removeAll();
		pages = [];
		tabButtons = new Map<string, Cinnamon.StButton>();

		if (refs.length === 0) {
			const empty = new PopupBaseMenuItem({
				activate: false,
				hover: false,
				reactive: true,
			});
			empty.addActor(
				new St.Label({
					text: '当前面板没有可查看的指标',
					style_class: 'status-weave-detail-empty',
				}),
			);
			menu.addMenuItem(empty);
			selectedKey = null;
			return;
		}

		const pageContext: DetailPageContext = {
			...dependencies,
			iconStyle: currentIconStyle,
			maxContentHeight: calculateDetailContentHeight(
				dependencies.getWorkAreaHeight(context.actor),
				refs.length,
			),
		};
		pages = refs.map((ref) => detailPageRegistry[ref.metricId].create(ref, pageContext));
		let tabsItem: Cinnamon.PopupMenuItem | null = null;
		if (pages.length > 1) {
			tabsItem = new PopupBaseMenuItem({
				activate: false,
				hover: false,
				reactive: true,
			});
			const tabs = new St.BoxLayout({ style_class: 'status-weave-detail-tabs' });
			for (const page of pages) tabs.add_child(createTabButton(page));
			tabsItem.addActor(tabs, { expand: true, span: -1 });
		}
		if (
			tabsItem &&
			detailTabsPlacement(currentOrientation, St.Side.BOTTOM) === 'before-pages'
		) {
			menu.addMenuItem(tabsItem);
		}
		for (const page of pages) menu.addMenuItem(page.item);
		if (tabsItem && detailTabsPlacement(currentOrientation, St.Side.BOTTOM) === 'after-pages') {
			menu.addMenuItem(tabsItem);
		}

		const fallback = metricKey(pages[0]!.ref);
		select(
			previousSelection && pages.some((page) => metricKey(page.ref) === previousSelection)
				? previousSelection
				: fallback,
		);
	};

	return {
		destroy: () => {
			menuManager.removeMenu(menu);
			menu.destroy();
		},
		setIconStyle: (iconStyle: IconStyle) => {
			if (currentIconStyle === iconStyle) return;
			currentIconStyle = iconStyle;
			setLayout(currentLayout);
		},
		setLayout,
		setOrientation: (nextOrientation: number) => {
			if (currentOrientation === nextOrientation) return;
			currentOrientation = nextOrientation;
			setLayout(currentLayout);
		},
		toggle: () => menu.toggle(),
		update: (snapshot: TelemetrySnapshot) => {
			latestSnapshot = snapshot;
			if (selectedKey) select(selectedKey);
		},
	};
}
