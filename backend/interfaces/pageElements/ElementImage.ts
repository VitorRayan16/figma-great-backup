export default interface ElementImage {
	file: string;
	dimensions: { width: number; height: number };
}

export interface BlockImage {
	desktop: ElementImage;
	mobile: ElementImage;
}
