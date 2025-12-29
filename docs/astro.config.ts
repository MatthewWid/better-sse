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
					items: [
						"guides/getting-started",
						"guides/channels",
						"guides/batching",
						"guides/connection-adapters",
					],
				},
				{
					label: "Reference",
					items: [
						"reference/api",
						"reference/recipes",
						"reference/comparison",
						"reference/faq",
						{
							label: "Compatibility",
							items: [
								"reference/compatibility/server",
								"reference/compatibility/browser",
							],
						},
					],
				},
			],
			customCss: ["./src/styles/custom.css"],
		}),
	],
	redirects: {
		"/reference/browser-compatibility":
			"/better-sse/reference/compatibility/browser",
	},
});
