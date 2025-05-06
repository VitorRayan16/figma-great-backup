import { lowercaseFirstLetter } from "./lowercaseFirstLetter";

export const joinStyles = (styles: string[]) => styles.map((s) => s.trim()).join("; ");

export const formatStyleAttribute = (styles: string[]): string => {
	const trimmedStyles = joinStyles(styles);

	if (trimmedStyles === "") return "";

	return ` style=${`"${trimmedStyles}"`}`;
};

export const formatDataAttribute = (label: string, value?: string) =>
	` data-${lowercaseFirstLetter(label).replace(" ", "-")}${value === undefined ? `` : `="${value}"`}`;

export const formatClassAttribute = (classes: string[]): string =>
	classes.length === 0 ? "" : ` ${"class"}="${classes.join(" ")}"`;
