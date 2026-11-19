export const productColours: Record<string, string> = {
  White: "#ffffff",
  Black: "#24282d",
  Navy: "#153752",
  Red: "#bd2343",
  Natural: "#e7d8b8",
  Blue: "#286cb4",
  Green: "#287448",
  Yellow: "#f2cf45",
  Pink: "#e98ab3",
  Grey: "#8c929a",
  Gray: "#8c929a",
  Orange: "#ec8438",
  Purple: "#7956a2",
};
export function colourMatrix(hex: string) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return `${rgb[0]} 0 0 0 0 0 ${rgb[1]} 0 0 0 0 0 ${rgb[2]} 0 0 0 0 0 1 0`;
}
