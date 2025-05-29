import starlight from "@astrojs/starlight";
import {defineConfig} from "astro/config";

export default defineConfig({
	site: "https://matthewwid.github.io",
	base: "better-sse",
	integrations: [
		starlight({
			title: "Better SSE",
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/MatthewWid/better-sse",
				},
			],
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
