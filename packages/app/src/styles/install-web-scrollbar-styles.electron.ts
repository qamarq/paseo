const STYLE_ID = "paseo-web-scrollbar-styles";

export function installWebScrollbarStyles(): () => void {
  const existingStyle = document.getElementById(STYLE_ID);
  if (existingStyle) return () => {};

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
* {
  scrollbar-width: none;
}

*::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
`;
  document.head.append(style);

  return () => style.remove();
}
