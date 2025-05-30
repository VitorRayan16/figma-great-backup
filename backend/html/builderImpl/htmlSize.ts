import { nodeSize } from "../../common/nodeWidthHeight";
import { formatWithJSX } from "../../common/parseJSX";

export const htmlSizePartial = (node: SceneNode): { width: string; height: string; constraints: string[] } => {
	const size = nodeSize(node);
	const nodeParent = node.parent;

	let w = "";
	if (typeof size.width === "number") {
		w = formatWithJSX("width", size.width);
	} else if (size.width === "fill") {
		if (nodeParent && "layoutMode" in nodeParent && nodeParent.layoutMode === "HORIZONTAL") {
			w = formatWithJSX("flex", "1 1 0");
		} else {
			if (node.maxWidth) {
				w = formatWithJSX("width", "100%");
			} else {
				w = formatWithJSX("align-self", "stretch");
			}
		}
	}

	let h = "";
	if (typeof size.height === "number") {
		h = formatWithJSX("height", size.height);
	} else if (typeof size.height === "string") {
		if (nodeParent && "layoutMode" in nodeParent && nodeParent.layoutMode === "VERTICAL") {
			h = formatWithJSX("flex", "1 1 0");
		} else {
			if (node.maxHeight) {
				h = formatWithJSX("height", "100%");
			} else {
				h = formatWithJSX("align-self", "stretch");
			}
		}
	}

	// Handle min/max width/height constraints
	const constraints = [];

	if (node.maxWidth !== undefined && node.maxWidth !== null) {
		constraints.push(formatWithJSX("max-width", node.maxWidth));
	}

	if (node.minWidth !== undefined && node.minWidth !== null) {
		constraints.push(formatWithJSX("min-width", node.minWidth));
	}

	if (node.maxHeight !== undefined && node.maxHeight !== null) {
		constraints.push(formatWithJSX("max-height", node.maxHeight));
	}

	if (node.minHeight !== undefined && node.minHeight !== null) {
		constraints.push(formatWithJSX("min-height", node.minHeight));
	}

	// Return constraints separately instead of appending to width/height
	return {
		width: w,
		height: h,
		constraints: constraints,
	};
};
