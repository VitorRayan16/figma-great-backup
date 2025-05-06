import { ScreenType } from "../../types/ScreenType";
import BoundingClientRect from "./BoundingClientRect";
import { BlockImage } from "./ElementImage";

export default interface BlockElement {
	element: {
		styles: { [key in ScreenType]: { [key: string]: string } };
		classes: string[];
		order: number;
		boundingClientRect: { [key in ScreenType]: BoundingClientRect };
	};
	isPopup: boolean;
	id: string;
	image?: BlockImage;
	parentId?: string;
}
