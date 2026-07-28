export interface HistoryRetention {
	readonly maxAgeMilliseconds: number;
	readonly maxSamples: number;
}

export interface Timestamped {
	readonly sampledAt: number;
}

export class HistoryBuffer<T extends Timestamped> {
	private readonly values: Array<T | undefined>;
	private length = 0;
	private start = 0;

	constructor(private readonly retention: HistoryRetention) {
		if (retention.maxAgeMilliseconds <= 0 || retention.maxSamples <= 0) {
			throw new Error('History retention limits must be positive');
		}
		this.values = new Array<T | undefined>(retention.maxSamples);
	}

	append(value: T): void {
		const index = (this.start + this.length) % this.values.length;
		this.values[index] = value;
		if (this.length === this.values.length) {
			this.start = (this.start + 1) % this.values.length;
		} else {
			this.length += 1;
		}
		this.pruneBefore(value.sampledAt - this.retention.maxAgeMilliseconds);
	}

	query(from = Number.NEGATIVE_INFINITY, to = Number.POSITIVE_INFINITY): readonly T[] {
		const result: T[] = [];
		for (let offset = 0; offset < this.length; offset += 1) {
			const value = this.values[(this.start + offset) % this.values.length];
			if (value && value.sampledAt >= from && value.sampledAt <= to) result.push(value);
		}
		return result;
	}

	private pruneBefore(timestamp: number): void {
		while (this.length > 0) {
			const oldest = this.values[this.start];
			if (!oldest || oldest.sampledAt >= timestamp) break;
			this.values[this.start] = undefined;
			this.start = (this.start + 1) % this.values.length;
			this.length -= 1;
		}
	}
}
