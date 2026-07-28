export interface CinnamonAppletModule {
	AllowedLayout: Cinnamon.AllowedLayout;
	AppletPopupMenu: Cinnamon.AppletPopupMenuConstructor;
	TextApplet: Cinnamon.TextAppletConstructor;
}

export interface CinnamonSettingsModule {
	AppletSettings: Cinnamon.AppletSettingsConstructor;
}

export interface CinnamonPopupMenuModule {
	PopupBaseMenuItem: Cinnamon.PopupBaseMenuItemConstructor;
	PopupMenuManager: Cinnamon.PopupMenuManagerConstructor;
	PopupMenuItem: Cinnamon.PopupMenuItemConstructor;
	PopupSeparatorMenuItem: Cinnamon.PopupSeparatorMenuItemConstructor;
	PopupSubMenuMenuItem: Cinnamon.PopupSubMenuMenuItemConstructor;
	PopupSwitchMenuItem: Cinnamon.PopupSwitchMenuItemConstructor;
}

export interface CinnamonUiToolkit {
	Gio: Cinnamon.GioModule;
	St: Cinnamon.StModule;
}

export function loadAppletModule(): CinnamonAppletModule {
	return {
		AllowedLayout: imports.ui.applet.AllowedLayout,
		AppletPopupMenu: imports.ui.applet.AppletPopupMenu,
		TextApplet: imports.ui.applet.TextApplet,
	};
}

export function loadSettingsModule(): CinnamonSettingsModule {
	return { AppletSettings: imports.ui.settings.AppletSettings };
}

export function loadPopupMenuModule(): CinnamonPopupMenuModule {
	return {
		PopupBaseMenuItem: imports.ui.popupMenu.PopupBaseMenuItem,
		PopupMenuManager: imports.ui.popupMenu.PopupMenuManager,
		PopupMenuItem: imports.ui.popupMenu.PopupMenuItem,
		PopupSeparatorMenuItem: imports.ui.popupMenu.PopupSeparatorMenuItem,
		PopupSubMenuMenuItem: imports.ui.popupMenu.PopupSubMenuMenuItem,
		PopupSwitchMenuItem: imports.ui.popupMenu.PopupSwitchMenuItem,
	};
}

export function loadUiToolkit(): CinnamonUiToolkit {
	return { Gio: imports.gi.Gio, St: imports.gi.St };
}

export function getWorkAreaHeight(actor: Cinnamon.StActor): number {
	const monitor = imports.ui.main.layoutManager.findMonitorForActor(actor);
	const workspace = global.workspace_manager.get_active_workspace();
	const workArea = workspace.get_work_area_for_monitor(monitor.index);
	return Math.floor(workArea.height / global.ui_scale);
}
