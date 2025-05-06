import { numberToFixedString } from "./numToAutoFixed";

export const formatWithJSX = (property: string, value: number | string): string => {
	if (typeof value === "number") {
		return `${property}: ${numberToFixedString(value)}px`;
	} else {
		return `${property}: ${value}`;
	}
};

export const formatMultipleJSXArray = (styles: Record<string, string | number>): string[] =>
	Object.entries(styles)
		.filter(([key, value]) => value !== "")
		.map(([key, value]) => formatWithJSX(key, value));

export const formatMultipleJSX = (styles: Record<string, string | number | null>): string =>
	Object.entries(styles)
		.filter(([key, value]) => value)
		.map(([key, value]) => formatWithJSX(key, value!))
		.join("; ");
