import type {
	MetricId,
	MetricRef,
	MetricSample,
	TelemetrySnapshot,
} from '../telemetry/metrics/metric-sample';
import type { IconStyle } from '../presentation/layout';

export interface DetailPage {
	readonly item: Cinnamon.PopupMenuItem;
	readonly ref: MetricRef;
	readonly tabLabel: string;
	setVisible(visible: boolean): void;
	update(snapshot: TelemetrySnapshot): void;
}

export interface DetailPageContext {
	readonly Gio: Cinnamon.GioModule;
	readonly PopupBaseMenuItem: Cinnamon.PopupBaseMenuItemConstructor;
	readonly St: Cinnamon.StModule;
	readonly iconStyle: IconStyle;
	readonly maxContentHeight: number;
	readonly metadataPath: string;
	readonly getHistory: <K extends MetricId>(
		ref: MetricRef<K>,
		from?: number,
		to?: number,
	) => readonly MetricSample<K>[];
}

export interface DetailPageDefinition<K extends MetricId = MetricId> {
	readonly iconName: 'cpu' | 'memory' | 'temperature' | 'fan' | 'gpu' | 'network' | null;
	readonly metricId: K;
	readonly title: string;
	create(ref: MetricRef<K>, context: DetailPageContext): DetailPage;
}
