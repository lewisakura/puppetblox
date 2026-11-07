/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { InstanceHandle } from "./instance.js";

export class StudioMCPError extends Error {}

const TAG = "--[[escaped]]";

function luauEscape(expr: any): string {
	if (expr === undefined || expr === null) return `${TAG}nil`;

	switch (typeof expr) {
		case "number":
		case "boolean":
			return `${TAG}${expr}`;

		case "string":
			return `${TAG}[=====[${expr}]=====]`;

		case "object":
			if (expr instanceof InstanceHandle) {
				// instance paths start from `game.` but don't include it
				return `${TAG}(game.${expr.instance_path})`;
			}
			// fallthrough
		default:
			return `${TAG}game:GetService("HttpService"):JSONDecode(${luauEscape(JSON.stringify(expr))})`;
	}
}

/**
 * Allows interpolation of variables into Luau code safely. Use as a tagged template.
 *
 * @param strings The strings.
 * @param exps The expressions.
 * @returns A safe Luau string.
 */
export function luau(strings: TemplateStringsArray, ...exps: any[]) {
	return strings.reduce((result, str, i) => {
		return `${result}${str}${exps[i] ? luauEscape(exps[i]) : ""}`;
	}, "");
}
