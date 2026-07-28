export interface CinnamonAppletModule {
	TextApplet: Cinnamon.TextAppletConstructor;
}

export function loadAppletModule(): CinnamonAppletModule {
	return { TextApplet: imports.ui.applet.TextApplet };
}
