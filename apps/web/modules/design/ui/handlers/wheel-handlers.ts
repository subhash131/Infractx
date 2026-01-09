import * as fabric from "fabric";

export const createWheelHandler = (
  canvas: fabric.Canvas,
  scaleFactor: number,
  setZoom: (zoom: number) => void,
  setPan: (pan: { x: number; y: number }) => void
) => {
  return (opt: fabric.TPointerEventInfo<WheelEvent>) => {
    const e = opt.e;
    e.preventDefault();
    e.stopPropagation();

    const vpt = canvas.viewportTransform!;

    if (e.ctrlKey || e.metaKey) {
      // ZOOM
      const delta = e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;

      const minZoom = scaleFactor * 0.1;
      const maxZoom = scaleFactor * 20;

      if (zoom > maxZoom) zoom = maxZoom;
      if (zoom < minZoom) zoom = minZoom;

      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
      setZoom(zoom);
    } else {
      // PAN
      vpt[5] -= e.deltaY;
      vpt[4] -= e.deltaX;
      canvas.requestRenderAll();
      setPan({ x: vpt[4], y: vpt[5] });
    }

    const active = canvas.getActiveObject();
    if (active) active.setCoords();
  };
};
