declare namespace Cinnamon {
	interface AllowedLayout {
		readonly BOTH: string;
		readonly HORIZONTAL: string;
		readonly VERTICAL: string;
	}

	interface AppletMetadata {
		uuid: string;
		name: string;
		path: string;
	}

	interface TextAppletContext {
		_applet_context_menu: PopupMenu;
		_applet_label: StLabel;
		_layoutBin: StBin;
		actor: StActor;
		getPanelIconSize(iconType: number): number | undefined;
		on_applet_clicked(event?: unknown): void;
		on_applet_removed_from_panel(deleteConfig?: boolean): void;
		on_orientation_changed(orientation: number): void;
		setAllowedLayout(layout: string): void;
		set_applet_label(label: string): void;
		set_applet_tooltip(tooltip: string): void;
	}

	interface TextAppletConstructor {
		new (orientation: number, panelHeight: number, instanceId: number): TextAppletContext;
	}

	interface SignalEmitter {
		connect(signal: string, callback: (...args: unknown[]) => void): number;
		disconnect(id: number): void;
		emit(signal: string, ...args: unknown[]): void;
	}

	interface PopupMenu extends SignalEmitter {
		addMenuItem(item: PopupMenuItem): void;
		destroy(): void;
		removeAll(): void;
		toggle(): void;
	}

	interface PopupMenuItem extends SignalEmitter {
		readonly actor: StActor;
		activate(event?: unknown, keepMenu?: boolean): void;
		addActor(
			actor: StActor,
			params?: { align?: number; expand?: boolean; span?: number },
		): void;
		setSensitive(sensitive: boolean): void;
	}

	interface PopupSubMenuItem extends PopupMenuItem {
		menu: PopupMenu;
	}

	interface PopupSwitchMenuItem extends PopupMenuItem {
		readonly state: boolean;
	}

	interface PopupMenuItemConstructor {
		new (label: string): PopupMenuItem;
	}

	interface PopupBaseMenuItemConstructor {
		new (params?: { activate?: boolean; hover?: boolean; reactive?: boolean }): PopupMenuItem;
	}

	interface AppletPopupMenuConstructor {
		new (context: TextAppletContext, orientation: number): PopupMenu;
	}

	interface PopupMenuManager {
		addMenu(menu: PopupMenu): void;
		removeMenu(menu: PopupMenu): void;
	}

	interface PopupMenuManagerConstructor {
		new (context: TextAppletContext): PopupMenuManager;
	}

	interface PopupSeparatorMenuItemConstructor {
		new (): PopupMenuItem;
	}

	interface PopupSubMenuMenuItemConstructor {
		new (label: string): PopupSubMenuItem;
	}

	interface PopupSwitchMenuItemConstructor {
		new (label: string, active: boolean): PopupSwitchMenuItem;
	}

	interface AppletSettings extends SignalEmitter {
		finalize(): void;
		getValue(key: string): unknown;
		setValue(key: string, value: unknown): void;
	}

	interface AppletSettingsConstructor {
		new (context: TextAppletContext, uuid: string, instanceId: number): AppletSettings;
	}

	interface StActor extends SignalEmitter {
		add_style_class_name(name: string): void;
		add_style_pseudo_class(name: string): void;
		add_child(child: StActor): void;
		destroy_all_children(): void;
		hide(): void;
		remove_style_pseudo_class(name: string): void;
		remove_style_class_name(name: string): void;
		set_style(style: string): void;
		show(): void;
	}

	interface StBin extends StActor {
		set_child(child: StActor): void;
	}

	interface StBinConstructor {
		new (properties?: { x_align?: number; x_expand?: boolean }): StBin;
	}

	interface StLabel extends StActor {
		set_text(text: string): void;
	}

	interface StBoxLayout extends StActor {}

	interface StButton extends StActor {
		set_child(child: StActor): void;
	}

	interface StIcon extends StActor {}

	interface StLabelConstructor {
		new (properties: {
			text: string;
			style_class?: string;
			x_align?: number;
			x_expand?: boolean;
		}): StLabel;
	}

	interface StBoxLayoutConstructor {
		new (properties?: {
			style_class?: string;
			vertical?: boolean;
			x_expand?: boolean;
		}): StBoxLayout;
	}

	interface StButtonConstructor {
		new (properties?: {
			can_focus?: boolean;
			reactive?: boolean;
			style_class?: string;
		}): StButton;
	}

	interface StIconConstructor {
		new (properties: {
			gicon: unknown;
			icon_size: number;
			icon_type: number;
			style_class?: string;
		}): StIcon;
	}

	interface StScrollView extends StActor {
		add_actor(actor: StActor): void;
		set_policy(horizontal: number, vertical: number): void;
	}

	interface StScrollViewConstructor {
		new (properties?: { style_class?: string }): StScrollView;
	}

	interface GioModule {
		FileIcon: {
			new (properties: { file: GioFile }): unknown;
		};
		Subprocess: {
			new: (argv: string[], flags: number) => GioSubprocess;
		};
		SubprocessFlags: {
			STDERR_PIPE: number;
			STDOUT_PIPE: number;
		};
		file_new_for_path(path: string): GioFile;
	}

	interface StModule {
		Align: {
			END: number;
		};
		BoxLayout: StBoxLayoutConstructor;
		Bin: StBinConstructor;
		Button: StButtonConstructor;
		Icon: StIconConstructor;
		IconType: {
			SYMBOLIC: number;
		};
		Label: StLabelConstructor;
		PolicyType: {
			AUTOMATIC: number;
			NEVER: number;
		};
		Side: {
			BOTTOM: number;
		};
		ScrollView: StScrollViewConstructor;
	}
}

declare const imports: {
	byteArray: {
		toString(contents: Uint8Array): string;
	};
	gi: {
		Gio: Cinnamon.GioModule;
		St: Cinnamon.StModule;
	};
	mainloop: {
		source_remove(id: number): void;
		timeout_add(milliseconds: number, callback: () => boolean): number;
	};
	ui: {
		applet: {
			AllowedLayout: Cinnamon.AllowedLayout;
			AppletPopupMenu: Cinnamon.AppletPopupMenuConstructor;
			TextApplet: Cinnamon.TextAppletConstructor;
		};
		main: {
			layoutManager: {
				findMonitorForActor(actor: Cinnamon.StActor): {
					index: number;
				};
			};
		};
		popupMenu: {
			PopupBaseMenuItem: Cinnamon.PopupBaseMenuItemConstructor;
			PopupMenuManager: Cinnamon.PopupMenuManagerConstructor;
			PopupMenuItem: Cinnamon.PopupMenuItemConstructor;
			PopupSeparatorMenuItem: Cinnamon.PopupSeparatorMenuItemConstructor;
			PopupSubMenuMenuItem: Cinnamon.PopupSubMenuMenuItemConstructor;
			PopupSwitchMenuItem: Cinnamon.PopupSwitchMenuItemConstructor;
		};
		settings: {
			AppletSettings: Cinnamon.AppletSettingsConstructor;
		};
	};
};

declare const global: {
	log(message: string): void;
	logError(message: string): void;
	ui_scale: number;
	workspace_manager: {
		get_active_workspace(): {
			get_work_area_for_monitor(index: number): {
				height: number;
			};
		};
	};
};

declare namespace Cinnamon {
	interface GioFile {
		load_contents_async(
			cancellable: null,
			callback: (source: GioFile, result: unknown) => void,
		): void;
		load_contents_finish(result: unknown): [boolean, Uint8Array];
	}

	interface GioSubprocess {
		communicate_utf8_async(
			stdinBuffer: string | null,
			cancellable: null,
			callback: (source: GioSubprocess, result: unknown) => void,
		): void;
		communicate_utf8_finish(result: unknown): [boolean, string | null, string | null];
		get_successful(): boolean;
	}
}
