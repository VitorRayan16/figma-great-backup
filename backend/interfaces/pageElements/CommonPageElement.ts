import { ScreenType } from "../../types/ScreenType";
import BoundingClientRect from "./BoundingClientRect";
import ElementImage from "./ElementImage";

export type PageElementStyles = {
	[key in ScreenType]: { [key: string]: string };
};
export type PageElementContent = { desktop: string; mobile: string };
export type PageElementCss = { [key in ScreenType]: string };
export type PageElementBoundingClientRect = {
	[key in ScreenType]: BoundingClientRect;
};

export default interface CommonPageElement {
	styles: PageElementStyles;
	content: PageElementContent;
	boundingClientRect: PageElementBoundingClientRect;
	css: PageElementCss;
	classes: string;
	blockId: string;
	meta?: { [key: string]: any };
	id: string;
	image?: ElementImage | ElementImage[];
}
