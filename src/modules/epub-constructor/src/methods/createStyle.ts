/**
 * Generates a CSS string based on the provided style object.
 * If the style object is a string, it is returned as is.
 * The style object is merged with a default style object.
 *
 * @param style - The style object to generate CSS from.
 * @returns The CSS string representing the merged style object.
 */
export function createStyle(style?: string | object) {
  if (typeof style === 'string') {
    return style;
  }
  if (!style) {
    return (
      'body {\n' +
      ' font-family: "Helvetica Neue", "Helvetica", "Arial", sans-serif;\n' +
      ' font-size: 1.125em;\n' +
      ' line-height: 1.6em;\n' +
      ' color: #000;\n' +
      '}\n' +
      'h1, h2, h3, h4, h5, h6 {\n' +
      ' line-height: 1em;\n' +
      '}\n' +
      'h1 {\n' +
      ' font-size: 3em;\n' +
      '}\n' +
      'h2 {\n' +
      ' font-size: 2.5em;\n' +
      '}\n'
    );
  }
  // Creating well formated css
  let result = '';
  Object.keys(style).forEach(x => {
    const key = x as keyof typeof style;
    let item = x + ' {';
    Object.keys(style[key]).forEach(a => {
      item += `\n ${a}: ${style[key][a]};`;
    });
    item += '\n}\n';
    result += item;
  });
  return result;
}
