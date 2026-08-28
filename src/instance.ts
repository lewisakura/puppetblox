/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
