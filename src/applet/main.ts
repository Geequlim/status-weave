import { defaultInstanceConfig } from '../settings/instance-config';
import { createDetailPopup } from '../details/detail-popup';
import {
	getWorkAreaHeight,
	loadAppletModule,
	loadPopupMenuModule,
	loadSettingsModule,
	loadUiToolkit,
} from '../platform/cinnamon';
import {
	addMetricSlot,
	addSeparatorSlot,
	applySlotPreset,
	canMoveSlot,
	defaultLayout,
	duplicateSlot,
	iconStyleOptions,
	type LayoutSlot,
	metricIconNames,
	metricFormatOptions,
	metricLabels,
	metricPresetOptions,
	type MetricSlot,
	moveSlot,
	normalizeLayout,
	removeSlot,
	setSlotFormat,
	setSlotIconStyle,
	setSlotShowLabel,
	setSlotSourceId,
	setSlotVisible,
} from '../presentation/layout';
import {
	formatSystemLabel,
	formatSystemSlotPresentation,
	formatSystemTooltip,
} from '../presentation/system-format';
import {
	findMetricSample,
	type MetricId,
	type TelemetrySnapshot,
} from '../telemetry/metrics/metric-sample';
import {
	systemTelemetryService,
	type TelemetrySubscription,
} from '../telemetry/system-telemetry-service';

const UUID = 'status-weave@geequlim';
const LAYOUT_KEY = 'layout';

export interface AppletInstance {
	on_applet_clicked(event?: unknown): void;
	on_applet_removed_from_panel(deleteConfig?: boolean): void;
	set_applet_label(label: string): void;
	set_applet_tooltip(tooltip: string): void;
}

export function createApplet(
	metadataPath: string,
	orientation: number,
	panelHeight: number,
	instanceId: number,
): AppletInstance {
	const { AllowedLayout, AppletPopupMenu, TextApplet } = loadAppletModule();
	const { AppletSettings } = loadSettingsModule();
	const { Gio, St } = loadUiToolkit();
	const {
		PopupBaseMenuItem,
		PopupMenuItem,
		PopupMenuManager,
		PopupSeparatorMenuItem,
		PopupSubMenuMenuItem,
		PopupSwitchMenuItem,
	} = loadPopupMenuModule();
	const context = new TextApplet(orientation, panelHeight, instanceId);
	context.setAllowedLayout(AllowedLayout.HORIZONTAL);
	const settings = new AppletSettings(context, UUID, instanceId);
	const storedLayout = settings.getValue(LAYOUT_KEY);
	let layout = normalizeLayout(storedLayout);
	if (JSON.stringify(storedLayout) !== JSON.stringify(layout)) {
		settings.setValue(LAYOUT_KEY, layout);
	}
	let latestSnapshot: TelemetrySnapshot | null = null;
	let telemetrySubscription: TelemetrySubscription | null = null;
	const panelLayout = new St.BoxLayout({ style_class: 'status-weave-layout' });
	let panelLayoutAttached = false;
	context.set_applet_label('CPU …  ·  RAM …');
	context.set_applet_tooltip(defaultInstanceConfig.tooltip);

	const detailPopup = createDetailPopup({
		AppletPopupMenu,
		Gio,
		PopupBaseMenuItem,
		PopupMenuManager,
		St,
		context,
		getHistory: (ref, from, to) => systemTelemetryService.getHistory(ref, from, to),
		getWorkAreaHeight,
		metadataPath,
		orientation,
	});
	detailPopup.setLayout(layout);

	const visibleSlots = () => {
		const slots = layout.filter((slot) => slot.visible);
		while (slots[0]?.kind === 'separator') slots.shift();
		while (slots[slots.length - 1]?.kind === 'separator') slots.pop();
		return slots;
	};
	const visibleMetricIds = (): Set<MetricId> =>
		new Set(
			layout.flatMap((slot) => (slot.kind === 'metric' && slot.visible ? [slot.metric] : [])),
		);

	const renderPanel = (snapshot: TelemetrySnapshot) => {
		panelLayout.destroy_all_children();
		const iconSize = Math.max(12, Math.min(16, panelHeight - 8));
		const createMetricActor = (slot: MetricSlot, grouped: boolean) => {
			const presentation = formatSystemSlotPresentation(snapshot, slot);
			const metricLayout = new St.BoxLayout({
				style_class: `status-weave-metric status-weave-status-${presentation.status}`,
			});
			const iconName = metricIconNames[slot.metric];
			if (slot.iconStyle !== 'none' && iconName) {
				const iconPath = `${metadataPath}/icons/phosphor/${slot.iconStyle}/${iconName}-symbolic.svg`;
				metricLayout.add_child(
					new St.Icon({
						gicon: new Gio.FileIcon({ file: Gio.file_new_for_path(iconPath) }),
						icon_size: iconSize,
						icon_type: St.IconType.SYMBOLIC,
						style_class: 'applet-icon status-weave-icon',
					}),
				);
			}
			if (presentation.label) {
				metricLayout.add_child(
					new St.Label({
						text: presentation.label,
						style_class: 'applet-label status-weave-label',
					}),
				);
			}
			metricLayout.add_child(
				new St.Label({
					text: presentation.value,
					style_class: `applet-label status-weave-value status-weave-value-${presentation.widthClass}${
						grouped ? ' status-weave-value-grouped' : ''
					}`,
				}),
			);
			return metricLayout;
		};

		const slots = visibleSlots();
		for (let index = 0; index < slots.length; index += 1) {
			const slot = slots[index]!;
			if (slot.kind === 'separator') {
				panelLayout.add_child(
					new St.Label({ text: '·', style_class: 'applet-label status-weave-separator' }),
				);
				continue;
			}
			const group = [slot];
			while (index + 1 < slots.length) {
				const next = slots[index + 1]!;
				if (
					next.kind !== 'metric' ||
					next.metric !== slot.metric ||
					next.sourceId !== slot.sourceId
				) {
					break;
				}
				group.push(next);
				index += 1;
			}
			if (group.length === 1) {
				panelLayout.add_child(createMetricActor(slot, false));
				continue;
			}
			const groupActor = new St.BoxLayout({ style_class: 'status-weave-metric-group' });
			for (const groupedSlot of group) {
				groupActor.add_child(createMetricActor(groupedSlot, true));
			}
			panelLayout.add_child(groupActor);
		}
		if (visibleSlots().length === 0) {
			panelLayout.add_child(
				new St.Label({ text: 'Status Weave', style_class: 'applet-label' }),
			);
		}
		if (!panelLayoutAttached) {
			context._layoutBin.set_child(panelLayout);
			panelLayoutAttached = true;
		}
	};

	const render = () => {
		if (!latestSnapshot) return;
		context.set_applet_label(formatSystemLabel(latestSnapshot, layout));
		context.set_applet_tooltip(formatSystemTooltip(latestSnapshot, instanceId, layout));
		renderPanel(latestSnapshot);
		detailPopup.update(latestSnapshot);
	};
	const saveLayout = (nextLayout: readonly LayoutSlot[]) => {
		layout = normalizeLayout(nextLayout);
		settings.setValue(LAYOUT_KEY, layout);
		detailPopup.setLayout(layout);
		telemetrySubscription?.setMetrics(visibleMetricIds());
		render();
	};
	const keepMenuOpen = <T extends Cinnamon.PopupMenuItem>(item: T): T => {
		item.activate = (event?: unknown) => item.emit('activate', event, true);
		return item;
	};

	const addMetricAction = (menu: Cinnamon.PopupMenu, label: string, metric: MetricId) => {
		const item = keepMenuOpen(new PopupMenuItem(label));
		item.connect('activate', () => saveLayout(addMetricSlot(layout, metric)));
		menu.addMenuItem(item);
	};

	const addMenu = new PopupSubMenuMenuItem('添加展示项');
	addMetricAction(addMenu.menu, 'CPU 使用率', 'cpu.usage');
	addMetricAction(addMenu.menu, '内存', 'memory.usage');
	addMetricAction(addMenu.menu, '温度', 'temperature.hwmon');
	addMetricAction(addMenu.menu, '风扇', 'fan.hwmon');
	addMetricAction(addMenu.menu, 'NVIDIA 显卡', 'gpu.device');
	addMetricAction(addMenu.menu, '网速', 'network.traffic');
	addMetricAction(addMenu.menu, '状态演示（开发）', 'demo.status');
	addMenu.menu.addMenuItem(new PopupSeparatorMenuItem());
	const addSeparator = keepMenuOpen(new PopupMenuItem('分隔符'));
	addSeparator.connect('activate', () => saveLayout(addSeparatorSlot(layout)));
	addMenu.menu.addMenuItem(addSeparator);
	context._applet_context_menu.addMenuItem(addMenu);

	const rebuildLayoutMenu = (menu: Cinnamon.PopupMenu) => {
		menu.removeAll();
		for (const slot of layout) {
			const title =
				slot.kind === 'separator'
					? '分隔符'
					: `${metricLabels[slot.metric]} · ${
							metricFormatOptions[slot.metric].find(
								(option) => option.id === slot.format,
							)?.label ?? slot.format
						}`;
			const slotMenu = new PopupSubMenuMenuItem(title);
			const visibility = new PopupSwitchMenuItem('显示', slot.visible);
			visibility.connect('toggled', (...args: unknown[]) => {
				const state = args[args.length - 1];
				const visible = typeof state === 'boolean' ? state : visibility.state;
				saveLayout(setSlotVisible(layout, slot.id, visible));
			});
			slotMenu.menu.addMenuItem(visibility);

			if (slot.kind === 'metric') {
				const presetMenu = new PopupSubMenuMenuItem('显示预设');
				for (const option of metricPresetOptions) {
					const presetItem = keepMenuOpen(new PopupMenuItem(option.label));
					presetItem.connect('activate', () =>
						saveLayout(applySlotPreset(layout, slot.id, option.id)),
					);
					presetMenu.menu.addMenuItem(presetItem);
				}
				slotMenu.menu.addMenuItem(presetMenu);

				const showLabel = new PopupSwitchMenuItem('显示标题', slot.showLabel);
				showLabel.connect('toggled', (...args: unknown[]) => {
					const state = args[args.length - 1];
					const show = typeof state === 'boolean' ? state : showLabel.state;
					saveLayout(setSlotShowLabel(layout, slot.id, show));
				});
				slotMenu.menu.addMenuItem(showLabel);

				const formatMenu = new PopupSubMenuMenuItem('显示格式');
				for (const option of metricFormatOptions[slot.metric]) {
					const formatItem = keepMenuOpen(
						new PopupMenuItem(
							`${option.id === slot.format ? '✓ ' : ''}${option.label}`,
						),
					);
					formatItem.connect('activate', () =>
						saveLayout(setSlotFormat(layout, slot.id, option.id)),
					);
					formatMenu.menu.addMenuItem(formatItem);
				}
				slotMenu.menu.addMenuItem(formatMenu);

				if (slot.metric === 'network.traffic') {
					const sourceMenu = new PopupSubMenuMenuItem('网络来源');
					const automatic = latestSnapshot
						? findMetricSample(latestSnapshot, {
								metricId: 'network.traffic',
								sourceId: 'network:auto',
							})
						: undefined;
					const sources = [
						{ id: 'network:auto', label: '自动主连接' },
						{ id: 'network:physical', label: '所有物理接口' },
						...(automatic?.value?.interfaces.map((entry) => ({
							id: `network:interface:${entry.name}`,
							label: entry.name,
						})) ?? []),
					];
					for (const source of sources) {
						const sourceItem = keepMenuOpen(
							new PopupMenuItem(
								`${source.id === slot.sourceId ? '✓ ' : ''}${source.label}`,
							),
						);
						sourceItem.connect('activate', () =>
							saveLayout(setSlotSourceId(layout, slot.id, source.id)),
						);
						sourceMenu.menu.addMenuItem(sourceItem);
					}
					slotMenu.menu.addMenuItem(sourceMenu);
				}

				if (metricIconNames[slot.metric]) {
					const iconMenu = new PopupSubMenuMenuItem('图标样式');
					for (const option of iconStyleOptions) {
						const iconItem = keepMenuOpen(
							new PopupMenuItem(
								`${option.id === slot.iconStyle ? '✓ ' : ''}${option.label}`,
							),
						);
						iconItem.connect('activate', () =>
							saveLayout(setSlotIconStyle(layout, slot.id, option.id)),
						);
						iconMenu.menu.addMenuItem(iconItem);
					}
					slotMenu.menu.addMenuItem(iconMenu);
				}
			}

			slotMenu.menu.addMenuItem(new PopupSeparatorMenuItem());
			const moveLeft = keepMenuOpen(new PopupMenuItem('向左移动'));
			moveLeft.setSensitive(canMoveSlot(layout, slot.id, 'left'));
			moveLeft.connect('activate', () => saveLayout(moveSlot(layout, slot.id, 'left')));
			slotMenu.menu.addMenuItem(moveLeft);

			const moveRight = keepMenuOpen(new PopupMenuItem('向右移动'));
			moveRight.setSensitive(canMoveSlot(layout, slot.id, 'right'));
			moveRight.connect('activate', () => saveLayout(moveSlot(layout, slot.id, 'right')));
			slotMenu.menu.addMenuItem(moveRight);

			const duplicate = keepMenuOpen(new PopupMenuItem('复制'));
			duplicate.connect('activate', () => saveLayout(duplicateSlot(layout, slot.id)));
			slotMenu.menu.addMenuItem(duplicate);

			const remove = keepMenuOpen(new PopupMenuItem('移除'));
			remove.connect('activate', () => saveLayout(removeSlot(layout, slot.id)));
			slotMenu.menu.addMenuItem(remove);
			menu.addMenuItem(slotMenu);
		}
		if (layout.length > 0) menu.addMenuItem(new PopupSeparatorMenuItem());
		const reset = keepMenuOpen(new PopupMenuItem('重置当前布局'));
		reset.connect('activate', () => saveLayout(defaultLayout));
		menu.addMenuItem(reset);
	};

	const layoutMenu = new PopupSubMenuMenuItem('当前布局');
	rebuildLayoutMenu(layoutMenu.menu);
	context._applet_context_menu.addMenuItem(layoutMenu);
	const contextMenuSignal = context._applet_context_menu.connect(
		'open-state-changed',
		(...args: unknown[]) => {
			if (args[args.length - 1] === true) rebuildLayoutMenu(layoutMenu.menu);
		},
	);

	let firstUpdate = true;
	telemetrySubscription = systemTelemetryService.subscribe(visibleMetricIds(), (snapshot) => {
		latestSnapshot = snapshot;
		render();
		if (firstUpdate) {
			firstUpdate = false;
			global.log(
				`[status-weave@geequlim] First telemetry update applied: ${formatSystemLabel(snapshot, layout)}`,
			);
		}
	});
	context.on_applet_removed_from_panel = () => {
		telemetrySubscription?.unsubscribe();
		context._applet_context_menu.disconnect(contextMenuSignal);
		detailPopup.destroy();
		settings.finalize();
	};
	context.on_orientation_changed = (nextOrientation: number) =>
		detailPopup.setOrientation(nextOrientation);
	context.on_applet_clicked = () => detailPopup.toggle();
	return context;
}

export function main(
	metadata: Cinnamon.AppletMetadata,
	orientation: number,
	panelHeight: number,
	instanceId: number,
): AppletInstance {
	return createApplet(metadata.path, orientation, panelHeight, instanceId);
}
