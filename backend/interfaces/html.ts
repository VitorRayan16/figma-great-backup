export interface HTMLPreview {
	size: { width: number; height: number };
	content: string;
}

export type ExportableNode = SceneNode & ExportMixin & MinimalFillsMixin;

export type AltNodeMetadata<T extends BaseNode> = {
	originalNode: T;
	canBeFlattened: boolean;
	svg?: string;
	base64?: string;
};

export type AltNode<T extends BaseNode> = T & AltNodeMetadata<T>;

export type StyledTextSegmentSubset = Omit<
	StyledTextSegment,
	"listSpacing" | "paragraphIndent" | "paragraphSpacing" | "textStyleOverrides"
>;
