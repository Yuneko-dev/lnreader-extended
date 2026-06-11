/* eslint-disable no-bitwise */

export type BitFieldResolvable =
  | number
  | string
  | bigint
  | BitField
  | BitFieldResolvable[];

export default class BitField {
  public bitfield: number | bigint;
  public static FLAGS: Record<string, number | bigint> = {};
  public static defaultBit: number | bigint = 0;

  public constructor(bits?: BitFieldResolvable) {
    const ctor = this.constructor as typeof BitField;
    this.bitfield = ctor.resolve(bits ?? ctor.defaultBit);
  }

  public any(bit: BitFieldResolvable): boolean {
    const ctor = this.constructor as typeof BitField;
    return (
      (Number(this.bitfield) & Number(ctor.resolve(bit))) !==
      Number(ctor.defaultBit)
    );
  }

  public equals(bit: BitFieldResolvable): boolean {
    const ctor = this.constructor as typeof BitField;
    return this.bitfield === ctor.resolve(bit);
  }

  public has(bit: BitFieldResolvable): boolean {
    const ctor = this.constructor as typeof BitField;
    const resolved = ctor.resolve(bit);
    return (Number(this.bitfield) & Number(resolved)) === Number(resolved);
  }

  public missing(bits: BitFieldResolvable, ...hasParams: any[]): string[] {
    const ctor = this.constructor as typeof BitField;
    return new ctor(bits).remove(this).toArray(...hasParams);
  }

  public freeze(): Readonly<this> {
    return Object.freeze(this);
  }

  public add(...bits: BitFieldResolvable[]): this {
    const ctor = this.constructor as typeof BitField;
    let total: number | bigint = ctor.defaultBit;
    for (const bit of bits) {
      total = Number(total) | Number(ctor.resolve(bit));
    }
    if (Object.isFrozen(this)) {
      return new ctor(Number(this.bitfield) | Number(total)) as this;
    }
    this.bitfield = Number(this.bitfield) | Number(total);
    return this;
  }

  public remove(...bits: BitFieldResolvable[]): this {
    const ctor = this.constructor as typeof BitField;
    let total: number | bigint = ctor.defaultBit;
    for (const bit of bits) {
      total = Number(total) | Number(ctor.resolve(bit));
    }
    if (Object.isFrozen(this)) {
      return new ctor(Number(this.bitfield) & ~Number(total)) as this;
    }
    this.bitfield = Number(this.bitfield) & ~Number(total);
    return this;
  }

  public serialize(...hasParams: any[]): Record<string, boolean> {
    const ctor = this.constructor as typeof BitField;
    const serialized: Record<string, boolean> = {};
    for (const [flag, bit] of Object.entries(ctor.FLAGS)) {
      // @ts-expect-error
      serialized[flag] = this.has(bit, ...hasParams);
    }
    return serialized;
  }

  public toArray(...hasParams: any[]): string[] {
    const ctor = this.constructor as typeof BitField;
    // @ts-expect-error
    return Object.keys(ctor.FLAGS).filter(bit => this.has(bit, ...hasParams));
  }

  public toJSON(): number | string {
    return typeof this.bitfield === 'number'
      ? this.bitfield
      : this.bitfield.toString();
  }

  public valueOf(): number | bigint {
    return this.bitfield;
  }

  public *[Symbol.iterator](): IterableIterator<string> {
    yield* this.toArray();
  }

  public static resolve(bit?: BitFieldResolvable): number | bigint {
    const { defaultBit } = this;
    if (bit === undefined) return defaultBit;
    if (typeof defaultBit === typeof bit && (bit as any) >= defaultBit) {
      return bit as number | bigint;
    }
    if (bit instanceof BitField) return bit.bitfield;
    if (Array.isArray(bit)) {
      return bit
        .map(p => this.resolve(p))
        .reduce((prev, p) => Number(prev) | Number(p), Number(defaultBit));
    }
    if (typeof bit === 'string') {
      if (!isNaN(Number(bit))) {
        return typeof defaultBit === 'bigint' ? BigInt(bit) : Number(bit);
      }
      if (this.FLAGS[bit] !== undefined) return this.FLAGS[bit];
    }
    throw new Error(`BITFIELD_INVALID: ${bit}`);
  }
}
