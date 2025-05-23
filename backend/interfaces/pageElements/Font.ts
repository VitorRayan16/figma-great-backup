type FontsDTO = {
	[key in FontElement]: {
		weight: string;
		family: string;
	};
};

type FontElement = "button" | "textarea" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p";

export default FontsDTO;
