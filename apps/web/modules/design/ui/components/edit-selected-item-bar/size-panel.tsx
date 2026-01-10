import React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Doc } from "@workspace/backend/_generated/dataModel";
import useCanvas from "@/modules/design/store";

interface SizePanelProps {
  properties: Partial<Doc<"layers">>;
  onChange: (key: keyof Partial<Doc<"layers">>, value: any) => void;
  onCommit: () => void;
}

export const SizePanel = ({
  properties,
  onChange,
  onCommit,
}: SizePanelProps) => {
  const { canvas } = useCanvas();
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onCommit();
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
        Size
      </h4>
      {canvas?._activeObject?.obj_type === "CIRCLE" && (
        <div className="space-y-1">
          <Label htmlFor="width" className="text-xs">
            Radius
          </Label>
          <Input
            id="radius"
            type="number"
            value={properties.radius}
            onChange={(e) => onChange("radius", e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onCommit}
            className="h-8 text-xs"
          />
        </div>
      )}
      {canvas?._activeObject?.obj_type !== "CIRCLE" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="width" className="text-xs">
              Width
            </Label>
            <Input
              id="width"
              type="number"
              value={properties.width}
              onChange={(e) => onChange("width", e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={onCommit}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="height" className="text-xs">
              Height
            </Label>
            <Input
              id="height"
              type="number"
              value={properties.height}
              onChange={(e) => onChange("height", e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={onCommit}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
};
