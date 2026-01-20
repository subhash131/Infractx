import Konva from "konva";

export interface Guide {
  lineGuide: number;
  offset: number;
  orientation: "V" | "H";
  snap: "start" | "center" | "end";
}

export interface SnapConfig {
  visualThreshold?: number;
  snapDistanceLimit?: number;
  guideStroke?: string;
  guideWidth?: number;
  guideDash?: number[];
}

const DEFAULT_CONFIG: SnapConfig = {
  visualThreshold: 1.5,
  snapDistanceLimit: 2,
  guideStroke: "#FF0000",
  guideWidth: 1,
  guideDash: [6, 4],
};

export const getObjectSnappingEdges = (node: Konva.Node) => {
  const layer = node.getLayer();
  if (!layer) return null;

  // Use relativeTo: layer to get absolute coordinates
  const box = node.getClientRect({ relativeTo: layer });

  return {
    vertical: [
      { guide: box.x, offset: 0, snap: "start" },
      { guide: box.x + box.width / 2, offset: box.width / 2, snap: "center" },
      { guide: box.x + box.width, offset: box.width, snap: "end" },
    ],
    horizontal: [
      { guide: box.y, offset: 0, snap: "start" },
      { guide: box.y + box.height / 2, offset: box.height / 2, snap: "center" },
      { guide: box.y + box.height, offset: box.height, snap: "end" },
    ],
  };
};

export const getGuides = (
  lineGuideStops: { vertical: number[]; horizontal: number[] },
  itemBounds: ReturnType<typeof getObjectSnappingEdges>,
  scale: number = 1,
  config: SnapConfig = DEFAULT_CONFIG,
): Guide[] => {
  const resultV: Guide[] = [];
  const resultH: Guide[] = [];

  if (!itemBounds) return [];

  // Adjust threshold based on zoom level so snapping feels consistent
  const threshold = (config.visualThreshold || 5) / scale;

  // Check Vertical
  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound: any) => {
      const diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < threshold) {
        resultV.push({
          lineGuide,
          offset: itemBound.offset,
          orientation: "V",
          snap: itemBound.snap,
        });
      }
    });
  });

  // Check Horizontal
  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound: any) => {
      const diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < threshold) {
        resultH.push({
          lineGuide,
          offset: itemBound.offset,
          orientation: "H",
          snap: itemBound.snap,
        });
      }
    });
  });

  const guides: Guide[] = [];

  const minV = resultV.sort(
    (a, b) =>
      Math.abs(a.lineGuide - a.offset) - Math.abs(b.lineGuide - b.offset),
  )[0];
  const minH = resultH.sort(
    (a, b) =>
      Math.abs(a.lineGuide - a.offset) - Math.abs(b.lineGuide - b.offset),
  )[0];

  if (minV) guides.push(minV);
  if (minH) guides.push(minH);

  return guides;
};

export const drawGuides = (
  guides: Guide[],
  layer: Konva.Layer,
  config: SnapConfig = DEFAULT_CONFIG,
  // Add this new optional parameter
  bounds?: { x: number; y: number; width: number; height: number },
) => {
  guides.forEach((lg) => {
    let points = [];

    if (bounds) {
      // If bounds exist, constrain lines to that box
      if (lg.orientation === "H") {
        // Horizontal: Start at frame left (x), end at frame right (x + width)
        points = [
          bounds.x,
          lg.lineGuide,
          bounds.x + bounds.width,
          lg.lineGuide,
        ];
      } else {
        // Vertical: Start at frame top (y), end at frame bottom (y + height)
        points = [
          lg.lineGuide,
          bounds.y,
          lg.lineGuide,
          bounds.y + bounds.height,
        ];
      }
    } else {
      // Fallback to "infinite" lines if no bounds provided
      points =
        lg.orientation === "H"
          ? [-60000, lg.lineGuide, 60000, lg.lineGuide]
          : [lg.lineGuide, -60000, lg.lineGuide, 60000];
    }

    const line = new Konva.Line({
      points,
      stroke: config.guideStroke || "#FF00FF",
      strokeWidth: (config.guideWidth || 1) / (layer.getStage()?.scaleX() || 1),
      name: "guid-line",
      dash: config.guideDash || [4, 6],
      listening: false,
    });
    layer.add(line);
  });
};
