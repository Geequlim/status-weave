import { defaultInstanceConfig } from '../settings/instance-config';
import { createDetailPopup } from '../details/detail-popup';
import {
	getWorkAreaHeight,
	loadAppletModule,
	loadPopupMenuModule,
	loadSettingsModule,
	loadUiToolkit,
} from '../platform/cinnamon';
import { cancelTimeout, scheduleTimeout } from '../platform/runtime';
import {
	addMetricSlot,
	addSeparatorSlot,
	applySlotPreset,
	canMoveSlot,
	defaultLayout,
	duplicateSlot,
	type LayoutSlot,
	metricIconNames,
	metricFormatOptions,
	metricLabels,
	metricPresetOptions,
	type MetricFormatId,
	type MetricSlot,
	moveSlot,
	normalizeIconStyle,
	normalizeLayout,
	removeSlot,
	setSlotFormat,
	setSlotShowIcon,
	setSlotShowLabel,
	setSlotSourceId,
	setSlotVisible,
} from '../presentation/layout';
import {
	formatNetworkDirections,
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
const ICON_STYLE_KEY = 'icon-style';
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
	let iconStyle = normalizeIconStyle(settings.getValue(ICON_STYLE_KEY));
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
		iconStyle,
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
		const createIconActor = (name: string, size: number, styleClass: string) => {
			const iconPath = `${metadataPath}/icons/phosphor/${iconStyle}/${name}-symbolic.svg`;
			return new St.Icon({
				gicon: new Gio.FileIcon({ file: Gio.file_new_for_path(iconPath) }),
				icon_size: size,
				icon_type: St.IconType.SYMBOLIC,
				style_class: styleClass,
			});
		};
		const createMetricActor = (slot: MetricSlot, grouped: boolean) => {
			const presentation = formatSystemSlotPresentation(snapshot, slot);
			const metricLayout = new St.BoxLayout({
				style_class: `status-weave-metric status-weave-status-${presentation.status}`,
			});
			const iconName = metricIconNames[slot.metric];
			if (slot.showIcon && iconName) {
				metricLayout.add_child(
					createIconActor(iconName, iconSize, 'applet-icon status-weave-icon'),
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
			const valueStyleClass = `status-weave-value status-weave-value-${presentation.widthClass}${
				grouped ? ' status-weave-value-grouped' : ''
			}`;
			const networkDirections =
				slot.metric === 'network.traffic' ? formatNetworkDirections(snapshot, slot) : null;
			if (networkDirections) {
				const directions = new St.BoxLayout({
					style_class: `${valueStyleClass} status-weave-network-directions`,
				});
				let firstDirection = true;
				for (const direction of networkDirections) {
					directions.add_child(
						createIconActor(
							`arrow-${direction.direction === 'download' ? 'down' : 'up'}`,
							Math.max(10, iconSize - 2),
							`applet-icon status-weave-network-direction-icon${
								firstDirection
									? ''
									: ' status-weave-network-direction-icon-secondary'
							}`,
						),
					);
					directions.add_child(
						new St.Label({
							text: direction.value,
							style_class: 'applet-label status-weave-network-direction-value',
						}),
					);
					firstDirection = false;
				}
				metricLayout.add_child(directions);
			} else {
				metricLayout.add_child(
					new St.Label({
						text: presentation.value,
						style_class: `applet-label ${valueStyleClass}`,
					}),
				);
			}
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
	const iconStyleSignal = settings.connect(`changed::${ICON_STYLE_KEY}`, (...args: unknown[]) => {
		iconStyle = normalizeIconStyle(args[args.length - 1]);
		detailPopup.setIconStyle(iconStyle);
		render();
	});
	let layoutMenuSyncTimeoutId: number | null = null;
	let syncLayoutMenu = () => {};
	const saveLayout = (nextLayout: readonly LayoutSlot[]) => {
		layout = normalizeLayout(nextLayout);
		settings.setValue(LAYOUT_KEY, layout);
		detailPopup.setLayout(layout);
		telemetrySubscription?.setMetrics(visibleMetricIds());
		render();
		syncLayoutMenu();
	};
	const keepMenuOpen = <T extends Cinnamon.PopupMenuItem>(item: T): T => {
		item.activate = (event?: unknown) => item.emit('activate', event, true);
		return item;
	};

	const addMetricAction = (
		menu: Cinnamon.PopupMenu,
		label: string,
		metric: MetricId,
		format?: MetricFormatId,
	) => {
		const item = keepMenuOpen(new PopupMenuItem(label));
		item.connect('activate', () => {
			let nextLayout = addMetricSlot(layout, metric);
			const added = nextLayout[nextLayout.length - 1];
			if (format && added?.kind === 'metric') {
				nextLayout = setSlotFormat(nextLayout, added.id, format);
			}
			saveLayout(nextLayout);
		});
		menu.addMenuItem(item);
	};

	const addMenu = new PopupSubMenuMenuItem('添加展示项');
	addMetricAction(addMenu.menu, 'CPU 使用率', 'cpu.usage');
	addMetricAction(addMenu.menu, '内存', 'memory.usage');
	addMetricAction(addMenu.menu, '温度', 'temperature.hwmon');
	addMetricAction(addMenu.menu, '风扇', 'fan.hwmon');
	addMetricAction(addMenu.menu, 'NVIDIA 显卡', 'gpu.device');
	addMetricAction(addMenu.menu, 'NVIDIA 显卡风扇转速', 'gpu.device', 'gpu-fan-speed');
	addMetricAction(addMenu.menu, '网速', 'network.traffic');
	addMetricAction(addMenu.menu, '状态演示（开发）', 'demo.status');
	addMenu.menu.addMenuItem(new PopupSeparatorMenuItem());
	const addSeparator = keepMenuOpen(new PopupMenuItem('分隔符'));
	addSeparator.connect('activate', () => saveLayout(addSeparatorSlot(layout)));
	addMenu.menu.addMenuItem(addSeparator);
	context._applet_context_menu.addMenuItem(addMenu);

	interface LayoutMenuEntry {
		readonly formatItems: Map<string, Cinnamon.PopupMenuItem>;
		readonly item: Cinnamon.PopupSubMenuItem;
		readonly kind: LayoutSlot['kind'];
		readonly moveLeft: Cinnamon.PopupMenuItem;
		readonly moveRight: Cinnamon.PopupMenuItem;
		readonly showIcon?: Cinnamon.PopupSwitchMenuItem;
		readonly showLabel?: Cinnamon.PopupSwitchMenuItem;
		readonly sourceItems: Map<string, { item: Cinnamon.PopupMenuItem; label: string }>;
		readonly visibility: Cinnamon.PopupSwitchMenuItem;
	}

	const layoutMenuEntries = new Map<string, LayoutMenuEntry>();
	let layoutItemsEnd: Cinnamon.PopupMenuItem | null = null;
	let layoutResetItem: Cinnamon.PopupMenuItem | null = null;

	const slotMenuTitle = (slot: LayoutSlot): string =>
		slot.kind === 'separator'
			? '分隔符'
			: `${metricLabels[slot.metric]} · ${
					metricFormatOptions[slot.metric].find((option) => option.id === slot.format)
						?.label ?? slot.format
				}`;

	const createLayoutMenuEntry = (slot: LayoutSlot): LayoutMenuEntry => {
		const item = new PopupSubMenuMenuItem(slotMenuTitle(slot));
		const visibility = new PopupSwitchMenuItem('显示', slot.visible);
		visibility.connect('toggled', (...args: unknown[]) => {
			const state = args[args.length - 1];
			const visible = typeof state === 'boolean' ? state : visibility.state;
			saveLayout(setSlotVisible(layout, slot.id, visible));
		});
		item.menu.addMenuItem(visibility);

		const formatItems = new Map<string, Cinnamon.PopupMenuItem>();
		const sourceItems = new Map<string, { item: Cinnamon.PopupMenuItem; label: string }>();
		let showLabel: Cinnamon.PopupSwitchMenuItem | undefined;
		let showIcon: Cinnamon.PopupSwitchMenuItem | undefined;

		if (slot.kind === 'metric') {
			const presetMenu = new PopupSubMenuMenuItem('显示预设');
			for (const option of metricPresetOptions) {
				const presetItem = keepMenuOpen(new PopupMenuItem(option.label));
				presetItem.connect('activate', () =>
					saveLayout(applySlotPreset(layout, slot.id, option.id)),
				);
				presetMenu.menu.addMenuItem(presetItem);
			}
			item.menu.addMenuItem(presetMenu);

			showLabel = new PopupSwitchMenuItem('显示标题', slot.showLabel);
			showLabel.connect('toggled', (...args: unknown[]) => {
				const state = args[args.length - 1];
				const show = typeof state === 'boolean' ? state : showLabel!.state;
				saveLayout(setSlotShowLabel(layout, slot.id, show));
			});
			item.menu.addMenuItem(showLabel);

			const formatMenu = new PopupSubMenuMenuItem('显示格式');
			for (const option of metricFormatOptions[slot.metric]) {
				const formatItem = keepMenuOpen(new PopupMenuItem(option.label));
				formatItem.connect('activate', () =>
					saveLayout(setSlotFormat(layout, slot.id, option.id)),
				);
				formatItems.set(option.id, formatItem);
				formatMenu.menu.addMenuItem(formatItem);
			}
			item.menu.addMenuItem(formatMenu);

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
					const sourceItem = keepMenuOpen(new PopupMenuItem(source.label));
					sourceItem.connect('activate', () =>
						saveLayout(setSlotSourceId(layout, slot.id, source.id)),
					);
					sourceItems.set(source.id, { item: sourceItem, label: source.label });
					sourceMenu.menu.addMenuItem(sourceItem);
				}
				item.menu.addMenuItem(sourceMenu);
			}

			if (metricIconNames[slot.metric]) {
				showIcon = new PopupSwitchMenuItem('显示图标', slot.showIcon);
				showIcon.connect('toggled', (...args: unknown[]) => {
					const state = args[args.length - 1];
					const show = typeof state === 'boolean' ? state : showIcon!.state;
					saveLayout(setSlotShowIcon(layout, slot.id, show));
				});
				item.menu.addMenuItem(showIcon);
			}
		}

		item.menu.addMenuItem(new PopupSeparatorMenuItem());
		const moveLeft = keepMenuOpen(new PopupMenuItem('向左移动'));
		moveLeft.connect('activate', () => saveLayout(moveSlot(layout, slot.id, 'left')));
		item.menu.addMenuItem(moveLeft);

		const moveRight = keepMenuOpen(new PopupMenuItem('向右移动'));
		moveRight.connect('activate', () => saveLayout(moveSlot(layout, slot.id, 'right')));
		item.menu.addMenuItem(moveRight);

		const duplicate = keepMenuOpen(new PopupMenuItem('复制'));
		duplicate.connect('activate', () => saveLayout(duplicateSlot(layout, slot.id)));
		item.menu.addMenuItem(duplicate);

		const remove = keepMenuOpen(new PopupMenuItem('移除'));
		remove.connect('activate', () => saveLayout(removeSlot(layout, slot.id)));
		item.menu.addMenuItem(remove);

		return {
			formatItems,
			item,
			kind: slot.kind,
			moveLeft,
			moveRight,
			showIcon,
			showLabel,
			sourceItems,
			visibility,
		};
	};

	const updateLayoutMenuEntry = (entry: LayoutMenuEntry, slot: LayoutSlot) => {
		entry.item.label.set_text(slotMenuTitle(slot));
		entry.visibility.setToggleState(slot.visible);
		entry.moveLeft.setSensitive(canMoveSlot(layout, slot.id, 'left'));
		entry.moveRight.setSensitive(canMoveSlot(layout, slot.id, 'right'));
		if (slot.kind !== 'metric') return;
		entry.showLabel?.setToggleState(slot.showLabel);
		entry.showIcon?.setToggleState(slot.showIcon);
		for (const option of metricFormatOptions[slot.metric]) {
			entry.formatItems
				.get(option.id)
				?.label.set_text(`${option.id === slot.format ? '✓ ' : ''}${option.label}`);
		}
		for (const [sourceId, source] of entry.sourceItems) {
			source.item.label.set_text(`${sourceId === slot.sourceId ? '✓ ' : ''}${source.label}`);
		}
	};

	const syncLayoutMenuEntries = (menu: Cinnamon.PopupMenu) => {
		const slotsById = new Map(layout.map((slot) => [slot.id, slot]));
		for (const [id, entry] of layoutMenuEntries) {
			const slot = slotsById.get(id);
			if (slot && slot.kind === entry.kind) continue;
			entry.item.destroy();
			layoutMenuEntries.delete(id);
		}
		for (const slot of layout) {
			if (layoutMenuEntries.has(slot.id)) continue;
			const entry = createLayoutMenuEntry(slot);
			layoutMenuEntries.set(slot.id, entry);
			menu.addMenuItem(entry.item);
		}

		if (layout.length > 0 && !layoutItemsEnd) {
			layoutItemsEnd = new PopupSeparatorMenuItem();
			menu.addMenuItem(layoutItemsEnd);
		} else if (layout.length === 0 && layoutItemsEnd) {
			layoutItemsEnd.destroy();
			layoutItemsEnd = null;
		}

		if (layoutItemsEnd && layoutResetItem) {
			menu.box.insert_child_below(layoutItemsEnd.actor, layoutResetItem.actor);
			let before = layoutItemsEnd.actor;
			for (let index = layout.length - 1; index >= 0; index -= 1) {
				const slot = layout[index]!;
				const entry = layoutMenuEntries.get(slot.id);
				if (!entry) continue;
				menu.box.insert_child_below(entry.item.actor, before);
				menu.box.insert_child_below(entry.item.menu.actor, before);
				before = entry.item.actor;
			}
		}
		for (const slot of layout) {
			const entry = layoutMenuEntries.get(slot.id);
			if (entry) updateLayoutMenuEntry(entry, slot);
		}
	};

	const rebuildLayoutMenu = (menu: Cinnamon.PopupMenu) => {
		menu.removeAll();
		layoutMenuEntries.clear();
		layoutItemsEnd = null;
		layoutResetItem = null;
		for (const slot of layout) {
			const entry = createLayoutMenuEntry(slot);
			layoutMenuEntries.set(slot.id, entry);
			menu.addMenuItem(entry.item);
		}
		if (layout.length > 0) {
			layoutItemsEnd = new PopupSeparatorMenuItem();
			menu.addMenuItem(layoutItemsEnd);
		}
		layoutResetItem = keepMenuOpen(new PopupMenuItem('重置当前布局'));
		layoutResetItem.connect('activate', () => saveLayout(defaultLayout));
		menu.addMenuItem(layoutResetItem);
		for (const slot of layout) {
			const entry = layoutMenuEntries.get(slot.id);
			if (entry) updateLayoutMenuEntry(entry, slot);
		}
	};

	const layoutMenu = new PopupSubMenuMenuItem('当前布局');
	rebuildLayoutMenu(layoutMenu.menu);
	syncLayoutMenu = () => {
		if (layoutMenuSyncTimeoutId !== null) return;
		layoutMenuSyncTimeoutId = scheduleTimeout(0, () => {
			layoutMenuSyncTimeoutId = null;
			syncLayoutMenuEntries(layoutMenu.menu);
		});
	};
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
		if (layoutMenuSyncTimeoutId !== null) cancelTimeout(layoutMenuSyncTimeoutId);
		settings.disconnect(iconStyleSignal);
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
