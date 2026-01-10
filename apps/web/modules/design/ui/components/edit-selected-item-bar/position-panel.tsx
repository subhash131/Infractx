import React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Doc } from "@workspace/backend/_generated/dataModel";

interface PositionPanelProps {
  properties: Partial<Doc<"layers">>;
  onChange: (key: keyof Partial<Doc<"layers">>, value: any) => void;
  onCommit: () => void;
}

export const PositionPanel = ({
  properties,
  onChange,
  onCommit,
}: PositionPanelProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onCommit();
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
        Position
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="left" className="text-xs">
            X
          </Label>
          <Input
            id="left"
            type="number"
            value={properties.left}
            onChange={(e) => onChange("left", e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onCommit}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="top" className="text-xs">
            Y
          </Label>
          <Input
            id="top"
            type="number"
            value={properties.top}
            onChange={(e) => onChange("top", e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onCommit}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
};
