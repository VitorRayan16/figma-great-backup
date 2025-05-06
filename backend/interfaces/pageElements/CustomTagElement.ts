export interface CustomStyleTag {
	content: string;
	tag: string;
	rel?: string;
	type?: string;
	crossOrigin?: string;
	integrity?: string;
}

export interface CustomScriptTag {
	content: string;
	source: string;
	integrity: string;
	crossOrigin?: string | null;
	defer: boolean;
	async: boolean;
	type: string;
}
