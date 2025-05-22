import { toBase64 } from "js-base64";
import { exportAsyncProxy } from "../common/exportAsyncProxy";
import { exportNodeAsBase64PNG, nodeHasImageFill } from "../common/images";
import { AltNode, ExportableNode } from "../interfaces/html";
import BlockElement from "../interfaces/pageElements/BlockElement";
import CommonPageElement, { PageElementStyles } from "../interfaces/pageElements/CommonPageElement";
import ElementImage, { BlockImage } from "../interfaces/pageElements/ElementImage";
import { randomString } from "../utils/function";
import { GreatClasses } from "../utils/great";
import { htmlAutoLayoutProps } from "./builderImpl/htmlAutoLayout";
import { HtmlDefaultBuilder, HtmlTextBuilder } from "./htmlDefaultBuilder";

export default class BlockBuilder {
	private block: BlockElement | null;
	private elements: CommonPageElement[];

	constructor() {
		this.elements = [];
		this.block = null;
	}

	async build(node: SceneNode & BaseFrameMixin) {
		this.block = null;
		this.elements = [];

		let additionalStyles: string[] = [];

		if (node.layoutMode !== "NONE") {
			additionalStyles = htmlAutoLayoutProps(node);
		}

		this.block = await this.parseBlock(node, additionalStyles);
		this.elements = await this.parseElements(
			(node.children as SceneNode[]).map((child) => ({ ...child, parent: { ...node, x: 0, y: 0 } })),
		);

		return {
			block: this.block,
			elements: this.elements,
		};
	}

	private async parseBlock(
		node: SceneNode & SceneNodeMixin & BlendMixin & LayoutMixin & GeometryMixin & MinimalBlendMixin,
		additionalStyles: string[] = [],
	): Promise<BlockElement> {
		const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();

		if (!builder.styles && !additionalStyles) {
			return {
				id: this.genBlockId(),
				isPopup: false,
				element: {
					boundingClientRect: {
						desktop: {
							width: node.width,
							height: node.height,
							left: 0,
							top: 0,
						},
						mobile: {
							width: node.width,
							height: node.height,
							left: 0,
							top: 0,
						},
					},
					order: 1,
					styles: {
						desktop: {},
						mobile: {},
					},
					classes: [],
				},
			};
		}

		let image: BlockImage | undefined = undefined;

		if (nodeHasImageFill(node)) {
			const altNode = node as AltNode<ExportableNode>;
			const hasChildren = "children" in node && node.children.length > 0;
			const imgUrl = (await exportNodeAsBase64PNG(altNode, hasChildren)) ?? "";

			image = {
				desktop: {
					file: imgUrl,
					dimensions: {
						height: node.height,
						width: node.width,
					},
				},
				mobile: {
					file: imgUrl,
					dimensions: {
						height: node.height,
						width: node.width,
					},
				},
			};
		}

		builder.addStyles(...additionalStyles);

		const styles = this.stylesToObj(builder.styles);

		return {
			image,
			isPopup: false,
			element: {
				boundingClientRect: {
					desktop: {
						width: node.width,
						height: node.height,
						left: 0,
						top: 0,
					},
					mobile: {
						width: node.width,
						height: node.height,
						left: 0,
						top: 0,
					},
				},
				order: 1,
				styles: styles,
				classes: [],
			},
			id: this.genBlockId(),
		};
	}

	private genBlockId() {
		return randomString(15);
	}

	private genElementId() {
		return "element_" + randomString(20);
	}

	private stylesToObj(styles: string[]): PageElementStyles {
		const stylesObj: PageElementStyles = {
			desktop: {},
			mobile: {},
		};

		for (const device of ["desktop", "mobile"] as (keyof PageElementStyles)[]) {
			styles.forEach((style) => {
				const [key, value] = style.split(":");
				stylesObj[device][key.trim()] = value.trim();
			});
		}

		return stylesObj;
	}

	private async parseElements(nodes: SceneNode[]): Promise<CommonPageElement[]> {
		const parsedElements: CommonPageElement[] = [];

		for (const element of nodes) {
			const parsedElement = await this.parseElement(element);

			if ((parsedElement as any).length || (parsedElement as any).length === 0) {
				parsedElements.push(...(parsedElement as CommonPageElement[]));
			} else parsedElements.push(parsedElement as CommonPageElement);
		}

		return parsedElements;
	}

	private async parseElement(node: SceneNode): Promise<CommonPageElement | CommonPageElement[]> {
		if (node.visible === false) {
			return [];
		}

		if (
			(node.width <= 0 || node.height <= 0) &&
			(node.type === "FRAME" ||
				node.type === "RECTANGLE" ||
				node.type === "ELLIPSE" ||
				node.type === "COMPONENT" ||
				node.type === "INSTANCE" ||
				node.type === "COMPONENT_SET")
		) {
			return [];
		}

		// ignore the view when size is zero or less

		if (node.parent && node.parent.type === "FRAME")
			console.log(
				`[DEBUG]`,
				node.type,
				node.name,
				{
					relative: {
						x: node.x,
						y: node.y,
						width: node.width,
						height: node.height,
					},
					absolute: {
						x: node.absoluteBoundingBox?.x,
						y: node.absoluteBoundingBox?.y,
						width: node.absoluteBoundingBox?.width,
						height: node.absoluteBoundingBox?.height,
					},
				},
				{
					relative: {
						x: node.parent?.x,
						y: node.parent?.y,
						width: node.parent?.width,
						height: node.parent?.height,
					},
					absolute: {
						x: node.parent?.absoluteBoundingBox?.x,
						y: node.parent?.absoluteBoundingBox?.y,
						width: node.parent?.absoluteBoundingBox?.width,
						height: node.parent?.absoluteBoundingBox?.height,
					},
				},
			);

		// overflow hidden
		if (
			node.parent &&
			node.parent.type === "FRAME" &&
			node.parent.clipsContent &&
			(node.x < 0 ||
				node.y < 0 ||
				node.x > node.parent.width ||
				node.y > node.parent.height ||
				node.x + node.width > node.parent.x + node.parent.width ||
				node.y + node.height > node.parent.y + node.parent.height)
		) {
			console.log(`[DEBUG] ${node.type} node is out of bounds`);

			return [];
		}

		if (node.parent && node.parent.type === "FRAME") {
			node.x = node.x + node.parent.x;
			node.y = node.y + node.parent.y;
		}

		if ((node as any).canBeFlattened) {
			const altNode = await this.renderAndAttachSVG(node);

			if (altNode.svg) {
				const svg = await this.parseSvg(altNode);

				console.log("svg", svg);

				if (svg) {
					return svg;
				}
			}
		}

		switch (node.type) {
			case "RECTANGLE":
			case "ELLIPSE":
				return await this.parseContainerElement(node);
			case "GROUP":
				node = { ...node, children: node.children.map((child) => ({ ...child, parent: { ...node } })) };
				return await this.parseElements(node.children as SceneNode[]);
			case "FRAME":
			case "COMPONENT":
			case "INSTANCE":
			case "COMPONENT_SET": {
				node = { ...node, children: node.children.map((child) => ({ ...child, parent: { ...node } })) };
				return [
					await this.parseContainerElement(node),
					...(await this.parseElements(node.children as SceneNode[])),
				];
			}
			case "SECTION":
				return await this.parseSectionElement(node);
			case "TEXT":
				return this.parseTextElement(node);
			case "LINE":
				return this.parseLineElement(node);
			case "VECTOR":
				return await this.parseContainerElement({ ...node, type: "RECTANGLE" } as any);
			// return [];
			default:
				console.log(`[DEBUG] ${node.type} node is not supported`);
				return [];
		}
	}

	private async parseLineElement(node: LineNode): Promise<CommonPageElement> {
		const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();

		const styles = this.stylesToObj(builder.styles);

		const dividerStyle = `%z-index% border-bottom: ${styles.desktop["outline"]}`;

		let content = `
  					<div
  						class="conteudo ${GreatClasses.DIVIDER}"
  						style="${dividerStyle}"
  					></div>`;

		content = this.cleanInnerHtml(content);

		const css = `#e_%element-id% .c{${dividerStyle}}`;

		const elementId = this.genElementId();

		return {
			id: elementId,
			blockId: this.block!.id,
			boundingClientRect: {
				desktop: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
				mobile: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
			},
			classes: this.getElementClasses(elementId, GreatClasses.DIVIDER),
			content: {
				desktop: content,
				mobile: content,
			},
			css: {
				desktop: css,
				mobile: css,
			},
			styles: styles,
		};
	}

	private async parseSvg(node: SceneNode): Promise<CommonPageElement | undefined> {
		if ((node as any).svg === "") return;

		const builder = new HtmlDefaultBuilder(node).addData("svg-wrapper").commonPositionStyles().commonShapeStyles();

		const image: ElementImage | undefined = {
			file: `data:image/svg+xml;base64,${toBase64(node.svg)}`,
			dimensions: {
				height: node.height,
				width: node.width,
			},
		};

		const styles = this.stylesToObj(builder.styles);

		const cssStyle = `
      opacity: ${styles.desktop.opacity ?? 1};
      border: ${styles.desktop.border ?? "0px"};
      filter: hue-rotate(0deg) saturate(1) brightness(1) contrast(1) invert(0) sepia(0) blur(0px) grayscale(0);
      border-radius: ${styles.desktop["border-radius"] ?? 0};
      background-image: ${image ? `url(${image.file})` : "none"};
      background-size: ${styles.desktop["background-size"] ?? "cover"};
      background-color: ${
			styles.desktop["background-color"] ??
			(styles.desktop["background"] && !styles.desktop["background"].includes("url(")
				? styles.desktop["background"]
				: "transparent")
		};
    	background-position: ${styles.desktop["background-position"] ?? "center"};
    	background-repeat: ${styles.desktop["background-repeat"] ?? "no-repeat"};
      width: 100%;
      height: ${node.height}px;
		 	%z-index%`;

		const css = `#e_%element-id% .c{${cssStyle}}`;

		let innerHtml = `<div
							class=\"conteudo ${GreatClasses.BOX} ${GreatClasses.EQUAL_BORDER} \"
							style=\"${cssStyle}\"></div>`;

		const id = this.genElementId();

		innerHtml = this.cleanInnerHtml(innerHtml);

		return {
			id: id,
			blockId: this.block!.id,
			boundingClientRect: {
				desktop: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
				mobile: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
			},
			classes: this.getElementClasses(id, GreatClasses.BOX),
			content: {
				desktop: innerHtml,
				mobile: innerHtml,
			},
			css: {
				desktop: css,
				mobile: css,
			},
			styles: styles,
			image,
		};
	}

	private async parseTextElement(node: SceneNode): Promise<CommonPageElement> {
		const layoutBuilder = new HtmlTextBuilder(node as TextNode)
			.commonPositionStyles()
			.textTrim()
			.textAlignHorizontal()
			.textAlignVertical();

		const styledHtml = layoutBuilder.getTextSegments(node as TextNode);

		let content = "";
		const itemsCss: string[] = [];
		const extractedStyles: { [key: string]: string }[] = [];

		if (styledHtml.length === 1) {
			layoutBuilder.addStyles(styledHtml[0].style);

			const styleObj = this.stylesToObj(styledHtml[0].style.split(";")).desktop;
			extractedStyles.push(styleObj);

			if (styleObj.color) {
				if (+styleObj["font-weight"] >= 700) {
					itemsCss.push(
						`#e_%element-id% .c > p:nth-of-type(1) > span:nth-of-type(1) b:nth-of-type(1) { color: ${styleObj.color}; }`,
					);
				} else {
					itemsCss.push(
						`#e_%element-id% .c > p:nth-of-type(1) > span:nth-of-type(1){ color: ${styleObj.color}; }`,
					);
				}
			}

			if (+styleObj["font-weight"] >= 700) {
				content = `<span><b>${styledHtml[0].text}</b></span>`;
			} else {
				content = `<span>${styledHtml[0].text}</span>`;
			}
		} else {
			content = styledHtml
				.map((style, index) => {
					const styleObj = this.stylesToObj(style.style.split(";")).desktop;
					extractedStyles.push(styleObj);

					if (styleObj.color) {
						if (+styleObj["font-weight"] >= 700) {
							itemsCss.push(
								`#e_%element-id% .c > p:nth-of-type(1) > span:nth-of-type(${
									index + 1
								}) b:nth-of-type(1) { color: ${styleObj.color}; }`,
							);
						} else {
							itemsCss.push(
								`#e_%element-id% .c > p:nth-of-type(1) > span:nth-of-type(${index + 1}){ color: ${
									styleObj.color
								}; }`,
							);
						}
					}

					if (+styleObj["font-weight"] >= 700) {
						return `<span ${styleObj.color ? `style="color: ${styleObj.color};"` : ""}><b>${
							style.text
						}</b></span>`;
					} else {
						return `<span ${styleObj.color ? `style="color: ${styleObj.color};"` : ""}>${
							style.text
						}</span>`;
					}
				})
				.join("");
		}

		content = content.replace(/<s>/g, "<strike>").replace(/<\/s>/, "</strike>");
		content = content.replace(/<underline>/, "<u>").replace(/<\/underline>/, "</u>");
		content = content.replace(/<strong>/, "<b>").replace(/<\/strong>/, "</b>");
		content = `<p>${content}</p>`;

		let fontSize, lineHeight, textAlign;

		const styles = this.stylesToObj(layoutBuilder.styles);

		if (styles.desktop["text-align"]) {
			textAlign = styles.desktop["text-align"];
		}

		const sizes: { [key: string]: number } = {};
		const lineHeights: { [key: string]: number } = {};

		for (const style of extractedStyles) {
			if (style["font-size"]) {
				if (sizes[style["font-size"]]) {
					sizes[style["font-size"]]++;
				} else {
					sizes[style["font-size"]] = 1;
				}
			}

			if (style["line-height"]) {
				if (lineHeights[style["line-height"]]) {
					lineHeights[style["line-height"]]++;
				} else {
					lineHeights[style["line-height"]] = 1;
				}
			}
		}

		if (Object.keys(sizes).length > 0) {
			const maxSize = Math.max(...Object.values(sizes));
			fontSize = Object.keys(sizes).find((key) => sizes[key] === maxSize);
		}

		if (Object.keys(lineHeights).length > 0) {
			const maxLineHeight = Math.max(...Object.values(lineHeights));
			lineHeight = Object.keys(lineHeights).find((key) => lineHeights[key] === maxLineHeight);
		}

		lineHeight = this.getTextLineHeight(lineHeight ?? "initial", fontSize ?? "16px");

		const cssStyles = `${fontSize ? `font-size: ${fontSize};` : ""} 
					${lineHeight ? `line-height: ${lineHeight};` : ""}
					${textAlign ? `text-align: ${textAlign}` : ""}
					 %z-index%`;

		content = `<div
				    class=\"conteudo ${GreatClasses.TEXT}\"
				    style=\"${cssStyles}">
							${content}
						</div>`;

		content = this.cleanInnerHtml(content);

		const elementId = this.genElementId();

		const css = `#e_%element-id% .c { ${cssStyles} } ${itemsCss.join(" ").replace(/strong:/, "b:")}`;

		return {
			id: elementId,
			blockId: this.block!.id,
			boundingClientRect: {
				desktop: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", "") - 3,
					top: +styles.desktop.top.replace("px", ""),
				},
				mobile: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", "") - 3,
					top: +styles.desktop.top.replace("px", ""),
				},
			},
			classes: this.getElementClasses(elementId, GreatClasses.TEXT),
			content: {
				desktop: content,
				mobile: content,
			},
			css: {
				desktop: css,
				mobile: css,
			},
			styles: styles,
		};
	}

	private getTextLineHeight(lineHeight: string, fontSize: string) {
		if (lineHeight == "initial") return "1.2";

		if (lineHeight.includes("px")) {
			let floatLineHeight = parseFloat(lineHeight.replace("px", "")) / parseFloat(fontSize);

			floatLineHeight = Math.ceil(floatLineHeight * 10) / 10;
			if (floatLineHeight < 1) floatLineHeight = 1.2;
			if (floatLineHeight > 2) floatLineHeight = 2;

			lineHeight = lineHeight.toString();
		}

		return lineHeight;
	}

	private async parseSectionElement(node: SectionNode): Promise<CommonPageElement[]> {
		const children = await this.parseElements(node.children as SceneNode[]);

		const builder = new HtmlDefaultBuilder(node).size().position().applyFillsToStyle(node.fills, "background");

		const styles = this.stylesToObj(builder.styles);

		const cssStyle = `
      opacity: 1;
      border: 0px;
      filter: hue-rotate(0deg) saturate(1) brightness(1) contrast(1) invert(0) sepia(0) blur(0px) grayscale(0);
      border-radius: 0;
      background-image: none;
      background-size: "cover";
      background-color: ${
			styles.desktop["background-color"] ??
			(styles.desktop["background"] && !styles.desktop["background"].includes("url(")
				? styles.desktop["background"]
				: "transparent")
		};
    	background-position: "center";
    	background-repeat: "no-repeat";
      width: 100%;
      height: ${node.height}px;
		 	%z-index%`;

		const css = `#e_%element-id% .c{${cssStyle}}`;

		let innerHtml = `<div
							class=\"conteudo ${GreatClasses.BOX} ${GreatClasses.EQUAL_BORDER} \"
							style=\"${cssStyle}\"></div>`;

		const id = this.genElementId();

		innerHtml = this.cleanInnerHtml(innerHtml);

		const section = {
			id: id,
			blockId: this.block!.id,
			boundingClientRect: {
				desktop: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
				mobile: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
			},
			classes: this.getElementClasses(id, GreatClasses.BOX),
			content: {
				desktop: innerHtml,
				mobile: innerHtml,
			},
			css: {
				desktop: css,
				mobile: css,
			},
			styles: styles,
		};

		return [...children, section];
	}

	private async parseContainerElement(
		node: SceneNode & SceneNodeMixin & BlendMixin & LayoutMixin & GeometryMixin & MinimalBlendMixin,
	): Promise<CommonPageElement> {
		const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();

		let image: ElementImage | undefined = undefined;

		if (builder.styles && nodeHasImageFill(node)) {
			const altNode = node as AltNode<ExportableNode>;
			const hasChildren = "children" in node && node.children.length > 0;
			const imgUrl = (await exportNodeAsBase64PNG(altNode, hasChildren)) ?? "";

			image = {
				file: imgUrl,
				dimensions: {
					height: node.height,
					width: node.width,
				},
			};
		}

		const styles = this.stylesToObj(builder.styles);

		const cssStyle = `
      opacity: ${styles.desktop.opacity ?? 1};
      border: ${styles.desktop.border ?? "0px"};
      filter: hue-rotate(0deg) saturate(1) brightness(1) contrast(1) invert(0) sepia(0) blur(0px) grayscale(0);
      border-radius: ${styles.desktop["border-radius"] ?? 0};
      background-image: ${image ? `url(${image.file})` : "none"};
      background-size: ${styles.desktop["background-size"] ?? "cover"};
      background-color: ${
			styles.desktop["background-color"] ??
			(styles.desktop["background"] && !styles.desktop["background"].includes("url(")
				? styles.desktop["background"]
				: "transparent")
		};
    	background-position: ${styles.desktop["background-position"] ?? "center"};
    	background-repeat: ${styles.desktop["background-repeat"] ?? "no-repeat"};
      width: 100%;
      height: ${node.height}px;
		 	%z-index%`;

		const css = `#e_%element-id% .c{${cssStyle}}`;

		let innerHtml = `<div
							class=\"conteudo ${GreatClasses.BOX} ${GreatClasses.EQUAL_BORDER} \"
							style=\"${cssStyle}\"></div>`;

		const id = this.genElementId();

		innerHtml = this.cleanInnerHtml(innerHtml);

		console.log(node.name, node.type, node.parent?.name, node.parent?.type, {
			boundingClientRect: {
				desktop: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
				mobile: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
			},
		});

		return {
			id: id,
			blockId: this.block!.id,
			boundingClientRect: {
				desktop: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
				mobile: {
					width: node.width,
					height: node.height,
					left: +styles.desktop.left.replace("px", ""),
					top: +styles.desktop.top.replace("px", ""),
				},
			},
			classes: this.getElementClasses(id, GreatClasses.BOX),
			content: {
				desktop: innerHtml,
				mobile: innerHtml,
			},
			css: {
				desktop: css,
				mobile: css,
			},
			styles: styles,
			image,
		};
	}

	private getElementClasses(elementId: string, elementClass: GreatClasses) {
		return `${GreatClasses.ELEMENT} ${elementClass} |-| #${elementId}#`;
	}

	private cleanInnerHtml(innerHtml: string): string {
		return (
			innerHtml
				.replace(/\t/gi, "")
				.replace(/\n/gi, " ")
				.replace(/ *<div/gi, "<div")
				.replace(/ *<\/div/gi, "</div")
				.replace(/ *<img/gi, "<img")
				.replace(/ *<label/gi, "<label")
				.replace(/ *<\/label/gi, "</label")
				.replace(/ *<input/gi, "<input")
				.replace(/ *<h1/gi, "<h1")
				.replace(/ *<\/h1/gi, "</h1")
				.replace(/ *<h2/gi, "<h2")
				.replace(/ *<\/h2/gi, "</h2")
				.replace(/ *<h3/gi, "<h3")
				.replace(/ *<\/h3/gi, "</h3")
				.replace(/ *<h4/gi, "<h4")
				.replace(/ *<\/h4/gi, "</h4")
				.replace(/ *<h5/gi, "<h5")
				.replace(/ *<\/h5/gi, "</h5")
				.replace(/ *<h6/gi, "<h6")
				.replace(/ *<\/h6/gi, "</h6")
				.replace(/ *<span/gi, "<span")
				.replace(/ *<\/span/gi, "</span")
				.replace(/<span> */gi, "<span>")
				.replace(/> *<p/gi, "><p")
				.replace(/> */gi, ">")
				// .replace(/<\/span><span/gi, "</span> <span")
				// .replace(/<\/b>/gi, "</b> ")
				.replace(/ {3}/gi, " ")
				.replace(/ {2}/, " ")
		);
	}

	private async renderAndAttachSVG(node: any) {
		if (node.canBeFlattened) {
			if (node.svg) {
				return node;
			}

			try {
				const svg = (await exportAsyncProxy<string>(node, {
					format: "SVG_STRING",
				})) as string;

				// Process the SVG to replace colors with variable references
				if (node.colorVariableMappings && node.colorVariableMappings.size > 0) {
					let processedSvg = svg;

					// Replace fill="COLOR" or stroke="COLOR" patterns
					const colorAttributeRegex = /(fill|stroke)="([^"]*)"/g;

					processedSvg = processedSvg.replace(colorAttributeRegex, (match, attribute, colorValue) => {
						// Clean up the color value and normalize it
						const normalizedColor = colorValue.toLowerCase().trim();

						// Look up the color directly in our mappings
						const mapping = node.colorVariableMappings.get(normalizedColor);
						if (mapping) {
							// If we have a variable reference, use it with fallback to original
							return `${attribute}="var(--${mapping.variableName}, ${colorValue})"`;
						}

						// Otherwise keep the original color
						return match;
					});

					// Also handle style attributes with fill: or stroke: properties
					const styleRegex = /style="([^"]*)(?:(fill|stroke):\s*([^;"]*))(;|\s|")([^"]*)"/g;

					processedSvg = processedSvg.replace(
						styleRegex,
						(match, prefix, property, colorValue, separator, suffix) => {
							// Clean up any extra spaces from the color value
							const normalizedColor = colorValue.toLowerCase().trim();

							// Look up the color directly in our mappings
							const mapping = node.colorVariableMappings.get(normalizedColor);
							if (mapping) {
								// Replace just the color value with the variable and fallback
								return `style="${prefix}${property}: var(--${mapping.variableName}, ${colorValue})${separator}${suffix}"`;
							}

							return match;
						},
					);

					node.svg = processedSvg;
				} else {
					node.svg = svg;
				}
			} catch (error) {
				console.error(`Error rendering SVG for ${node.type}:${node.id}`);
				console.error(error);
			}
		}
		return node;
	}
}
