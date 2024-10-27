import {defineConfig} from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
	site: "https://matthewwid.github.io",
	base: "better-sse",
	integrations: [
		starlight({
			title: "Better SSE",
			social: {
				github: "https://github.com/MatthewWid/better-sse",
			},
			sidebar: [
				{
					label: "Guides",
					autogenerate: {directory: "guides"},
				},
				{
					label: "Reference",
					autogenerate: {directory: "reference"},
				},
			],
			customCss: ["./src/styles/custom.css"],
		}),
	],
});
