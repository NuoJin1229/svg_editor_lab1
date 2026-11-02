import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';
import { Shape } from '../domain/Shape.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export class SvgSerializer {
  serialize(document: SvgDocument): string {
    document.validate();
    const namespace = 'http://www.w3.org/2000/svg';
    const xml = new DOMImplementation().createDocument(namespace, 'svg', null);
    const root = xml.documentElement!;
    root.setAttribute('width', String(document.width));
    root.setAttribute('height', String(document.height));
    root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    const encode = (shape: Shape): ReturnType<typeof xml.createElementNS> => {
      const element = xml.createElementNS(namespace, shape.tag);
      for (const [name, value] of Object.entries(shape.attributes())) element.setAttribute(name, value);
      if (shape.textContent !== undefined) element.appendChild(xml.createTextNode(shape.textContent));
      for (const child of shape.children) element.appendChild(encode(child));
      return element;
    };
    for (const shape of document.roots) root.appendChild(encode(shape));
    const body = new XMLSerializer().serializeToString(xml).replace(/\r/g, '&#13;');
    return `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
  }
}
