/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { build } from "esbuild";

await build({
	entryPoints: ["./src/index.ts"],

	platform: "node",
	format: "esm",
	outdir: "./lib",
	packages: "external",

	bundle: true,
	minifyWhitespace: true,

	loader: {
		".luau": "text",
	},
});
