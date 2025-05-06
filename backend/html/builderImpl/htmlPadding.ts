import { commonPadding } from "../../common/commonPadding";
import { formatWithJSX } from "../../common/parseJSX";

export const htmlPadding = (node: InferredAutoLayoutResult): string[] => {
	const padding = commonPadding(node);
	if (padding === null) {
		return [];
	}

	if ("all" in padding) {
		if (padding.all !== 0) {
			return [formatWithJSX("padding", padding.all)];
		} else {
			return [];
		}
	}

	let comp: string[] = [];

	// horizontal and vertical, as the default AutoLayout
	if ("horizontal" in padding) {
		if (padding.horizontal !== 0) {
			comp.push(formatWithJSX("padding-left", padding.horizontal));
			comp.push(formatWithJSX("padding-right", padding.horizontal));
		}
		if (padding.vertical !== 0) {
			comp.push(formatWithJSX("padding-top", padding.vertical));
			comp.push(formatWithJSX("padding-bottom", padding.vertical));
		}
		return comp;
	}

	if (padding.top !== 0) {
		comp.push(formatWithJSX("padding-top", padding.top));
	}
	if (padding.bottom !== 0) {
		comp.push(formatWithJSX("padding-bottom", padding.bottom));
	}
	if (padding.left !== 0) {
		comp.push(formatWithJSX("padding-left", padding.left));
	}
	if (padding.right !== 0) {
		comp.push(formatWithJSX("padding-right", padding.right));
	}
	// todo use REM

	return comp;
};
