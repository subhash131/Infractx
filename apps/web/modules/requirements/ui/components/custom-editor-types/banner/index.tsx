import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

export default function BannerComponent() {
  return (
    <NodeViewWrapper className="my-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
      <div className="flex gap-3 items-start">
        <span className="text-xl select-none" contentEditable={false}>
          💡
        </span>

        <div className="flex-1">
          <span className="font-bold text-amber-900 block mb-1">
            Important Note:
          </span>
          <NodeViewContent className="text-amber-800" />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
