import Konva from "konva";

export const useSmoothCanvasZoom = (
  stageRef: React.RefObject<Konva.Stage | null>,
) => {
  if (!stageRef) return { handleWheel: () => {} };
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // 1. Calculate the new scale
    // Lower this number (e.g., 1.05) for slower, more precise zooming
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // 2. Clamp the scale (min 0.1, max 5)
    const limitedScale = Math.max(0.1, Math.min(5, newScale));

    // 3. Calculate new position to zoom towards the mouse pointer
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };

    // 4. ANIMATE to the new state using Konva.to()
    // This bypasses React re-renders for 60fps smoothness
    stage.to({
      x: newPos.x,
      y: newPos.y,
      scaleX: limitedScale,
      scaleY: limitedScale,
      duration: 0,
      easing: Konva.Easings.Linear,
    });
  };

  return { handleWheel };
};
