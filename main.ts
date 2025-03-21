import {
	Plugin,
	parseYaml,
	MarkdownRenderer,
	MarkdownRenderChild,
	sanitizeHTMLToDom,
} from "obsidian";
import { template } from "@zhouhua-dev/remark-media-card";
import { loadAllLocales } from "./i18n/i18n-util.sync";
import { i18n } from "./i18n/i18n-util";
import { Locales } from "./i18n/i18n-types";

loadAllLocales();

let locale: Locales = "en";
try {
	// @ts-ignore
	locale = /^zh/.test(global?.i18next?.language || "") ? "zh" : "en";
} catch (e) {
	/* empty */
}

const L = i18n()[locale];

function appendErrorMsg(el: HTMLElement) {
	const container = el.querySelector("pre.language-yaml");
	if (container) {
		container.createEl("div", {
			cls: "error-msg",
			text: L.invalid(),
		});
	}
}

async function calcImageUrl(path: string, sourcePath: string) {
	try {
		const div = createDiv();
		await MarkdownRenderer.render(
			this.app,
			`![](${path})`,
			div,
			sourcePath,
			new MarkdownRenderChild(div)
		);
		return div.find("img").getAttribute("src");
	} catch (e) {
		return path;
	}
}

// 新增函数：处理 Obsidian 内部链接
async function processObsidianUrl(url: string, sourcePath: string) {
	// 检查是否是 Obsidian 内部链接（以 "obsidian://" 开头或者是相对路径）
	if (url.startsWith("obsidian://") || (!url.startsWith("http://") && !url.startsWith("https://") && url.trim() !== "")) {
		try {
			const div = createDiv();
			await MarkdownRenderer.render(
				this.app,
				`[link](${url})`,
				div,
				sourcePath,
				new MarkdownRenderChild(div)
			);
			const link = div.find("a");
			if (link) {
				return link.getAttribute("href");
			}
		} catch (e) {
			console.error("处理 Obsidian 链接时出错:", e);
		}
	}
	return url;
}

export default class MediaCardPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor(
			"media-card",
			async (source, el, ctx) => {
				el.addClass("markdown-media-card-render");
				try {
					const data = parseYaml(source);
					
					// 处理封面图片
					if (data.cover) {
						data.cover = await calcImageUrl.call(this, data.cover, ctx.sourcePath);
					}
					
					// 处理链接 URL
					if (data.url) {
						data.url = await processObsidianUrl.call(this, data.url, ctx.sourcePath);
					}
					
					const html = template(data);
					const fragment = sanitizeHTMLToDom(html);
					el.appendChild(fragment);
				} catch (e) {
					MarkdownRenderer.render(
						this.app,
						["```yaml", source, "```"].join("\n"),
						el,
						ctx.sourcePath,
						new MarkdownRenderChild(el)
					);
					appendErrorMsg(el);
				}
			}
		);
	}

	onunload() {}
}
