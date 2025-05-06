import { indentString } from "../common/indentString";
import { HtmlTextBuilder } from "./htmlTextBuilder";
import { HtmlDefaultBuilder } from "./htmlDefaultBuilder";
import { htmlAutoLayoutProps } from "./builderImpl/htmlAutoLayout";
import { formatWithJSX } from "../common/parseJSX";
import { getVisibleNodes } from "../common/nodeVisibility";
import { exportNodeAsBase64PNG, nodeHasImageFill } from "../common/images";
import { addWarning } from "../common/commonConversionWarnings";
import { renderAndAttachSVG } from "../node/nodeUtils";
import { AltNode, ExportableNode, HTMLPreview } from "../interfaces/html";

const selfClosingTags = ["img"];

export let isPreviewGlobal = false;

let previousExecutionCache: { style: string; text: string }[];

// Define better type for the output
export interface HtmlOutput {
	html: string;
	css?: string;
}

// Define HTML generation modes for better type safety
export type HtmlGenerationMode = "html" | "jsx" | "styled-components" | "svelte";

// CSS Collection for external stylesheet or styled-components
interface CSSCollection {
	[className: string]: {
		styles: string[];
		nodeName?: string;
		nodeType?: string;
		element?: string; // Base HTML element to use
	};
}

export let cssCollection: CSSCollection = {};

// Instance counters for class name generation - we keep this but primarily as a fallback
const classNameCounters: Map<string, number> = new Map();

// Generate a class name - prefer direct uniqueId, but fall back to counter-based if needed
export function generateUniqueClassName(prefix = "figma"): string {
	// Sanitize the prefix to ensure valid CSS class
	const sanitizedPrefix =
		prefix.replace(/[^a-zA-Z0-9_-]/g, "").replace(/^[0-9_-]/, "f") || // Ensure it doesn't start with a number or special char
		"figma";

	// Most of the time, we'll just use the prefix directly as it's pre-generated to be unique
	// But keep the counter logic as a fallback
	const count = classNameCounters.get(sanitizedPrefix) || 0;
	classNameCounters.set(sanitizedPrefix, count + 1);

	// Only add suffix if this isn't the first instance
	return count === 0 ? sanitizedPrefix : `${sanitizedPrefix}_${count.toString().padStart(2, "0")}`;
}

// Reset all class name counters - call this at the start of processing
export function resetClassNameCounters(): void {
	classNameCounters.clear();
}

// Convert styles to CSS format
export function stylesToCSS(styles: string[], isJSX: boolean): string[] {
	return styles
		.map((style) => {
			// Skip empty styles
			if (!style.trim()) return "";

			// Handle JSX format if needed
			if (isJSX) {
				return style.replace(/^([a-zA-Z0-9]+):/, (match, prop) => {
					// Convert camelCase to kebab-case for CSS
					return prop.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2").toLowerCase() + ":";
				});
			}
			return style;
		})
		.filter(Boolean); // Remove empty entries
}

// Get proper component name from node info
export function getComponentName(node: any, className?: string, nodeType = "div"): string {
	// Start with Styled prefix
	let name = "Styled";

	// Use uniqueName if available, otherwise use name
	const nodeName: string = node.uniqueName || node.name;

	// Try to use node name first
	if (nodeName && nodeName.length > 0) {
		// Clean up the node name and capitalize first letter
		const cleanName = nodeName.replace(/[^a-zA-Z0-9]/g, "").replace(/^[a-z]/, (match) => match.toUpperCase());

		name += cleanName || nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
	}
	// Fall back to className if provided
	else if (className) {
		const parts = className.split("-");
		if (parts.length > 0 && parts[0]) {
			name += parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
		} else {
			name += nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
		}
	}
	// Last resort
	else {
		name += nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
	}

	return name;
}

// Get the collected CSS as a string with improved formatting
export function getCollectedCSS(): string {
	if (Object.keys(cssCollection).length === 0) {
		return "";
	}

	return Object.entries(cssCollection)
		.map(([className, { styles }]) => {
			if (!styles.length) return "";
			return `.${className} {\n  ${styles.join(";\n  ")}${styles.length ? ";" : ""}\n}`;
		})
		.filter(Boolean)
		.join("\n\n");
}

// Generate styled-components with improved naming and formatting
export function generateStyledComponents(): string {
	const components: string[] = [];

	Object.entries(cssCollection).forEach(([className, { styles, nodeName, nodeType, element }]) => {
		// Skip if no styles
		if (!styles.length) return;

		// Determine base HTML element - defaults to div
		const baseElement = element || (nodeType === "TEXT" ? "p" : "div");
		const componentName = getComponentName({ name: nodeName }, className, baseElement);

		const styledComponent = `const ${componentName} = styled.${baseElement}\`
  ${styles.join(";\n  ")}${styles.length ? ";" : ""}
\`;`;

		components.push(styledComponent);
	});

	if (components.length === 0) {
		return "";
	}

	return `${components.join("\n\n")}`;
}

// Get a valid React component name from a layer name
export function getReactComponentName(node: any): string {
	// Use uniqueName if available, otherwise use name
	const name: string = node?.uniqueName || node?.name;

	// Default name if nothing valid is provided
	if (!name || name.trim() === "") {
		return "App";
	}

	// Convert to PascalCase
	let componentName = name
		.replace(/[^a-zA-Z0-9_]/g, " ") // Replace non-alphanumeric chars with spaces
		.split(/\s+/) // Split by spaces
		.map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
		.join("");

	// Ensure it starts with uppercase letter (React component convention)
	componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

	// Ensure it's a valid identifier - if it starts with a number, prefix with 'Component'
	if (/^[0-9]/.test(componentName)) {
		componentName = "Component" + componentName;
	}

	// If we ended up with nothing valid, use the default
	return componentName || "App";
}

// Get a Svelte-friendly component name
export function getSvelteElementName(elementType: string, nodeName?: string): string {
	// For Svelte, use semantic element names where possible
	if (elementType === "TEXT" || elementType === "p") {
		return "p";
	} else if (elementType === "img" || elementType === "IMAGE") {
		return "img";
	} else if (nodeName && (nodeName.toLowerCase().includes("button") || nodeName.toLowerCase().includes("btn"))) {
		return "button";
	} else if (nodeName && nodeName.toLowerCase().includes("link")) {
		return "a";
	} else {
		return "div"; // Default element
	}
}

// Generate semantic class names for Svelte
export function getSvelteClassName(prefix?: string, nodeType?: string): string {
	if (!prefix) {
		return nodeType?.toLowerCase() || "element";
	}

	// Clean and format the prefix
	return prefix
		.replace(/[^a-zA-Z0-9_-]/g, "-")
		.replace(/-{2,}/g, "-") // Replace multiple hyphens with a single one
		.replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
		.toLowerCase();
}

export const htmlMain = async (sceneNode: Array<SceneNode>, isPreview: boolean = false): Promise<HtmlOutput> => {
	isPreviewGlobal = isPreview;
	previousExecutionCache = [];
	cssCollection = {};
	resetClassNameCounters(); // Reset counters for each new generation

	let htmlContent = await htmlWidgetGenerator(sceneNode);

	// remove the initial \n that is made in Container.
	if (htmlContent.length > 0 && htmlContent.startsWith("\n")) {
		htmlContent = htmlContent.slice(1, htmlContent.length);
	}

	// Always return an object with html property
	const output: HtmlOutput = { html: htmlContent };

	if (Object.keys(cssCollection).length > 0) {
		// For plain HTML with CSS, include CSS separately
		output.css = getCollectedCSS();
	}

	return output;
};

export const generateHTMLPreview = async (nodes: SceneNode[]): Promise<HTMLPreview> => {
	let result = await htmlMain(
		nodes,

		nodes.length > 1 ? false : true,
	);

	if (nodes.length > 1) {
		result.html = `<div style="width: 100%; height: 100%">${result.html}</div>`;
	}

	return {
		size: {
			width: Math.max(...nodes.map((node) => node.width)),
			height: nodes.reduce((sum, node) => sum + node.height, 0),
		},
		content: result.html,
	};
};

const htmlWidgetGenerator = async (sceneNode: ReadonlyArray<SceneNode>): Promise<string> => {
	// filter non visible nodes. This is necessary at this step because conversion already happened.
	const promiseOfConvertedCode = getVisibleNodes(sceneNode).map(convertNode());
	const code = (await Promise.all(promiseOfConvertedCode)).join("");
	return code;
};

const convertNode = () => async (node: SceneNode) => {
	if ((node as any).canBeFlattened) {
		const altNode = await renderAndAttachSVG(node);
		if (altNode.svg) {
			return htmlWrapSVG(altNode);
		}
	}

	switch (node.type) {
		case "RECTANGLE":
		case "ELLIPSE":
			return await htmlContainer(node, "", []);
		case "GROUP":
			return await htmlGroup(node);
		case "FRAME":
		case "COMPONENT":
		case "INSTANCE":
		case "COMPONENT_SET":
			return await htmlFrame(node);
		case "SECTION":
			return await htmlSection(node);
		case "TEXT":
			return htmlText(node);
		case "LINE":
			return htmlLine(node);
		case "VECTOR":
			if (!isPreviewGlobal) {
				addWarning("Vector is not supported");
			}
			return await htmlContainer({ ...node, type: "RECTANGLE" } as any, "", []);
		default:
			addWarning(`${node.type} node is not supported`);
			return "";
	}
};

const htmlWrapSVG = (node: AltNode<SceneNode>): string => {
	if (node.svg === "") return "";

	const builder = new HtmlDefaultBuilder(node).addData("svg-wrapper").position();

	// The SVG content already has the var() references, so we don't need
	// to add inline CSS variables in most cases. The browser will use the fallbacks
	// if the variables aren't defined in the CSS.

	return `\n<div${builder.build()}>\n${node.svg ?? ""}</div>`;
};

const htmlGroup = async (node: GroupNode): Promise<string> => {
	// ignore the view when size is zero or less
	// while technically it shouldn't get less than 0, due to rounding errors,
	// it can get to values like: -0.000004196293048153166
	// also ignore if there are no children inside, which makes no sense
	if (node.width < 0 || node.height <= 0 || node.children.length === 0) {
		return "";
	}

	// this needs to be called after CustomNode because widthHeight depends on it
	const builder = new HtmlDefaultBuilder(node).commonPositionStyles();

	if (builder.styles) {
		const attr = builder.build();
		const generator = await htmlWidgetGenerator(node.children);
		return `\n<div${attr}>${indentString(generator)}\n</div>`;
	}
	return await htmlWidgetGenerator(node.children);
};

// For htmlText and htmlContainer, use the htmlGenerationMode to determine styling approach
const htmlText = (node: TextNode): string => {
	let layoutBuilder = new HtmlTextBuilder(node)
		.commonPositionStyles()
		.textTrim()
		.textAlignHorizontal()
		.textAlignVertical();

	const styledHtml = layoutBuilder.getTextSegments(node);
	previousExecutionCache.push(...styledHtml);

	// Standard HTML/CSS approach for HTML, React or Svelte
	let content = "";
	if (styledHtml.length === 1) {
		// For HTML and React modes, we use inline styles
		layoutBuilder.addStyles(styledHtml[0].style);

		content = styledHtml[0].text;

		const additionalTag =
			styledHtml[0].openTypeFeatures.SUBS === true
				? "sub"
				: styledHtml[0].openTypeFeatures.SUPS === true
				? "sup"
				: "";

		if (additionalTag) {
			content = `<${additionalTag}>${content}</${additionalTag}>`;
		}
	} else {
		content = styledHtml
			.map((style) => {
				// Always use span for multi-segment text in Svelte mode
				const tag =
					style.openTypeFeatures.SUBS === true
						? "sub"
						: style.openTypeFeatures.SUPS === true
						? "sup"
						: "span";

				return `<${tag} style="${style.style}">${style.text}</${tag}>`;
			})
			.join("");
	}

	// Always use div as container to be consistent with styled-components
	return `\n<div${layoutBuilder.build()}>${content}</div>`;
};

const htmlFrame = async (node: SceneNode & BaseFrameMixin): Promise<string> => {
	const childrenStr = await htmlWidgetGenerator(node.children);

	if (node.layoutMode !== "NONE") {
		const rowColumn = htmlAutoLayoutProps(node);
		return await htmlContainer(node, childrenStr, rowColumn);
	}

	// node.layoutMode === "NONE" && node.children.length > 1
	// children needs to be absolute
	return await htmlContainer(node, childrenStr, []);
};

// properties named propSomething always take care of ","
// sometimes a property might not exist, so it doesn't add ","
const htmlContainer = async (
	node: SceneNode & SceneNodeMixin & BlendMixin & LayoutMixin & GeometryMixin & MinimalBlendMixin,
	children: string,
	additionalStyles: string[] = [],
): Promise<string> => {
	// ignore the view when size is zero or less
	if (node.width <= 0 || node.height <= 0) {
		return children;
	}

	const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();

	if (builder.styles || additionalStyles) {
		let tag = "div";
		let src = "";

		if (nodeHasImageFill(node)) {
			const altNode = node as AltNode<ExportableNode>;
			const hasChildren = "children" in node && node.children.length > 0;
			const imgUrl = (await exportNodeAsBase64PNG(altNode, hasChildren)) ?? "";

			if (hasChildren) {
				builder.addStyles(formatWithJSX("background-image", `url(${imgUrl})`));
			} else {
				tag = "img";
				src = ` src="${imgUrl}"`;
			}
		}

		const build = builder.build(additionalStyles);

		// Standard HTML approach for HTML, React, or Svelte
		if (children) {
			return `\n<${tag}${build}${src}>${indentString(children)}\n</${tag}>`;
		} else if (selfClosingTags.includes(tag)) {
			return `\n<${tag}${build}${src} />`;
		} else {
			return `\n<${tag}${build}${src}></${tag}>`;
		}
	}

	return children;
};

const htmlSection = async (node: SectionNode): Promise<string> => {
	const childrenStr = await htmlWidgetGenerator(node.children);
	const builder = new HtmlDefaultBuilder(node).size().position().applyFillsToStyle(node.fills, "background");

	if (childrenStr) {
		return `\n<div${builder.build()}>${indentString(childrenStr)}\n</div>`;
	} else {
		return `\n<div${builder.build()}></div>`;
	}
};

const htmlLine = (node: LineNode): string => {
	const builder = new HtmlDefaultBuilder(node).commonPositionStyles().commonShapeStyles();

	return `\n<div${builder.build()}></div>`;
};

export const htmlCodeGenTextStyles = () => {
	const result = previousExecutionCache
		.map((style) => `// ${style.text}\n${style.style.split(";").join(";\n")}`)
		.join("\n---\n");

	if (!result) {
		return "// No text styles in this selection";
	}
	return result;
};
