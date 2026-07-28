import { defaultInstanceConfig } from '../settings/instance-config';
import { loadAppletModule } from '../platform/cinnamon';

export interface AppletInstance {
	set_applet_label(label: string): void;
	set_applet_tooltip(tooltip: string): void;
}

export function createApplet(
	orientation: number,
	panelHeight: number,
	instanceId: number,
): AppletInstance {
	const { TextApplet } = loadAppletModule();
	const context = new TextApplet(orientation, panelHeight, instanceId);
	context.set_applet_label(`${defaultInstanceConfig.label} #${instanceId}`);
	context.set_applet_tooltip(defaultInstanceConfig.tooltip);
	return context;
}

export function main(
	_metadata: unknown,
	orientation: number,
	panelHeight: number,
	instanceId: number,
): AppletInstance {
	return createApplet(orientation, panelHeight, instanceId);
}
