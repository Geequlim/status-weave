export function readTextFile(path: string): Promise<string> {
	const file = imports.gi.Gio.file_new_for_path(path);
	return new Promise((resolve, reject) => {
		file.load_contents_async(null, (source, result) => {
			try {
				const [success, contents] = source.load_contents_finish(result);
				if (!success) {
					reject(new Error(`Unable to read ${path}`));
					return;
				}
				resolve(imports.byteArray.toString(contents));
			} catch (error) {
				reject(error);
			}
		});
	});
}

export function executeCommand(command: string, args: readonly string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		let process: Cinnamon.GioSubprocess;
		try {
			process = imports.gi.Gio.Subprocess.new(
				[command, ...args],
				imports.gi.Gio.SubprocessFlags.STDOUT_PIPE |
					imports.gi.Gio.SubprocessFlags.STDERR_PIPE,
			);
		} catch (error) {
			reject(error);
			return;
		}
		process.communicate_utf8_async(null, null, (source, result) => {
			try {
				const [, stdout, stderr] = source.communicate_utf8_finish(result);
				if (!source.get_successful()) {
					reject(new Error(stderr?.trim() || `${command} failed`));
					return;
				}
				resolve(stdout ?? '');
			} catch (error) {
				reject(error);
			}
		});
	});
}

export function scheduleTimeout(milliseconds: number, callback: () => void): number {
	return imports.mainloop.timeout_add(milliseconds, () => {
		callback();
		return false;
	});
}

export function cancelTimeout(id: number): void {
	imports.mainloop.source_remove(id);
}
