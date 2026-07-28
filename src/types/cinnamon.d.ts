declare namespace Cinnamon {
	interface AppletMetadata {
		uuid: string;
		name: string;
	}

	interface TextAppletContext {
		set_applet_label(label: string): void;
		set_applet_tooltip(tooltip: string): void;
	}

	interface TextAppletConstructor {
		new (orientation: number, panelHeight: number, instanceId: number): TextAppletContext;
	}
}

declare const imports: {
	ui: {
		applet: {
			TextApplet: Cinnamon.TextAppletConstructor;
		};
	};
};
