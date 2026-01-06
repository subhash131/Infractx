const loadedFonts = new Set<string>();

export async function loadCanvasFont(name: string, url: string) {
  if (loadedFonts.has(name)) return;

  const font = new FontFace(name, `url(${url})`, {
    style: "normal",
    weight: "400",
  });

  await font.load();
  document.fonts.add(font);
  loadedFonts.add(name);
}

export const fonts = {
  poppins: {
    url: "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfedw.ttf",
  },
};
