import { Shape } from './Shape.js';
import { GroupShape } from './GroupShape.js';
import { Value } from './Value.js';

export class SvgDocument {
  #width: number;
  #height: number;
  #roots: Shape[];
  #index = new Map<string, Shape>();
  #parents = new Map<Shape, GroupShape | null>();

  constructor(width = 800, height = 600, roots: readonly Shape[] = []) {
    this.#width = Value.positive(width, 'width');
    this.#height = Value.positive(height, 'height');
    this.#roots = [...roots];
    this.validate();
  }

  get width(): number {
    return this.#width;
  }
  get height(): number {
    return this.#height;
  }
  get roots(): readonly Shape[] {
    return [...this.#roots];
  }
  get count(): number {
    return this.#index.size;
  }
  get shapes(): readonly Shape[] {
    return [...this.#index.values()];
  }

  resize(width: number, height: number): void {
    const nextWidth = Value.positive(width, 'width');
    const nextHeight = Value.positive(height, 'height');
    this.#width = nextWidth;
    this.#height = nextHeight;
  }

  find(id: string): Shape {
    const result = this.#index.get(id);
    if (!result) throw new Error(`no such shape: ${id}`);
    return result;
  }

  parent(id: string): GroupShape | null {
    return this.#parents.get(this.find(id)) ?? null;
  }

  container(id: string): GroupShape {
    const shape = this.#index.get(id);
    if (!shape) throw new Error(`no such container: ${id}`);
    if (!shape.container) throw new Error(`not a container: ${id}`);
    return shape.container;
  }

  add(shape: Shape, parentId?: string): void {
    const parent = parentId === undefined ? null : this.container(parentId);
    // Validate the whole subtree before attaching it to the current document.
    const subtree = new SvgDocument(this.width, this.height, [shape]);
    for (const child of subtree.shapes) this.requireNewId(child.id);
    this.insert(parent, this.childrenOf(parent).length, shape);
    this.validate();
  }

  delete(id: string): void {
    this.detach(this.find(id));
    this.validate();
  }

  group(id: string, selectedIds: readonly string[]): GroupShape {
    this.requireNewId(Value.id(id));
    if (!selectedIds.length) throw new Error('group requires at least one shape');
    if (new Set(selectedIds).size !== selectedIds.length) throw new Error('duplicate group target');
    const selected = selectedIds.map((target) => this.find(target));
    for (const shape of selected) {
      if (selected.some((other) => other !== shape && shape.container?.contains(other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    const parentChains = selected.map((shape) => this.ancestors(shape));
    const parent =
      parentChains[0]!.find((candidate) =>
        parentChains.every((chain) => chain.includes(candidate)),
      ) ?? null;
    const siblings = this.childrenOf(parent);
    const position = Math.min(
      ...selected.map((shape) => {
        let branch = shape;
        while ((this.#parents.get(branch) ?? null) !== parent) branch = this.#parents.get(branch)!;
        return siblings.indexOf(branch);
      }),
    );
    const chosen = new Set(selected);
    const ordered = this.shapes.filter((shape) => chosen.has(shape));
    const group = new GroupShape(id);
    for (const shape of ordered) {
      this.detach(shape);
      group.insert(group.children.length, shape);
    }
    this.insert(parent, position, group);
    this.validate();
    return group;
  }

  ungroup(id: string): void {
    const group = this.find(id).container;
    if (!group) throw new Error(`not a container: ${id}`);
    const parent = this.parent(id);
    if (!parent) throw new Error(`cannot ungroup top-level container: ${id}`);
    const position = parent.children.indexOf(group);
    const children = group.children;
    parent.remove(group);
    children.forEach((child, index) => {
      group.remove(child);
      parent.insert(position + index, child);
    });
    this.validate();
  }

  addTo(containerId: string, id: string): void {
    const parent = this.container(containerId);
    const shape = this.find(id);
    if (shape === parent || shape.container?.contains(parent))
      throw new Error(`cannot move a shape into itself or its descendant: ${id}`);
    this.detach(shape);
    parent.insert(parent.children.length, shape);
    this.validate();
  }

  front(id: string): void {
    this.reorder(id, false);
  }
  back(id: string): void {
    this.reorder(id, true);
  }

  clone(): SvgDocument {
    return new SvgDocument(
      this.width,
      this.height,
      this.#roots.map((shape) => shape.clone()),
    );
  }

  restore(source: SvgDocument): void {
    const restored = source.clone();
    this.#width = restored.#width;
    this.#height = restored.#height;
    this.#roots = restored.#roots;
    this.#index = restored.#index;
    this.#parents = restored.#parents;
  }

  validate(): void {
    const index = new Map<string, Shape>();
    const parents = new Map<Shape, GroupShape | null>();
    const visit = (shape: Shape, parent: GroupShape | null): void => {
      if (parents.has(shape)) throw new Error('cycle or shared node in document');
      if (index.has(shape.id)) throw new Error(`id already exists: ${shape.id}`);
      index.set(shape.id, shape);
      parents.set(shape, parent);
      for (const child of shape.children) visit(child, shape.container!);
    };
    for (const root of this.#roots) visit(root, null);
    this.#index = index;
    this.#parents = parents;
  }

  private requireNewId(id: string): void {
    if (this.#index.has(id)) throw new Error(`id already exists: ${id}`);
  }

  private ancestors(shape: Shape): (GroupShape | null)[] {
    const result: (GroupShape | null)[] = [];
    let parent = this.#parents.get(shape) ?? null;
    while (parent) {
      result.push(parent);
      parent = this.#parents.get(parent) ?? null;
    }
    result.push(null);
    return result;
  }

  private childrenOf(parent: GroupShape | null): readonly Shape[] {
    return parent ? parent.children : this.#roots;
  }

  private insert(parent: GroupShape | null, index: number, shape: Shape): void {
    if (parent) parent.insert(index, shape);
    else this.#roots.splice(index, 0, shape);
  }

  private detach(shape: Shape): void {
    const parent = this.#parents.get(shape);
    if (parent) parent.remove(shape);
    else this.#roots.splice(this.#roots.indexOf(shape), 1);
  }

  private reorder(id: string, toBack: boolean): void {
    const shape = this.find(id);
    const parent = this.parent(id);
    this.detach(shape);
    this.insert(parent, toBack ? 0 : this.childrenOf(parent).length, shape);
    this.validate();
  }
}
