import { Studio } from "./studio.js";

export class InstanceHandle {
	#studio: Studio;

	instance_path: string;
	class_name: string;

	constructor(studio: Studio, path: string, className: string) {
		this.#studio = studio;

		this.instance_path = path;
		this.class_name = className;
	}

	async getProperty(key: string): Promise<any> {
		const result = await this.#studio.inspectInstance(this.instance_path);

		return result.properties[key];
	}

	get [Symbol.toStringTag]() {
		return "InstanceHandle";
	}
}
