import { DOMParser, type Element, type Node } from '@xmldom/xmldom';
import type { LoadedDocument } from '../application/ports/DocumentStore.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Shape } from '../domain/Shape.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { Value } from '../domain/Value.js';

export class SvgParser {
  static readonly namespace = 'http://www.w3.org/2000/svg';
  readonly #factory = new ShapeFactory();

  parse(source: string): LoadedDocument {
    if (/<!DOCTYPE/i.test(source)) throw new Error('unsupported SVG: DOCTYPE');
    Value.text(source);
    const xml = new DOMParser({ onError: (_level, message) => { throw new Error(message); } }).parseFromString(source, 'application/xml');
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg' || root.namespaceURI !== SvgParser.namespace) throw new Error('expected an SVG root with the SVG namespace');
    const rootAttributes = this.attributes(root);
    for (const name of Object.keys(rootAttributes)) {
      if (!['width', 'height', 'viewBox'].includes(name)) throw new Error(`unsupported SVG root attribute: ${name}`);
    }
    const box = rootAttributes.viewBox?.trim().split(/[\s,]+/).map(value => Value.number(value, 'viewBox'));
    if (box && box.length !== 4) throw new Error('invalid SVG viewBox');
    const width = this.dimension(rootAttributes.width ?? String(box?.[2] ?? 800), 'width');
    const height = this.dimension(rootAttributes.height ?? String(box?.[3] ?? 600), 'height');
    if (box && (box[0] !== 0 || box[1] !== 0 || box[2] !== width || box[3] !== height)) throw new Error('unsupported SVG viewBox: expected 0 0 width height');

    const elements: Element[] = [];
    const collect = (element: Element): void => {
      for (const child of this.elementChildren(element)) { elements.push(child); collect(child); }
    };
    collect(root);
    const occupied = new Set<string>();
    for (const element of elements) {
      if (element.namespaceURI !== SvgParser.namespace) throw new Error('unsupported SVG element namespace');
      const id = element.getAttribute('id');
      if (!id) continue;
      Value.id(id);
      if (occupied.has(id)) throw new Error(`id already exists: ${id}`);
      occupied.add(id);
    }
    const warnings: string[] = [];
    const ids = new Map<Element, string>();
    const counters = new Map<string, number>();
    for (const element of elements) {
      let id = element.getAttribute('id') ?? '';
      const type = element.localName!;
      if (!id) {
        let sequence = counters.get(type) ?? 1;
        while (occupied.has(`${type}${sequence}`)) sequence++;
        id = `${type}${sequence}`;
        counters.set(type, sequence + 1);
        occupied.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
      }
      ids.set(element, id);
    }

    const build = (element: Element): Shape => {
      const shape = this.#factory.fromAttributes(element.localName!, ids.get(element)!, this.attributes(element), this.directText(element));
      const children = this.elementChildren(element);
      if (children.length && !shape.container) throw new Error(`unsupported children in <${shape.tag}>`);
      for (const child of children) shape.container!.insert(shape.children.length, build(child));
      return shape;
    };
    if (this.directText(root).trim()) throw new Error('unexpected text in <svg>');
    const document = new SvgDocument(width, height, this.elementChildren(root).map(build));
    return { document, warnings };
  }

  private dimension(value: string, name: string): number {
    return Value.positive(value.replace(/px$/, ''), name);
  }

  private attributes(element: Element): Record<string, string> {
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/') continue;
      if (attribute.namespaceURI) throw new Error(`unsupported attribute namespace: ${attribute.name}`);
      result[attribute.name] = attribute.value;
    }
    return result;
  }

  private elementChildren(element: Element): Element[] {
    return Array.from(element.childNodes).filter((node: Node): node is Element => node.nodeType === 1);
  }

  private directText(element: Element): string {
    const nodes = Array.from(element.childNodes);
    for (const node of nodes) {
      if (![1, 3, 4, 8].includes(node.nodeType)) throw new Error('unsupported XML node in SVG');
    }
    return nodes.filter(node => node.nodeType === 3 || node.nodeType === 4).map(node => node.nodeValue ?? '').join('');
  }
}
