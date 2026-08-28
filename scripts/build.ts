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
