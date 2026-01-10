import React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Doc } from "@workspace/backend/_generated/dataModel";

interface AppearancePanelProps {
  properties: Partial<Doc<"layers">>;
  showBorderRadius: boolean;
  onChange: (key: keyof Partial<Doc<"layers">>, value: any) => void;
}

export const AppearancePanel = ({
  properties,
  showBorderRadius,
  onChange,
}: AppearancePanelProps) => {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase">
        Appearance
      </h4>
      <div className="space-y-2">
        {/* Fill Color */}
        <div className="space-y-1">
          <Label htmlFor="fill" className="text-xs">
            Fill Color
          </Label>
          <div className="flex gap-2">
            <Input
              id="fill"
              type="color"
              value={properties.fill || "transparent"}
              onChange={(e) => onChange("fill", e.target.value)}
              className="h-8 w-12 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={properties.fill || "transparent"}
              onChange={(e) => onChange("fill", e.target.value)}
              className="h-8 text-xs flex-1"
            />
          </div>
        </div>

        {/* Stroke Color */}
        <div className="space-y-1">
          <Label htmlFor="stroke" className="text-xs">
            Stroke Color
          </Label>
          <div className="flex gap-2">
            <Input
              id="stroke"
              type="color"
              value={properties.stroke || "#000000"}
              onChange={(e) => onChange("stroke", e.target.value)}
              className="h-8 w-12 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={properties.stroke || "#000000"}
              onChange={(e) => onChange("stroke", e.target.value)}
              className="h-8 text-xs flex-1"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div className="space-y-1">
          <Label htmlFor="strokeWidth" className="text-xs">
            Stroke Width
          </Label>
          <Input
            id="strokeWidth"
            type="number"
            min="0"
            step="1"
            value={Number(properties.strokeWidth) || 0}
            onChange={(e) => onChange("strokeWidth", e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Opacity */}
        <div className="space-y-1">
          <Label htmlFor="opacity" className="text-xs">
            Opacity ({Math.round(properties.opacity || 1 * 100)}%)
          </Label>
          <Input
            id="opacity"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={properties.opacity}
            onChange={(e) => onChange("opacity", e.target.value)}
            className="h-8"
          />
        </div>

        {/* Border Radius */}
        {showBorderRadius && (
          <div className="space-y-1">
            <Label htmlFor="borderRadius" className="text-xs">
              Border Radius ({properties.radius})
            </Label>
            <Input
              id="radius"
              type="range"
              min="0"
              max="50"
              step="1"
              value={Number(properties.radius) || 0}
              onChange={(e) => onChange("radius", e.target.value)}
              className="h-8"
            />
          </div>
        )}
      </div>
    </div>
  );
};
