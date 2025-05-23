import { formatMultipleJSX, formatWithJSX } from "../common/parseJSX";
import { htmlShadow } from "./builderImpl/htmlShadow";
import { htmlVisibility, htmlRotation, htmlOpacity, htmlBlendMode } from "./builderImpl/htmlBlend";
import { buildBackgroundValues, htmlColorFromFills } from "./builderImpl/htmlColor";
import { htmlPadding } from "./builderImpl/htmlPadding";
import { htmlSizePartial } from "./builderImpl/htmlSize";
import { htmlBorderRadius } from "./builderImpl/htmlBorderRadius";
import { commonIsAbsolutePosition, getCommonPositionValue } from "../common/commonPosition";
import { numberToFixedString } from "../common/numToAutoFixed";
import { commonStroke } from "../common/commonStroke";
import { formatClassAttribute, formatDataAttribute, formatStyleAttribute } from "../common/commonFormatAttributes";
import { commonLetterSpacing, commonLineHeight } from "../common/commonTextHeightSpacing";
import { StyledTextSegmentSubset } from "../interfaces/html";

export class HtmlDefaultBuilder {
	styles: Array<string>;
	data: Array<string>;
	node: SceneNode;
	cssClassName: string | null = null;

	get name() {
		return "";
	}

	get visible() {
		return this.node.visible;
	}

	// Get the appropriate HTML element based on node type
	get htmlElement(): string {
		if (this.node.type === "TEXT") return "p";
		return "div";
	}

	constructor(node: SceneNode) {
		this.node = node;
		this.styles = [];
		this.data = [];
	}

	commonPositionStyles(): this {
		this.size();
		this.autoLayoutPadding();
		this.position();
		this.blend();
		return this;
	}

	commonShapeStyles(): this {
		if ("fills" in this.node) {
			this.applyFillsToStyle(this.node.fills, this.node.type === "TEXT" ? "text" : "background");
		}
		this.shadow();
		this.border();
		this.blur();
		return this;
	}

	addStyles = (...newStyles: string[]) => {
		this.styles.push(...newStyles.filter((style) => style));
	};

	blend(): this {
		const { node } = this;
		this.addStyles(
			htmlVisibility(node),
			...htmlRotation(node as LayoutMixin),
			htmlOpacity(node as MinimalBlendMixin),
			htmlBlendMode(node as MinimalBlendMixin),
		);
		return this;
	}

	border(): this {
		const { node } = this;
		this.addStyles(...htmlBorderRadius(node));

		const commonBorder = commonStroke(node);
		if (!commonBorder) {
			return this;
		}

		const strokes = ("strokes" in node && node.strokes) || undefined;
		const color = htmlColorFromFills(strokes as any);
		if (!color) {
			return this;
		}
		const borderStyle = "dashPattern" in node && node.dashPattern.length > 0 ? "dotted" : "solid";

		const strokeAlign = "strokeAlign" in node ? node.strokeAlign : "INSIDE";

		// Function to create border value string
		const consolidateBorders = (border: number): string =>
			[`${numberToFixedString(border)}px`, color, borderStyle].filter((d) => d).join(" ");

		if ("all" in commonBorder) {
			if (commonBorder.all === 0) {
				return this;
			}
			const weight = commonBorder.all;

			if (
				strokeAlign === "CENTER" ||
				strokeAlign === "OUTSIDE" ||
				node.type === "FRAME" ||
				node.type === "INSTANCE" ||
				node.type === "COMPONENT"
			) {
				this.addStyles(formatWithJSX("outline", consolidateBorders(weight)));
				if (strokeAlign === "CENTER") {
					this.addStyles(formatWithJSX("outline-offset", `${numberToFixedString(-weight / 2)}px`));
				} else if (strokeAlign === "INSIDE") {
					this.addStyles(formatWithJSX("outline-offset", `${numberToFixedString(-weight)}px`));
				}
			} else {
				// Default: use regular border on autolayout + strokeAlign: inside
				this.addStyles(formatWithJSX("border", consolidateBorders(weight)));
			}
		} else {
			// For non-uniform borders, always use individual border properties
			if (commonBorder.left !== 0) {
				this.addStyles(formatWithJSX("border-left", consolidateBorders(commonBorder.left)));
			}
			if (commonBorder.top !== 0) {
				this.addStyles(formatWithJSX("border-top", consolidateBorders(commonBorder.top)));
			}
			if (commonBorder.right !== 0) {
				this.addStyles(formatWithJSX("border-right", consolidateBorders(commonBorder.right)));
			}
			if (commonBorder.bottom !== 0) {
				this.addStyles(formatWithJSX("border-bottom", consolidateBorders(commonBorder.bottom)));
			}
		}
		return this;
	}

	position(): this {
		const { node } = this;
		// const isAbsolutePosition = commonIsAbsolutePosition(node);
		// if (isAbsolutePosition) {
		const { x, y } = getCommonPositionValue(node);

		this.addStyles(formatWithJSX("left", x), formatWithJSX("top", y), formatWithJSX("position", "absolute"));
		// } else {
		// 	if (node.type === "GROUP" || (node as any).isRelative) {
		// 		this.addStyles(formatWithJSX("position", "relative"));
		// 	}
		// }

		return this;
	}

	applyFillsToStyle(paintArray: ReadonlyArray<Paint> | PluginAPI["mixed"], property: "text" | "background"): this {
		if (property === "text") {
			this.addStyles(formatWithJSX("text", htmlColorFromFills(paintArray as any)));
			return this;
		}

		const backgroundValues = buildBackgroundValues(paintArray as any);
		if (backgroundValues) {
			this.addStyles(formatWithJSX("background", backgroundValues));

			// Add blend mode property if multiple fills exist with different blend modes
			if (paintArray !== figma.mixed) {
				const blendModes = this.buildBackgroundBlendModes(paintArray);
				if (blendModes) {
					this.addStyles(formatWithJSX("background-blend-mode", blendModes));
				}
			}
		}

		return this;
	}

	buildBackgroundBlendModes(paintArray: ReadonlyArray<Paint>): string {
		if (
			paintArray.length === 0 ||
			paintArray.every((d) => d.blendMode === "NORMAL" || d.blendMode === "PASS_THROUGH")
		) {
			return "";
		}

		// Reverse the array to match the background order
		const blendModes = [...paintArray].reverse().map((paint) => {
			if (paint.blendMode === "PASS_THROUGH") {
				return "normal";
			}

			return paint.blendMode?.toLowerCase();
		});

		return blendModes.join(", ");
	}

	shadow(): this {
		const { node } = this;
		if ("effects" in node) {
			const shadow = htmlShadow(node);
			if (shadow) {
				this.addStyles(formatWithJSX("box-shadow", htmlShadow(node)));
			}
		}
		return this;
	}

	size(): this {
		const { node } = this;
		const { width, height, constraints } = htmlSizePartial(node);

		if (node.type === "TEXT") {
			switch (node.textAutoResize) {
				case "WIDTH_AND_HEIGHT":
					break;
				case "HEIGHT":
					this.addStyles(width);
					break;
				case "NONE":
				case "TRUNCATE":
					this.addStyles(width, height);
					break;
			}
		} else {
			this.addStyles(width, height);
		}

		// Add constraints as separate styles
		if (constraints.length > 0) {
			this.addStyles(...constraints);
		}

		return this;
	}

	autoLayoutPadding(): this {
		const { node } = this;
		if ("paddingLeft" in node) {
			this.addStyles(...htmlPadding(node));
		}
		return this;
	}

	blur() {
		const { node } = this;
		if ("effects" in node && node.effects.length > 0) {
			const blur = node.effects.find((e) => e.type === "LAYER_BLUR" && e.visible);
			if (blur) {
				this.addStyles(formatWithJSX("filter", `blur(${numberToFixedString(blur.radius / 2)}px)`));
			}

			const backgroundBlur = node.effects.find((e) => e.type === "BACKGROUND_BLUR" && e.visible);
			if (backgroundBlur) {
				this.addStyles(
					formatWithJSX("backdrop-filter", `blur(${numberToFixedString(backgroundBlur.radius / 2)}px)`),
				);
			}
		}
	}

	addData(label: string, value?: string): this {
		const attribute = formatDataAttribute(label, value);
		this.data.push(attribute);
		return this;
	}

	build(additionalStyle: Array<string> = []): string {
		this.addStyles(...additionalStyle);

		let classNames: string[] = [];
		if (this.name) {
			this.addData("layer", this.name.trim());
		}

		if ("componentProperties" in this.node && this.node.componentProperties) {
			Object.entries(this.node.componentProperties)
				?.map((prop) => {
					if (prop[1].type === "VARIANT" || prop[1].type === "BOOLEAN") {
						const cleanName = prop[0].split("#")[0].replace(/\s+/g, "-").toLowerCase();

						return formatDataAttribute(cleanName, String(prop[1].value));
					}
					return "";
				})
				.filter(Boolean)
				.sort()
				.forEach((d) => this.data.push(d));
		}

		const dataAttributes = this.data.join("");

		// Class attributes
		const classAttribute = formatClassAttribute(classNames);

		// Style attribute
		const styleAttribute = formatStyleAttribute(this.styles);

		return `${dataAttributes}${classAttribute}${styleAttribute}`;
	}
}

export class HtmlTextBuilder extends HtmlDefaultBuilder {
	constructor(node: TextNode) {
		super(node);
	}

	// Override htmlElement to ensure text nodes use paragraph elements
	get htmlElement(): string {
		return "p";
	}

	getTextSegments(node: TextNode): {
		style: string;
		text: string;
		openTypeFeatures: { [key: string]: boolean };
		className?: string;
		componentName?: string;
	}[] {
		const segments = (node as any).styledTextSegments as StyledTextSegmentSubset[];
		if (!segments) {
			return [];
		}

		return segments.map((segment, index) => {
			// Prepare additional CSS properties from layer blur and drop shadow effects.
			const additionalStyles: { [key: string]: string } = {};

			const layerBlurStyle = this.getLayerBlurStyle();
			if (layerBlurStyle) {
				additionalStyles.filter = layerBlurStyle;
			}
			const textShadowStyle = this.getTextShadowStyle();
			if (textShadowStyle) {
				additionalStyles["text-shadow"] = textShadowStyle;
			}

			const styleAttributes = formatMultipleJSX({
				color: htmlColorFromFills(segment.fills as any),
				"font-size": segment.fontSize,
				"font-family": segment.fontName.family,
				"font-style": this.getFontStyle(segment.fontName.style),
				"font-weight": `${segment.fontWeight}`,
				"text-decoration": this.textDecoration(segment.textDecoration),
				"text-transform": this.textTransform(segment.textCase),
				"line-height": this.lineHeight(segment.lineHeight, segment.fontSize),
				"letter-spacing": this.letterSpacing(segment.letterSpacing, segment.fontSize),
				// "text-indent": segment.indentation,
				"word-wrap": "break-word",
				...additionalStyles,
			});

			const charsWithLineBreak = segment.characters.split("\n").join("<br/>");
			const result: any = {
				style: styleAttributes,
				text: charsWithLineBreak,
				openTypeFeatures: segment.openTypeFeatures,
			};

			return result;
		});
	}

	fontSize(node: TextNode, isUI = false): this {
		if (node.fontSize !== figma.mixed) {
			const value = isUI ? Math.min(node.fontSize, 24) : node.fontSize;
			this.addStyles(formatWithJSX("font-size", value));
		}
		return this;
	}

	textTrim(): this {
		if ("leadingTrim" in this.node && this.node.leadingTrim === "CAP_HEIGHT") {
			this.addStyles(formatWithJSX("text-box-trim", "trim-both"));
			this.addStyles(formatWithJSX("text-box-edge", "cap alphabetic"));
		}
		return this;
	}

	textDecoration(textDecoration: TextDecoration): string {
		switch (textDecoration) {
			case "STRIKETHROUGH":
				return "line-through";
			case "UNDERLINE":
				return "underline";
			case "NONE":
				return "";
		}
	}

	textTransform(textCase: TextCase): string {
		switch (textCase) {
			case "UPPER":
				return "uppercase";
			case "LOWER":
				return "lowercase";
			case "TITLE":
				return "capitalize";
			case "ORIGINAL":
			case "SMALL_CAPS":
			case "SMALL_CAPS_FORCED":
			default:
				return "";
		}
	}

	letterSpacing(letterSpacing: LetterSpacing, fontSize: number): number | null {
		const letterSpacingProp = commonLetterSpacing(letterSpacing, fontSize);
		if (letterSpacingProp > 0) {
			return letterSpacingProp;
		}
		return null;
	}

	lineHeight(lineHeight: LineHeight, fontSize: number): number | null {
		const lineHeightProp = commonLineHeight(lineHeight, fontSize);
		if (lineHeightProp > 0) {
			return lineHeightProp;
		}
		return null;
	}

	/**
	 * https://tailwindcss.com/docs/font-style/
	 * example: font-extrabold
	 * example: italic
	 */
	getFontStyle(style: string): string {
		if (style.toLowerCase().match("italic")) {
			return "italic";
		}
		return "";
	}

	textAlignHorizontal(): this {
		const node = this.node as TextNode;
		// if alignHorizontal is LEFT, don't do anything because that is native

		// only undefined in testing
		if (node.textAlignHorizontal && node.textAlignHorizontal !== "LEFT") {
			// todo when node.textAutoResize === "WIDTH_AND_HEIGHT" and there is no \n in the text, this can be ignored.
			let textAlign = "";
			switch (node.textAlignHorizontal) {
				case "CENTER":
					textAlign = "center";
					break;
				case "RIGHT":
					textAlign = "right";
					break;
				case "JUSTIFIED":
					textAlign = "justify";
					break;
			}
			this.addStyles(formatWithJSX("text-align", textAlign));
		}
		return this;
	}

	textAlignVertical(): this {
		const node = this.node as TextNode;
		if (node.textAlignVertical && node.textAlignVertical !== "TOP") {
			let alignItems = "";
			switch (node.textAlignVertical) {
				case "CENTER":
					alignItems = "center";
					break;
				case "BOTTOM":
					alignItems = "flex-end";
					break;
			}
			if (alignItems) {
				this.addStyles(formatWithJSX("justify-content", alignItems));
				this.addStyles(formatWithJSX("display", "flex"));
				this.addStyles(formatWithJSX("flex-direction", "column"));
			}
		}
		return this;
	}

	/**
	 * Returns a CSS filter value for layer blur.
	 */
	private getLayerBlurStyle(): string {
		if (this.node && (this.node as TextNode).effects) {
			const effects = (this.node as TextNode).effects;
			const blurEffect = effects.find(
				(effect) => effect.type === "LAYER_BLUR" && effect.visible !== false && effect.radius > 0,
			);
			if (blurEffect && blurEffect.radius) {
				return `blur(${blurEffect.radius}px)`;
			}
		}
		return "";
	}

	/**
	 * Returns a CSS text-shadow value if a drop shadow effect is applied.
	 */
	private getTextShadowStyle(): string {
		if (this.node && (this.node as TextNode).effects) {
			const effects = (this.node as TextNode).effects;
			const dropShadow = effects.find((effect) => effect.type === "DROP_SHADOW" && effect.visible !== false);
			if (dropShadow) {
				const ds = dropShadow as DropShadowEffect; // Type narrow the effect.
				const offsetX = Math.round(ds.offset.x);
				const offsetY = Math.round(ds.offset.y);
				const blurRadius = Math.round(ds.radius);
				const r = Math.round(ds.color.r * 255);
				const g = Math.round(ds.color.g * 255);
				const b = Math.round(ds.color.b * 255);
				const a = ds.color.a;
				return `${offsetX}px ${offsetY}px ${blurRadius}px rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
			}
		}
		return "";
	}
}
