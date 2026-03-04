// build/dev/javascript/prelude.mjs
class CustomType {
  withFields(fields) {
    let properties = Object.keys(this).map((label) => (label in fields) ? fields[label] : this[label]);
    return new this.constructor(...properties);
  }
}

class List {
  static fromArray(array, tail) {
    let t = tail || new Empty;
    for (let i = array.length - 1;i >= 0; --i) {
      t = new NonEmpty(array[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return current !== undefined;
  }
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current)
      current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  countLength() {
    let current = this;
    let length = 0;
    while (current) {
      current = current.tail;
      length++;
    }
    return length - 1;
  }
}
function prepend(element, tail) {
  return new NonEmpty(element, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}

class ListIterator {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
}

class Empty extends List {
}
var List$Empty = () => new Empty;
var List$isEmpty = (value) => value instanceof Empty;

class NonEmpty extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
}
var List$NonEmpty = (head, tail) => new NonEmpty(head, tail);
var List$isNonEmpty = (value) => value instanceof NonEmpty;
var List$NonEmpty$first = (value) => value.head;
var List$NonEmpty$rest = (value) => value.tail;

class BitArray {
  bitSize;
  byteSize;
  bitOffset;
  rawBuffer;
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error("BitArray can only be constructed from a Uint8Array");
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(`BitArray bit offset is invalid: ${this.bitOffset}`);
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  byteAt(index) {
    if (index < 0 || index >= this.byteSize) {
      return;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index);
  }
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0;i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0;i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, wholeByteCount);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, wholeByteCount);
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  get buffer() {
    bitArrayPrintDeprecationWarning("buffer", "Use BitArray.byteAt() or BitArray.rawBuffer instead");
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error("BitArray.buffer does not support unaligned bit arrays");
    }
    return this.rawBuffer;
  }
  get length() {
    bitArrayPrintDeprecationWarning("length", "Use BitArray.bitSize or BitArray.byteSize instead");
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error("BitArray.length does not support unaligned bit arrays");
    }
    return this.rawBuffer.length;
  }
}
function bitArrayByteAt(buffer, bitOffset, index) {
  if (bitOffset === 0) {
    return buffer[index] ?? 0;
  } else {
    const a = buffer[index] << bitOffset & 255;
    const b = buffer[index + 1] >> 8 - bitOffset;
    return a | b;
  }
}

class UtfCodepoint {
  constructor(value) {
    this.value = value;
  }
}
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(`Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`);
  isBitArrayDeprecationMessagePrinted[name] = true;
}
class Result extends CustomType {
  static isResult(data2) {
    return data2 instanceof Result;
  }
}

class Ok extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  isOk() {
    return true;
  }
}
var Result$Ok = (value) => new Ok(value);
var Result$isOk = (value) => value instanceof Ok;
var Result$Ok$0 = (value) => value[0];

class Error extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  isOk() {
    return false;
  }
}
var Result$Error = (detail) => new Error(detail);
var Result$isError = (value) => value instanceof Error;
function isEqual(x, y) {
  let values = [x, y];
  while (values.length) {
    let a = values.pop();
    let b = values.pop();
    if (a === b)
      continue;
    if (!isObject(a) || !isObject(b))
      return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal)
      return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b))
          continue;
        else
          return false;
      } catch {}
    }
    let [keys, get] = getters(a);
    const ka = keys(a);
    const kb = keys(b);
    if (ka.length !== kb.length)
      return false;
    for (let k of ka) {
      values.push(get(a, k), get(b, k));
    }
  }
  return true;
}
function getters(object) {
  if (object instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c))
    return false;
  return a.constructor === b.constructor;
}
function makeError(variant, file, module, line, fn, message, extra) {
  let error = new globalThis.Error(message);
  error.gleam_error = variant;
  error.file = file;
  error.module = module;
  error.line = line;
  error.function = fn;
  error.fn = fn;
  for (let k in extra)
    error[k] = extra[k];
  return error;
}
// build/dev/javascript/gleam_stdlib/gleam/order.mjs
class Lt extends CustomType {
}
var Order$Lt = () => new Lt;
class Eq extends CustomType {
}
var Order$Eq = () => new Eq;
class Gt extends CustomType {
}
var Order$Gt = () => new Gt;

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
class Some extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
var Option$isSome = (value) => value instanceof Some;
var Option$Some$0 = (value) => value[0];

class None extends CustomType {
}
function to_result(option, e) {
  if (option instanceof Some) {
    let a = option[0];
    return new Ok(a);
  } else {
    return new Error(e);
  }
}
function unwrap(option, default$) {
  if (option instanceof Some) {
    let x = option[0];
    return x;
  } else {
    return default$;
  }
}
function then$(option, fun) {
  if (option instanceof Some) {
    let x = option[0];
    return fun(x);
  } else {
    return option;
  }
}

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap;
var tempDataView = /* @__PURE__ */ new DataView(/* @__PURE__ */ new ArrayBuffer(8));
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== undefined) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0;i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {}
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0;i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys = Object.keys(o);
    for (let i = 0;i < keys.length; i++) {
      const k = keys[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null)
    return 1108378658;
  if (u === undefined)
    return 1108378659;
  if (u === true)
    return 1108378657;
  if (u === false)
    return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}

class Dict {
  constructor(size, root) {
    this.size = size;
    this.root = root;
  }
}
var bits = 5;
var mask = (1 << bits) - 1;
var noElementMarker = Symbol();
var generationKey = Symbol();
var emptyNode = /* @__PURE__ */ newNode(0);
var emptyDict = /* @__PURE__ */ new Dict(0, emptyNode);
var errorNil = /* @__PURE__ */ Result$Error(undefined);
function makeNode(generation, datamap, nodemap, data2) {
  return {
    datamap,
    nodemap,
    data: data2,
    [generationKey]: generation
  };
}
function newNode(generation) {
  return makeNode(generation, 0, 0, []);
}
function copyNode(node, generation) {
  if (node[generationKey] === generation) {
    return node;
  }
  const newData = node.data.slice(0);
  return makeNode(generation, node.datamap, node.nodemap, newData);
}
function copyAndSet(node, generation, idx, val) {
  if (node.data[idx] === val) {
    return node;
  }
  node = copyNode(node, generation);
  node.data[idx] = val;
  return node;
}
function copyAndInsertPair(node, generation, bit, idx, key, val) {
  const data2 = node.data;
  const length = data2.length;
  const newData = new Array(length + 2);
  let readIndex = 0;
  let writeIndex = 0;
  while (readIndex < idx)
    newData[writeIndex++] = data2[readIndex++];
  newData[writeIndex++] = key;
  newData[writeIndex++] = val;
  while (readIndex < length)
    newData[writeIndex++] = data2[readIndex++];
  return makeNode(generation, node.datamap | bit, node.nodemap, newData);
}
function make() {
  return emptyDict;
}
function size(dict) {
  return dict.size;
}
function get(dict, key) {
  const result = lookup(dict.root, key, getHash(key));
  return result !== noElementMarker ? Result$Ok(result) : errorNil;
}
function lookup(node, key, hash) {
  for (let shift = 0;shift < 32; shift += bits) {
    const data2 = node.data;
    const bit = hashbit(hash, shift);
    if (node.nodemap & bit) {
      node = data2[data2.length - 1 - index(node.nodemap, bit)];
    } else if (node.datamap & bit) {
      const dataidx = Math.imul(index(node.datamap, bit), 2);
      return isEqual(key, data2[dataidx]) ? data2[dataidx + 1] : noElementMarker;
    } else {
      return noElementMarker;
    }
  }
  const overflow = node.data;
  for (let i = 0;i < overflow.length; i += 2) {
    if (isEqual(key, overflow[i])) {
      return overflow[i + 1];
    }
  }
  return noElementMarker;
}
function toTransient(dict) {
  return {
    generation: nextGeneration(dict),
    root: dict.root,
    size: dict.size,
    dict
  };
}
function nextGeneration(dict) {
  const root = dict.root;
  if (root[generationKey] < Number.MAX_SAFE_INTEGER) {
    return root[generationKey] + 1;
  }
  const queue = [root];
  while (queue.length) {
    const node = queue.pop();
    node[generationKey] = 0;
    const nodeStart = data.length - popcount(node.nodemap);
    for (let i = nodeStart;i < node.data.length; ++i) {
      queue.push(node.data[i]);
    }
  }
  return 1;
}
var globalTransient = /* @__PURE__ */ toTransient(emptyDict);
function insert(dict, key, value) {
  globalTransient.generation = nextGeneration(dict);
  globalTransient.size = dict.size;
  const hash = getHash(key);
  const root = insertIntoNode(globalTransient, dict.root, key, value, hash, 0);
  if (root === dict.root) {
    return dict;
  }
  return new Dict(globalTransient.size, root);
}
function insertIntoNode(transient, node, key, value, hash, shift) {
  const data2 = node.data;
  const generation = transient.generation;
  if (shift > 32) {
    for (let i = 0;i < data2.length; i += 2) {
      if (isEqual(key, data2[i])) {
        return copyAndSet(node, generation, i + 1, value);
      }
    }
    transient.size += 1;
    return copyAndInsertPair(node, generation, 0, data2.length, key, value);
  }
  const bit = hashbit(hash, shift);
  if (node.nodemap & bit) {
    const nodeidx2 = data2.length - 1 - index(node.nodemap, bit);
    let child2 = data2[nodeidx2];
    child2 = insertIntoNode(transient, child2, key, value, hash, shift + bits);
    return copyAndSet(node, generation, nodeidx2, child2);
  }
  const dataidx = Math.imul(index(node.datamap, bit), 2);
  if ((node.datamap & bit) === 0) {
    transient.size += 1;
    return copyAndInsertPair(node, generation, bit, dataidx, key, value);
  }
  if (isEqual(key, data2[dataidx])) {
    return copyAndSet(node, generation, dataidx + 1, value);
  }
  const childShift = shift + bits;
  let child = emptyNode;
  child = insertIntoNode(transient, child, key, value, hash, childShift);
  const key2 = data2[dataidx];
  const value2 = data2[dataidx + 1];
  const hash2 = getHash(key2);
  child = insertIntoNode(transient, child, key2, value2, hash2, childShift);
  transient.size -= 1;
  const length = data2.length;
  const nodeidx = length - 1 - index(node.nodemap, bit);
  const newData = new Array(length - 1);
  let readIndex = 0;
  let writeIndex = 0;
  while (readIndex < dataidx)
    newData[writeIndex++] = data2[readIndex++];
  readIndex += 2;
  while (readIndex <= nodeidx)
    newData[writeIndex++] = data2[readIndex++];
  newData[writeIndex++] = child;
  while (readIndex < length)
    newData[writeIndex++] = data2[readIndex++];
  return makeNode(generation, node.datamap ^ bit, node.nodemap | bit, newData);
}
function map(dict, fun) {
  const generation = nextGeneration(dict);
  const root = copyNode(dict.root, generation);
  const queue = [root];
  while (queue.length) {
    const node = queue.pop();
    const data2 = node.data;
    const edgesStart = data2.length - popcount(node.nodemap);
    for (let i = 0;i < edgesStart; i += 2) {
      data2[i + 1] = fun(data2[i], data2[i + 1]);
    }
    for (let i = edgesStart;i < data2.length; ++i) {
      data2[i] = copyNode(data2[i], generation);
      queue.push(data2[i]);
    }
  }
  return new Dict(dict.size, root);
}
function fold(dict, state, fun) {
  const queue = [dict.root];
  while (queue.length) {
    const node = queue.pop();
    const data2 = node.data;
    const edgesStart = data2.length - popcount(node.nodemap);
    for (let i = 0;i < edgesStart; i += 2) {
      state = fun(state, data2[i], data2[i + 1]);
    }
    for (let i = edgesStart;i < data2.length; ++i) {
      queue.push(data2[i]);
    }
  }
  return state;
}
function popcount(n) {
  n -= n >>> 1 & 1431655765;
  n = (n & 858993459) + (n >>> 2 & 858993459);
  return Math.imul(n + (n >>> 4) & 252645135, 16843009) >>> 24;
}
function index(bitmap, bit) {
  return popcount(bitmap & bit - 1);
}
function hashbit(hash, shift) {
  return 1 << (hash >>> shift & mask);
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function upsert(dict, key, fun) {
  let $ = get(dict, key);
  if ($ instanceof Ok) {
    let value = $[0];
    return insert(dict, key, fun(new Some(value)));
  } else {
    return insert(dict, key, fun(new None));
  }
}
function to_list(dict) {
  return fold(dict, toList([]), (acc, key, value) => {
    return prepend([key, value], acc);
  });
}
function keys(dict) {
  return fold(dict, toList([]), (acc, key, _) => {
    return prepend(key, acc);
  });
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
class Ascending extends CustomType {
}

class Descending extends CustomType {
}
function length_loop(loop$list, loop$count) {
  while (true) {
    let list = loop$list;
    let count = loop$count;
    if (list instanceof Empty) {
      return count;
    } else {
      let list$1 = list.tail;
      loop$list = list$1;
      loop$count = count + 1;
    }
  }
}
function length(list) {
  return length_loop(list, 0);
}
function count_loop(loop$list, loop$predicate, loop$acc) {
  while (true) {
    let list = loop$list;
    let predicate = loop$predicate;
    let acc = loop$acc;
    if (list instanceof Empty) {
      return acc;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let $ = predicate(first$1);
      if ($) {
        loop$list = rest$1;
        loop$predicate = predicate;
        loop$acc = acc + 1;
      } else {
        loop$list = rest$1;
        loop$predicate = predicate;
        loop$acc = acc;
      }
    }
  }
}
function count(list, predicate) {
  return count_loop(list, predicate, 0);
}
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix instanceof Empty) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list) {
  return reverse_and_prepend(list, toList([]));
}
function first(list) {
  if (list instanceof Empty) {
    return new Error(undefined);
  } else {
    let first$1 = list.head;
    return new Ok(first$1);
  }
}
function filter_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let _block;
      let $ = fun(first$1);
      if ($) {
        _block = prepend(first$1, acc);
      } else {
        _block = acc;
      }
      let new_acc = _block;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = new_acc;
    }
  }
}
function filter(list, predicate) {
  return filter_loop(list, predicate, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list instanceof Empty) {
      return reverse(acc);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map2(list, fun) {
  return map_loop(list, fun, toList([]));
}
function drop(loop$list, loop$n) {
  while (true) {
    let list = loop$list;
    let n = loop$n;
    let $ = n <= 0;
    if ($) {
      return list;
    } else {
      if (list instanceof Empty) {
        return list;
      } else {
        let rest$1 = list.tail;
        loop$list = rest$1;
        loop$n = n - 1;
      }
    }
  }
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first2 = loop$first;
    let second = loop$second;
    if (first2 instanceof Empty) {
      return second;
    } else {
      let first$1 = first2.head;
      let rest$1 = first2.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first2, second) {
  return append_loop(reverse(first2), second);
}
function prepend2(list, item) {
  return prepend(item, list);
}
function flatten_loop(loop$lists, loop$acc) {
  while (true) {
    let lists = loop$lists;
    let acc = loop$acc;
    if (lists instanceof Empty) {
      return reverse(acc);
    } else {
      let list = lists.head;
      let further_lists = lists.tail;
      loop$lists = further_lists;
      loop$acc = reverse_and_prepend(list, acc);
    }
  }
}
function flatten(lists) {
  return flatten_loop(lists, toList([]));
}
function flat_map(list, fun) {
  return flatten(map2(list, fun));
}
function fold2(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list instanceof Empty) {
      return initial;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function find_map(loop$list, loop$fun) {
  while (true) {
    let list = loop$list;
    let fun = loop$fun;
    if (list instanceof Empty) {
      return new Error(undefined);
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let $ = fun(first$1);
      if ($ instanceof Ok) {
        return $;
      } else {
        loop$list = rest$1;
        loop$fun = fun;
      }
    }
  }
}
function any(loop$list, loop$predicate) {
  while (true) {
    let list = loop$list;
    let predicate = loop$predicate;
    if (list instanceof Empty) {
      return false;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      let $ = predicate(first$1);
      if ($) {
        return $;
      } else {
        loop$list = rest$1;
        loop$predicate = predicate;
      }
    }
  }
}
function zip_loop(loop$one, loop$other, loop$acc) {
  while (true) {
    let one = loop$one;
    let other = loop$other;
    let acc = loop$acc;
    if (one instanceof Empty) {
      return reverse(acc);
    } else if (other instanceof Empty) {
      return reverse(acc);
    } else {
      let first_one = one.head;
      let rest_one = one.tail;
      let first_other = other.head;
      let rest_other = other.tail;
      loop$one = rest_one;
      loop$other = rest_other;
      loop$acc = prepend([first_one, first_other], acc);
    }
  }
}
function zip(list, other) {
  return zip_loop(list, other, toList([]));
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list = loop$list;
    let compare3 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list instanceof Empty) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list.head;
      let rest$1 = list.tail;
      let $ = compare3(prev, new$1);
      if (direction instanceof Ascending) {
        if ($ instanceof Lt) {
          loop$list = rest$1;
          loop$compare = compare3;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else if ($ instanceof Eq) {
          loop$list = rest$1;
          loop$compare = compare3;
          loop$growing = growing$1;
          loop$direction = direction;
          loop$prev = new$1;
          loop$acc = acc;
        } else {
          let _block;
          if (direction instanceof Ascending) {
            _block = prepend(reverse(growing$1), acc);
          } else {
            _block = prepend(growing$1, acc);
          }
          let acc$1 = _block;
          if (rest$1 instanceof Empty) {
            return prepend(toList([new$1]), acc$1);
          } else {
            let next = rest$1.head;
            let rest$2 = rest$1.tail;
            let _block$1;
            let $1 = compare3(new$1, next);
            if ($1 instanceof Lt) {
              _block$1 = new Ascending;
            } else if ($1 instanceof Eq) {
              _block$1 = new Ascending;
            } else {
              _block$1 = new Descending;
            }
            let direction$1 = _block$1;
            loop$list = rest$2;
            loop$compare = compare3;
            loop$growing = toList([new$1]);
            loop$direction = direction$1;
            loop$prev = next;
            loop$acc = acc$1;
          }
        }
      } else if ($ instanceof Lt) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare3(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending;
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending;
          } else {
            _block$1 = new Descending;
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare3;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Eq) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1 instanceof Empty) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare3(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending;
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending;
          } else {
            _block$1 = new Descending;
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare3;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        loop$list = rest$1;
        loop$compare = compare3;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list2 = loop$list2;
    let compare3 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list = list2;
      return reverse_and_prepend(list, acc);
    } else if (list2 instanceof Empty) {
      let list = list1;
      return reverse_and_prepend(list, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list2.head;
      let rest2 = list2.tail;
      let $ = compare3(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list2;
        loop$compare = compare3;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare3;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare3;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare3 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let ascending1 = sequences2.head;
        let ascending2 = $.head;
        let rest$1 = $.tail;
        let descending = merge_ascendings(ascending1, ascending2, compare3, toList([]));
        loop$sequences = rest$1;
        loop$compare = compare3;
        loop$acc = prepend(descending, acc);
      }
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list2 = loop$list2;
    let compare3 = loop$compare;
    let acc = loop$acc;
    if (list1 instanceof Empty) {
      let list = list2;
      return reverse_and_prepend(list, acc);
    } else if (list2 instanceof Empty) {
      let list = list1;
      return reverse_and_prepend(list, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list2.head;
      let rest2 = list2.tail;
      let $ = compare3(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare3;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Eq) {
        loop$list1 = rest1;
        loop$list2 = list2;
        loop$compare = compare3;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list2;
        loop$compare = compare3;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare3 = loop$compare;
    let acc = loop$acc;
    if (sequences2 instanceof Empty) {
      return reverse(acc);
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(prepend(reverse(sequence), acc));
      } else {
        let descending1 = sequences2.head;
        let descending2 = $.head;
        let rest$1 = $.tail;
        let ascending = merge_descendings(descending1, descending2, compare3, toList([]));
        loop$sequences = rest$1;
        loop$compare = compare3;
        loop$acc = prepend(ascending, acc);
      }
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare3 = loop$compare;
    if (sequences2 instanceof Empty) {
      return sequences2;
    } else if (direction instanceof Ascending) {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return sequence;
      } else {
        let sequences$1 = merge_ascending_pairs(sequences2, compare3, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Descending;
        loop$compare = compare3;
      }
    } else {
      let $ = sequences2.tail;
      if ($ instanceof Empty) {
        let sequence = sequences2.head;
        return reverse(sequence);
      } else {
        let sequences$1 = merge_descending_pairs(sequences2, compare3, toList([]));
        loop$sequences = sequences$1;
        loop$direction = new Ascending;
        loop$compare = compare3;
      }
    }
  }
}
function sort(list, compare3) {
  if (list instanceof Empty) {
    return list;
  } else {
    let $ = list.tail;
    if ($ instanceof Empty) {
      return list;
    } else {
      let x = list.head;
      let y = $.head;
      let rest$1 = $.tail;
      let _block;
      let $1 = compare3(x, y);
      if ($1 instanceof Lt) {
        _block = new Ascending;
      } else if ($1 instanceof Eq) {
        _block = new Ascending;
      } else {
        _block = new Descending;
      }
      let direction = _block;
      let sequences$1 = sequences(rest$1, compare3, toList([x]), direction, y, toList([]));
      return merge_all(sequences$1, new Ascending, compare3);
    }
  }
}
function key_find(keyword_list, desired_key) {
  return find_map(keyword_list, (keyword) => {
    let key;
    let value;
    key = keyword[0];
    value = keyword[1];
    let $ = isEqual(key, desired_key);
    if ($) {
      return new Ok(value);
    } else {
      return new Error(undefined);
    }
  });
}
function key_set_loop(loop$list, loop$key, loop$value, loop$inspected) {
  while (true) {
    let list = loop$list;
    let key = loop$key;
    let value = loop$value;
    let inspected = loop$inspected;
    if (list instanceof Empty) {
      return reverse(prepend([key, value], inspected));
    } else {
      let k = list.head[0];
      if (isEqual(k, key)) {
        let rest$1 = list.tail;
        return reverse_and_prepend(inspected, prepend([k, value], rest$1));
      } else {
        let first$1 = list.head;
        let rest$1 = list.tail;
        loop$list = rest$1;
        loop$key = key;
        loop$value = value;
        loop$inspected = prepend(first$1, inspected);
      }
    }
  }
}
function key_set(list, key, value) {
  return key_set_loop(list, key, value, toList([]));
}
function each(loop$list, loop$f) {
  while (true) {
    let list = loop$list;
    let f = loop$f;
    if (list instanceof Empty) {
      return;
    } else {
      let first$1 = list.head;
      let rest$1 = list.tail;
      f(first$1);
      loop$list = rest$1;
      loop$f = f;
    }
  }
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
class DecodeError extends CustomType {
  constructor(expected, found, path) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path;
  }
}
var DecodeError$DecodeError = (expected, found, path) => new DecodeError(expected, found, path);
class Decoder extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
}
var bool = /* @__PURE__ */ new Decoder(decode_bool);
var int2 = /* @__PURE__ */ new Decoder(decode_int);
var string2 = /* @__PURE__ */ new Decoder(decode_string);
function run(data2, decoder) {
  let $ = decoder.function(data2);
  let maybe_invalid_data;
  let errors;
  maybe_invalid_data = $[0];
  errors = $[1];
  if (errors instanceof Empty) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error(errors);
  }
}
function success(data2) {
  return new Decoder((_) => {
    return [data2, toList([])];
  });
}
function map3(decoder, transformer) {
  return new Decoder((d) => {
    let $ = decoder.function(d);
    let data2;
    let errors;
    data2 = $[0];
    errors = $[1];
    return [transformer(data2), errors];
  });
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data2 = loop$data;
    let failure = loop$failure;
    let decoders = loop$decoders;
    if (decoders instanceof Empty) {
      return failure;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data2);
      let layer;
      let errors;
      layer = $;
      errors = $[1];
      if (errors instanceof Empty) {
        return layer;
      } else {
        loop$data = data2;
        loop$failure = failure;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first2, alternatives) {
  return new Decoder((dynamic_data) => {
    let $ = first2.function(dynamic_data);
    let layer;
    let errors;
    layer = $;
    errors = $[1];
    if (errors instanceof Empty) {
      return layer;
    } else {
      return run_decoders(dynamic_data, layer, alternatives);
    }
  });
}
function decode_error(expected, found) {
  return toList([
    new DecodeError(expected, classify_dynamic(found), toList([]))
  ]);
}
function run_dynamic_function(data2, name, f) {
  let $ = f(data2);
  if ($ instanceof Ok) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let placeholder = $[0];
    return [
      placeholder,
      toList([new DecodeError(name, classify_dynamic(data2), toList([]))])
    ];
  }
}
function decode_bool(data2) {
  let $ = isEqual(identity(true), data2);
  if ($) {
    return [true, toList([])];
  } else {
    let $1 = isEqual(identity(false), data2);
    if ($1) {
      return [false, toList([])];
    } else {
      return [false, decode_error("Bool", data2)];
    }
  }
}
function decode_int(data2) {
  return run_dynamic_function(data2, "Int", int);
}
function decode_string(data2) {
  return run_dynamic_function(data2, "String", string);
}
function list2(inner) {
  return new Decoder((data2) => {
    return list(data2, inner.function, (p, k) => {
      return push_path(p, toList([k]));
    }, 0, toList([]));
  });
}
function push_path(layer, path) {
  let decoder = one_of(string2, toList([
    (() => {
      let _pipe = int2;
      return map3(_pipe, to_string);
    })()
  ]));
  let path$1 = map2(path, (key) => {
    let key$1 = identity(key);
    let $ = run(key$1, decoder);
    if ($ instanceof Ok) {
      let key$2 = $[0];
      return key$2;
    } else {
      return "<" + classify_dynamic(key$1) + ">";
    }
  });
  let errors = map2(layer[1], (error) => {
    return new DecodeError(error.expected, error.found, append(path$1, error.path));
  });
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data2 = loop$data;
    let handle_miss = loop$handle_miss;
    if (path instanceof Empty) {
      let _pipe = data2;
      let _pipe$1 = inner(_pipe);
      return push_path(_pipe$1, reverse(position));
    } else {
      let key = path.head;
      let path$1 = path.tail;
      let $ = index2(data2, key);
      if ($ instanceof Ok) {
        let $1 = $[0];
        if ($1 instanceof Some) {
          let data$1 = $1[0];
          loop$path = path$1;
          loop$position = prepend(key, position);
          loop$inner = inner;
          loop$data = data$1;
          loop$handle_miss = handle_miss;
        } else {
          return handle_miss(data2, prepend(key, position));
        }
      } else {
        let kind = $[0];
        let $1 = inner(data2);
        let default$;
        default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError(kind, classify_dynamic(data2), toList([]))])
        ];
        return push_path(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next) {
  return new Decoder((data2) => {
    let $ = index3(field_path, toList([]), field_decoder.function, data2, (data3, position) => {
      let $12 = field_decoder.function(data3);
      let default$;
      default$ = $12[0];
      let _pipe = [
        default$,
        toList([new DecodeError("Field", "Nothing", toList([]))])
      ];
      return push_path(_pipe, reverse(position));
    });
    let out;
    let errors1;
    out = $[0];
    errors1 = $[1];
    let $1 = next(out).function(data2);
    let out$1;
    let errors2;
    out$1 = $1[0];
    errors2 = $1[1];
    return [out$1, append(errors1, errors2)];
  });
}
function field(field_name, field_decoder, next) {
  return subfield(toList([field_name]), field_decoder, next);
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = undefined;
function identity(x) {
  return x;
}
function parse_int(value) {
  if (/^[-+]?(\d+)$/.test(value)) {
    return Result$Ok(parseInt(value));
  } else {
    return Result$Error(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function string_replace(string3, target, substitute) {
  return string3.replaceAll(target, substitute);
}
function string_length(string3) {
  if (string3 === "") {
    return 0;
  }
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    let i = 0;
    for (const _ of iterator) {
      i++;
    }
    return i;
  } else {
    return string3.match(/./gsu).length;
  }
}
function graphemes(string3) {
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    return arrayToList(Array.from(iterator).map((item) => item.segment));
  } else {
    return arrayToList(string3.match(/./gsu));
  }
}
var segmenter = undefined;
function graphemes_iterator(string3) {
  if (globalThis.Intl && Intl.Segmenter) {
    segmenter ||= new Intl.Segmenter;
    return segmenter.segment(string3)[Symbol.iterator]();
  }
}
function pop_grapheme(string3) {
  let first2;
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    first2 = iterator.next().value?.segment;
  } else {
    first2 = string3.match(/./su)?.[0];
  }
  if (first2) {
    return Result$Ok([first2, string3.slice(first2.length)]);
  } else {
    return Result$Error(Nil);
  }
}
function pop_codeunit(str) {
  return [str.charCodeAt(0) | 0, str.slice(1)];
}
function lowercase(string3) {
  return string3.toLowerCase();
}
function less_than(a, b) {
  return a < b;
}
function split(xs, pattern) {
  return arrayToList(xs.split(pattern));
}
function concat(xs) {
  let result = "";
  for (const x of xs) {
    result = result + x;
  }
  return result;
}
function string_byte_slice(string3, index4, length2) {
  return string3.slice(index4, index4 + length2);
}
function string_grapheme_slice(string3, idx, len) {
  if (len <= 0 || idx >= string3.length) {
    return "";
  }
  const iterator = graphemes_iterator(string3);
  if (iterator) {
    while (idx-- > 0) {
      iterator.next();
    }
    let result = "";
    while (len-- > 0) {
      const v = iterator.next().value;
      if (v === undefined) {
        break;
      }
      result += v.segment;
    }
    return result;
  } else {
    return string3.match(/./gsu).slice(idx, idx + len).join("");
  }
}
function string_codeunit_slice(str, from2, length2) {
  return str.slice(from2, from2 + length2);
}
function contains_string(haystack, needle) {
  return haystack.indexOf(needle) >= 0;
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
function ends_with(haystack, needle) {
  return haystack.endsWith(needle);
}
function split_once(haystack, needle) {
  const index4 = haystack.indexOf(needle);
  if (index4 >= 0) {
    const before = haystack.slice(0, index4);
    const after = haystack.slice(index4 + needle.length);
    return Result$Ok([before, after]);
  } else {
    return Result$Error(Nil);
  }
}
var unicode_whitespaces = [
  " ",
  "\t",
  `
`,
  "\v",
  "\f",
  "\r",
  "",
  "\u2028",
  "\u2029"
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(`^[${unicode_whitespaces}]*`);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function trim_start(string3) {
  return string3.replace(trim_start_regex, "");
}
function trim_end(string3) {
  return string3.replace(trim_end_regex, "");
}
function percent_encode(string3) {
  return encodeURIComponent(string3).replace("%2B", "+");
}
function classify_dynamic(data2) {
  if (typeof data2 === "string") {
    return "String";
  } else if (typeof data2 === "boolean") {
    return "Bool";
  } else if (isResult(data2)) {
    return "Result";
  } else if (isList(data2)) {
    return "List";
  } else if (data2 instanceof BitArray) {
    return "BitArray";
  } else if (data2 instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data2)) {
    return "Int";
  } else if (Array.isArray(data2)) {
    return `Array`;
  } else if (typeof data2 === "number") {
    return "Float";
  } else if (data2 === null) {
    return "Nil";
  } else if (data2 === undefined) {
    return "Nil";
  } else {
    const type = typeof data2;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function byte_size(string3) {
  return new TextEncoder().encode(string3).length;
}
function inspect(v) {
  return new Inspector().inspect(v);
}
function float_to_string(float2) {
  const string3 = float2.toString().replace("+", "");
  if (string3.indexOf(".") >= 0) {
    return string3;
  } else {
    const index4 = string3.indexOf("e");
    if (index4 >= 0) {
      return string3.slice(0, index4) + ".0" + string3.slice(index4);
    } else {
      return string3 + ".0";
    }
  }
}

class Inspector {
  #references = new Set;
  inspect(v) {
    const t = typeof v;
    if (v === true)
      return "True";
    if (v === false)
      return "False";
    if (v === null)
      return "//js(null)";
    if (v === undefined)
      return "Nil";
    if (t === "string")
      return this.#string(v);
    if (t === "bigint" || Number.isInteger(v))
      return v.toString();
    if (t === "number")
      return float_to_string(v);
    if (v instanceof UtfCodepoint)
      return this.#utfCodepoint(v);
    if (v instanceof BitArray)
      return this.#bit_array(v);
    if (v instanceof RegExp)
      return `//js(${v})`;
    if (v instanceof Date)
      return `//js(Date("${v.toISOString()}"))`;
    if (v instanceof globalThis.Error)
      return `//js(${v.toString()})`;
    if (v instanceof Function) {
      const args = [];
      for (const i of Array(v.length).keys())
        args.push(String.fromCharCode(i + 97));
      return `//fn(${args.join(", ")}) { ... }`;
    }
    if (this.#references.size === this.#references.add(v).size) {
      return "//js(circular reference)";
    }
    let printed;
    if (Array.isArray(v)) {
      printed = `#(${v.map((v2) => this.inspect(v2)).join(", ")})`;
    } else if (isList(v)) {
      printed = this.#list(v);
    } else if (v instanceof CustomType) {
      printed = this.#customType(v);
    } else if (v instanceof Dict) {
      printed = this.#dict(v);
    } else if (v instanceof Set) {
      return `//js(Set(${[...v].map((v2) => this.inspect(v2)).join(", ")}))`;
    } else {
      printed = this.#object(v);
    }
    this.#references.delete(v);
    return printed;
  }
  #object(v) {
    const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
    const props = [];
    for (const k of Object.keys(v)) {
      props.push(`${this.inspect(k)}: ${this.inspect(v[k])}`);
    }
    const body = props.length ? " " + props.join(", ") + " " : "";
    const head = name === "Object" ? "" : name + " ";
    return `//js(${head}{${body}})`;
  }
  #dict(map4) {
    let body = "dict.from_list([";
    let first2 = true;
    body = fold(map4, body, (body2, key, value) => {
      if (!first2)
        body2 = body2 + ", ";
      first2 = false;
      return body2 + "#(" + this.inspect(key) + ", " + this.inspect(value) + ")";
    });
    return body + "])";
  }
  #customType(record) {
    const props = Object.keys(record).map((label) => {
      const value = this.inspect(record[label]);
      return isNaN(parseInt(label)) ? `${label}: ${value}` : value;
    }).join(", ");
    return props ? `${record.constructor.name}(${props})` : record.constructor.name;
  }
  #list(list3) {
    if (List$isEmpty(list3)) {
      return "[]";
    }
    let char_out = 'charlist.from_string("';
    let list_out = "[";
    let current = list3;
    while (List$isNonEmpty(current)) {
      let element = current.head;
      current = current.tail;
      if (list_out !== "[") {
        list_out += ", ";
      }
      list_out += this.inspect(element);
      if (char_out) {
        if (Number.isInteger(element) && element >= 32 && element <= 126) {
          char_out += String.fromCharCode(element);
        } else {
          char_out = null;
        }
      }
    }
    if (char_out) {
      return char_out + '")';
    } else {
      return list_out + "]";
    }
  }
  #string(str) {
    let new_str = '"';
    for (let i = 0;i < str.length; i++) {
      const char = str[i];
      switch (char) {
        case `
`:
          new_str += "\\n";
          break;
        case "\r":
          new_str += "\\r";
          break;
        case "\t":
          new_str += "\\t";
          break;
        case "\f":
          new_str += "\\f";
          break;
        case "\\":
          new_str += "\\\\";
          break;
        case '"':
          new_str += "\\\"";
          break;
        default:
          if (char < " " || char > "~" && char < " ") {
            new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
          } else {
            new_str += char;
          }
      }
    }
    new_str += '"';
    return new_str;
  }
  #utfCodepoint(codepoint) {
    return `//utfcodepoint(${String.fromCodePoint(codepoint.value)})`;
  }
  #bit_array(bits2) {
    if (bits2.bitSize === 0) {
      return "<<>>";
    }
    let acc = "<<";
    for (let i = 0;i < bits2.byteSize - 1; i++) {
      acc += bits2.byteAt(i).toString();
      acc += ", ";
    }
    if (bits2.byteSize * 8 === bits2.bitSize) {
      acc += bits2.byteAt(bits2.byteSize - 1).toString();
    } else {
      const trailingBitsCount = bits2.bitSize % 8;
      acc += bits2.byteAt(bits2.byteSize - 1) >> 8 - trailingBitsCount;
      acc += `:size(${trailingBitsCount})`;
    }
    acc += ">>";
    return acc;
  }
}
function index2(data2, key) {
  if (data2 instanceof Dict) {
    const result = get(data2, key);
    return Result$Ok(result.isOk() ? new Some(result[0]) : new None);
  }
  if (data2 instanceof WeakMap || data2 instanceof Map) {
    const token = {};
    const entry = data2.get(key, token);
    if (entry === token)
      return Result$Ok(new None);
    return Result$Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && isList(data2)) {
    let i = 0;
    for (const value of data2) {
      if (i === key)
        return Result$Ok(new Some(value));
      i++;
    }
    return Result$Error("Indexable");
  }
  if (key_is_int && Array.isArray(data2) || data2 && typeof data2 === "object" || data2 && Object.getPrototypeOf(data2) === Object.prototype) {
    if (key in data2)
      return Result$Ok(new Some(data2[key]));
    return Result$Ok(new None);
  }
  return Result$Error(key_is_int ? "Indexable" : "Dict");
}
function list(data2, decode, pushPath, index4, emptyList) {
  if (!(isList(data2) || Array.isArray(data2))) {
    const error = DecodeError$DecodeError("List", classify_dynamic(data2), emptyList);
    return [emptyList, arrayToList([error])];
  }
  const decoded = [];
  for (const element of data2) {
    const layer = decode(element);
    const [out, errors] = layer;
    if (List$isNonEmpty(errors)) {
      const [_, errors2] = pushPath(layer, index4.toString());
      return [emptyList, errors2];
    }
    decoded.push(out);
    index4++;
  }
  return [arrayToList(decoded), emptyList];
}
function int(data2) {
  if (Number.isInteger(data2))
    return Result$Ok(data2);
  return Result$Error(0);
}
function string(data2) {
  if (typeof data2 === "string")
    return Result$Ok(data2);
  return Result$Error("");
}
function arrayToList(array) {
  let list3 = List$Empty();
  let i = array.length;
  while (i--) {
    list3 = List$NonEmpty(array[i], list3);
  }
  return list3;
}
function isList(data2) {
  return List$isEmpty(data2) || List$isNonEmpty(data2);
}
function isResult(data2) {
  return Result$isOk(data2) || Result$isError(data2);
}

// build/dev/javascript/gleam_stdlib/gleam/int.mjs
function max(a, b) {
  let $ = a > b;
  if ($) {
    return a;
  } else {
    return b;
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string_tree.mjs
function reverse2(tree) {
  let _pipe = tree;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = graphemes(_pipe$1);
  let _pipe$3 = reverse(_pipe$2);
  return concat(_pipe$3);
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function reverse3(string3) {
  let _pipe = string3;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = reverse2(_pipe$1);
  return identity(_pipe$2);
}
function replace(string3, pattern, substitute) {
  let _pipe = string3;
  let _pipe$1 = identity(_pipe);
  let _pipe$2 = string_replace(_pipe$1, pattern, substitute);
  return identity(_pipe$2);
}
function compare3(a, b) {
  let $ = a === b;
  if ($) {
    return new Eq;
  } else {
    let $1 = less_than(a, b);
    if ($1) {
      return new Lt;
    } else {
      return new Gt;
    }
  }
}
function slice(string3, idx, len) {
  let $ = len <= 0;
  if ($) {
    return "";
  } else {
    let $1 = idx < 0;
    if ($1) {
      let translated_idx = string_length(string3) + idx;
      let $2 = translated_idx < 0;
      if ($2) {
        return "";
      } else {
        return string_grapheme_slice(string3, translated_idx, len);
      }
    } else {
      return string_grapheme_slice(string3, idx, len);
    }
  }
}
function drop_end(string3, num_graphemes) {
  let $ = num_graphemes <= 0;
  if ($) {
    return string3;
  } else {
    return slice(string3, 0, string_length(string3) - num_graphemes);
  }
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string3 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string3;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}
function repeat_loop(loop$times, loop$doubling_acc, loop$acc) {
  while (true) {
    let times = loop$times;
    let doubling_acc = loop$doubling_acc;
    let acc = loop$acc;
    let _block;
    let $ = times % 2;
    if ($ === 0) {
      _block = acc;
    } else {
      _block = acc + doubling_acc;
    }
    let acc$1 = _block;
    let times$1 = globalThis.Math.trunc(times / 2);
    let $1 = times$1 <= 0;
    if ($1) {
      return acc$1;
    } else {
      loop$times = times$1;
      loop$doubling_acc = doubling_acc + doubling_acc;
      loop$acc = acc$1;
    }
  }
}
function repeat(string3, times) {
  let $ = times <= 0;
  if ($) {
    return "";
  } else {
    return repeat_loop(times, string3, "");
  }
}
function join_loop(loop$strings, loop$separator, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let separator = loop$separator;
    let accumulator = loop$accumulator;
    if (strings instanceof Empty) {
      return accumulator;
    } else {
      let string3 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$separator = separator;
      loop$accumulator = accumulator + separator + string3;
    }
  }
}
function join(strings, separator) {
  if (strings instanceof Empty) {
    return "";
  } else {
    let first$1 = strings.head;
    let rest = strings.tail;
    return join_loop(rest, separator, first$1);
  }
}
function trim(string3) {
  let _pipe = string3;
  let _pipe$1 = trim_start(_pipe);
  return trim_end(_pipe$1);
}
function split2(x, substring) {
  if (substring === "") {
    return graphemes(x);
  } else {
    let _pipe = x;
    let _pipe$1 = identity(_pipe);
    let _pipe$2 = split(_pipe$1, substring);
    return map2(_pipe$2, identity);
  }
}
function first2(string3) {
  let $ = pop_grapheme(string3);
  if ($ instanceof Ok) {
    let first$1 = $[0][0];
    return new Ok(first$1);
  } else {
    return $;
  }
}
function inspect2(term) {
  let _pipe = term;
  let _pipe$1 = inspect(_pipe);
  return identity(_pipe$1);
}
function drop_start(string3, num_graphemes) {
  let $ = num_graphemes <= 0;
  if ($) {
    return string3;
  } else {
    let prefix = string_grapheme_slice(string3, 0, num_graphemes);
    let prefix_size = byte_size(prefix);
    return string_byte_slice(string3, prefix_size, byte_size(string3) - prefix_size);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function map4(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    return result;
  }
}
function map_error(result, fun) {
  if (result instanceof Ok) {
    return result;
  } else {
    let error = result[0];
    return new Error(fun(error));
  }
}
function try$(result, fun) {
  if (result instanceof Ok) {
    let x = result[0];
    return fun(x);
  } else {
    return result;
  }
}
function unwrap2(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function lazy_unwrap(result, default$) {
  if (result instanceof Ok) {
    let v = result[0];
    return v;
  } else {
    return default$();
  }
}
function replace_error(result, error) {
  if (result instanceof Ok) {
    return result;
  } else {
    return new Error(error);
  }
}
// build/dev/javascript/gleam_json/gleam_json_ffi.mjs
function json_to_string(json) {
  return JSON.stringify(json);
}
function object(entries) {
  return Object.fromEntries(entries);
}
function identity2(x) {
  return x;
}
function decode(string3) {
  try {
    const result = JSON.parse(string3);
    return Result$Ok(result);
  } catch (err) {
    return Result$Error(getJsonDecodeError(err, string3));
  }
}
function getJsonDecodeError(stdErr, json) {
  if (isUnexpectedEndOfInput(stdErr))
    return DecodeError$UnexpectedEndOfInput();
  return toUnexpectedByteError(stdErr, json);
}
function isUnexpectedEndOfInput(err) {
  const unexpectedEndOfInputRegex = /((unexpected (end|eof))|(end of data)|(unterminated string)|(json( parse error|\.parse)\: expected '(\:|\}|\])'))/i;
  return unexpectedEndOfInputRegex.test(err.message);
}
function toUnexpectedByteError(err, json) {
  let converters = [
    v8UnexpectedByteError,
    oldV8UnexpectedByteError,
    jsCoreUnexpectedByteError,
    spidermonkeyUnexpectedByteError
  ];
  for (let converter of converters) {
    let result = converter(err, json);
    if (result)
      return result;
  }
  return DecodeError$UnexpectedByte("");
}
function v8UnexpectedByteError(err) {
  const regex = /unexpected token '(.)', ".+" is not valid JSON/i;
  const match = regex.exec(err.message);
  if (!match)
    return null;
  const byte = toHex(match[1]);
  return DecodeError$UnexpectedByte(byte);
}
function oldV8UnexpectedByteError(err) {
  const regex = /unexpected token (.) in JSON at position (\d+)/i;
  const match = regex.exec(err.message);
  if (!match)
    return null;
  const byte = toHex(match[1]);
  return DecodeError$UnexpectedByte(byte);
}
function spidermonkeyUnexpectedByteError(err, json) {
  const regex = /(unexpected character|expected .*) at line (\d+) column (\d+)/i;
  const match = regex.exec(err.message);
  if (!match)
    return null;
  const line = Number(match[2]);
  const column = Number(match[3]);
  const position = getPositionFromMultiline(line, column, json);
  const byte = toHex(json[position]);
  return DecodeError$UnexpectedByte(byte);
}
function jsCoreUnexpectedByteError(err) {
  const regex = /unexpected (identifier|token) "(.)"/i;
  const match = regex.exec(err.message);
  if (!match)
    return null;
  const byte = toHex(match[2]);
  return DecodeError$UnexpectedByte(byte);
}
function toHex(char) {
  return "0x" + char.charCodeAt(0).toString(16).toUpperCase();
}
function getPositionFromMultiline(line, column, string3) {
  if (line === 1)
    return column - 1;
  let currentLn = 1;
  let position = 0;
  string3.split("").find((char, idx) => {
    if (char === `
`)
      currentLn += 1;
    if (currentLn === line) {
      position = idx + column;
      return true;
    }
    return false;
  });
  return position;
}

// build/dev/javascript/gleam_json/gleam/json.mjs
class UnexpectedEndOfInput extends CustomType {
}
var DecodeError$UnexpectedEndOfInput = () => new UnexpectedEndOfInput;
class UnexpectedByte extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
var DecodeError$UnexpectedByte = ($0) => new UnexpectedByte($0);
class UnableToDecode extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
function do_parse(json, decoder) {
  return try$(decode(json), (dynamic_value) => {
    let _pipe = run(dynamic_value, decoder);
    return map_error(_pipe, (var0) => {
      return new UnableToDecode(var0);
    });
  });
}
function parse(json, decoder) {
  return do_parse(json, decoder);
}
function to_string2(json) {
  return json_to_string(json);
}
function string3(input) {
  return identity2(input);
}
function bool2(input) {
  return identity2(input);
}
function int3(input) {
  return identity2(input);
}
function object2(entries) {
  return object(entries);
}

// build/dev/javascript/gleam_stdlib/gleam/uri.mjs
class Uri extends CustomType {
  constructor(scheme, userinfo, host, port, path, query, fragment) {
    super();
    this.scheme = scheme;
    this.userinfo = userinfo;
    this.host = host;
    this.port = port;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }
}
var empty = /* @__PURE__ */ new Uri(/* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, "", /* @__PURE__ */ new None, /* @__PURE__ */ new None);
function is_valid_host_within_brackets_char(char) {
  return 48 >= char && char <= 57 || 65 >= char && char <= 90 || 97 >= char && char <= 122 || char === 58 || char === 46;
}
function parse_fragment(rest, pieces) {
  return new Ok(new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, pieces.path, pieces.query, new Some(rest)));
}
function parse_query_with_question_mark_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let query = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, pieces.path, new Some(query), pieces.fragment);
        return parse_fragment(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return new Ok(new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, pieces.path, new Some(original), pieces.fragment));
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_query_with_question_mark(uri_string, pieces) {
  return parse_query_with_question_mark_loop(uri_string, uri_string, pieces, 0);
}
function parse_path_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let path = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, path, pieces.query, pieces.fragment);
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let path = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, path, pieces.query, pieces.fragment);
      return parse_fragment(rest, pieces$1);
    } else if (uri_string === "") {
      return new Ok(new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, original, pieces.query, pieces.fragment));
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_path(uri_string, pieces) {
  return parse_path_loop(uri_string, uri_string, pieces, 0);
}
function parse_port_loop(loop$uri_string, loop$pieces, loop$port) {
  while (true) {
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let port = loop$port;
    if (uri_string.startsWith("0")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10;
    } else if (uri_string.startsWith("1")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 1;
    } else if (uri_string.startsWith("2")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 2;
    } else if (uri_string.startsWith("3")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 3;
    } else if (uri_string.startsWith("4")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 4;
    } else if (uri_string.startsWith("5")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 5;
    } else if (uri_string.startsWith("6")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 6;
    } else if (uri_string.startsWith("7")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 7;
    } else if (uri_string.startsWith("8")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 8;
    } else if (uri_string.startsWith("9")) {
      let rest = uri_string.slice(1);
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$port = port * 10 + 9;
    } else if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, pieces.host, new Some(port), pieces.path, pieces.query, pieces.fragment);
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, pieces.host, new Some(port), pieces.path, pieces.query, pieces.fragment);
      return parse_fragment(rest, pieces$1);
    } else if (uri_string.startsWith("/")) {
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, pieces.host, new Some(port), pieces.path, pieces.query, pieces.fragment);
      return parse_path(uri_string, pieces$1);
    } else if (uri_string === "") {
      return new Ok(new Uri(pieces.scheme, pieces.userinfo, pieces.host, new Some(port), pieces.path, pieces.query, pieces.fragment));
    } else {
      return new Error(undefined);
    }
  }
}
function parse_port(uri_string, pieces) {
  if (uri_string.startsWith(":0")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 0);
  } else if (uri_string.startsWith(":1")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 1);
  } else if (uri_string.startsWith(":2")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 2);
  } else if (uri_string.startsWith(":3")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 3);
  } else if (uri_string.startsWith(":4")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 4);
  } else if (uri_string.startsWith(":5")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 5);
  } else if (uri_string.startsWith(":6")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 6);
  } else if (uri_string.startsWith(":7")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 7);
  } else if (uri_string.startsWith(":8")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 8);
  } else if (uri_string.startsWith(":9")) {
    let rest = uri_string.slice(2);
    return parse_port_loop(rest, pieces, 9);
  } else if (uri_string === ":") {
    return new Ok(pieces);
  } else if (uri_string === "") {
    return new Ok(pieces);
  } else if (uri_string.startsWith("?")) {
    let rest = uri_string.slice(1);
    return parse_query_with_question_mark(rest, pieces);
  } else if (uri_string.startsWith(":?")) {
    let rest = uri_string.slice(2);
    return parse_query_with_question_mark(rest, pieces);
  } else if (uri_string.startsWith("#")) {
    let rest = uri_string.slice(1);
    return parse_fragment(rest, pieces);
  } else if (uri_string.startsWith(":#")) {
    let rest = uri_string.slice(2);
    return parse_fragment(rest, pieces);
  } else if (uri_string.startsWith("/")) {
    return parse_path(uri_string, pieces);
  } else if (uri_string.startsWith(":")) {
    let rest = uri_string.slice(1);
    if (rest.startsWith("/")) {
      return parse_path(rest, pieces);
    } else {
      return new Error(undefined);
    }
  } else {
    return new Error(undefined);
  }
}
function parse_host_outside_of_brackets_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string === "") {
      return new Ok(new Uri(pieces.scheme, pieces.userinfo, new Some(original), pieces.port, pieces.path, pieces.query, pieces.fragment));
    } else if (uri_string.startsWith(":")) {
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
      return parse_port(uri_string, pieces$1);
    } else if (uri_string.startsWith("/")) {
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
      return parse_path(uri_string, pieces$1);
    } else if (uri_string.startsWith("?")) {
      let rest = uri_string.slice(1);
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
      return parse_query_with_question_mark(rest, pieces$1);
    } else if (uri_string.startsWith("#")) {
      let rest = uri_string.slice(1);
      let host = string_codeunit_slice(original, 0, size2);
      let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
      return parse_fragment(rest, pieces$1);
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_host_within_brackets_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string === "") {
      return new Ok(new Uri(pieces.scheme, pieces.userinfo, new Some(uri_string), pieces.port, pieces.path, pieces.query, pieces.fragment));
    } else if (uri_string.startsWith("]")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_port(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2 + 1);
        let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_port(rest, pieces$1);
      }
    } else if (uri_string.startsWith("/")) {
      if (size2 === 0) {
        return parse_path(uri_string, pieces);
      } else {
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_path(uri_string, pieces$1);
      }
    } else if (uri_string.startsWith("?")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_query_with_question_mark(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_query_with_question_mark(rest, pieces$1);
      }
    } else if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let host = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(host), pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_fragment(rest, pieces$1);
      }
    } else {
      let $ = pop_codeunit(uri_string);
      let char;
      let rest;
      char = $[0];
      rest = $[1];
      let $1 = is_valid_host_within_brackets_char(char);
      if ($1) {
        loop$original = original;
        loop$uri_string = rest;
        loop$pieces = pieces;
        loop$size = size2 + 1;
      } else {
        return parse_host_outside_of_brackets_loop(original, original, pieces, 0);
      }
    }
  }
}
function parse_host_within_brackets(uri_string, pieces) {
  return parse_host_within_brackets_loop(uri_string, uri_string, pieces, 0);
}
function parse_host_outside_of_brackets(uri_string, pieces) {
  return parse_host_outside_of_brackets_loop(uri_string, uri_string, pieces, 0);
}
function parse_host(uri_string, pieces) {
  if (uri_string.startsWith("[")) {
    return parse_host_within_brackets(uri_string, pieces);
  } else if (uri_string.startsWith(":")) {
    let pieces$1 = new Uri(pieces.scheme, pieces.userinfo, new Some(""), pieces.port, pieces.path, pieces.query, pieces.fragment);
    return parse_port(uri_string, pieces$1);
  } else if (uri_string === "") {
    return new Ok(new Uri(pieces.scheme, pieces.userinfo, new Some(""), pieces.port, pieces.path, pieces.query, pieces.fragment));
  } else {
    return parse_host_outside_of_brackets(uri_string, pieces);
  }
}
function parse_userinfo_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("@")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_host(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let userinfo = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(pieces.scheme, new Some(userinfo), pieces.host, pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_host(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("/")) {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("?")) {
      return parse_host(original, pieces);
    } else if (uri_string.startsWith("#")) {
      return parse_host(original, pieces);
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function parse_authority_pieces(string4, pieces) {
  return parse_userinfo_loop(string4, string4, pieces, 0);
}
function parse_authority_with_slashes(uri_string, pieces) {
  if (uri_string === "//") {
    return new Ok(new Uri(pieces.scheme, pieces.userinfo, new Some(""), pieces.port, pieces.path, pieces.query, pieces.fragment));
  } else if (uri_string.startsWith("//")) {
    let rest = uri_string.slice(2);
    return parse_authority_pieces(rest, pieces);
  } else {
    return parse_path(uri_string, pieces);
  }
}
function parse_scheme_loop(loop$original, loop$uri_string, loop$pieces, loop$size) {
  while (true) {
    let original = loop$original;
    let uri_string = loop$uri_string;
    let pieces = loop$pieces;
    let size2 = loop$size;
    if (uri_string.startsWith("/")) {
      if (size2 === 0) {
        return parse_authority_with_slashes(uri_string, pieces);
      } else {
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(new Some(lowercase(scheme)), pieces.userinfo, pieces.host, pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_authority_with_slashes(uri_string, pieces$1);
      }
    } else if (uri_string.startsWith("?")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_query_with_question_mark(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(new Some(lowercase(scheme)), pieces.userinfo, pieces.host, pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_query_with_question_mark(rest, pieces$1);
      }
    } else if (uri_string.startsWith("#")) {
      if (size2 === 0) {
        let rest = uri_string.slice(1);
        return parse_fragment(rest, pieces);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(new Some(lowercase(scheme)), pieces.userinfo, pieces.host, pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_fragment(rest, pieces$1);
      }
    } else if (uri_string.startsWith(":")) {
      if (size2 === 0) {
        return new Error(undefined);
      } else {
        let rest = uri_string.slice(1);
        let scheme = string_codeunit_slice(original, 0, size2);
        let pieces$1 = new Uri(new Some(lowercase(scheme)), pieces.userinfo, pieces.host, pieces.port, pieces.path, pieces.query, pieces.fragment);
        return parse_authority_with_slashes(rest, pieces$1);
      }
    } else if (uri_string === "") {
      return new Ok(new Uri(pieces.scheme, pieces.userinfo, pieces.host, pieces.port, original, pieces.query, pieces.fragment));
    } else {
      let $ = pop_codeunit(uri_string);
      let rest;
      rest = $[1];
      loop$original = original;
      loop$uri_string = rest;
      loop$pieces = pieces;
      loop$size = size2 + 1;
    }
  }
}
function to_string3(uri) {
  let _block;
  let $ = uri.fragment;
  if ($ instanceof Some) {
    let fragment = $[0];
    _block = toList(["#", fragment]);
  } else {
    _block = toList([]);
  }
  let parts = _block;
  let _block$1;
  let $1 = uri.query;
  if ($1 instanceof Some) {
    let query = $1[0];
    _block$1 = prepend("?", prepend(query, parts));
  } else {
    _block$1 = parts;
  }
  let parts$1 = _block$1;
  let parts$2 = prepend(uri.path, parts$1);
  let _block$2;
  let $2 = uri.host;
  let $3 = starts_with(uri.path, "/");
  if ($2 instanceof Some && !$3) {
    let host = $2[0];
    if (host !== "") {
      _block$2 = prepend("/", parts$2);
    } else {
      _block$2 = parts$2;
    }
  } else {
    _block$2 = parts$2;
  }
  let parts$3 = _block$2;
  let _block$3;
  let $4 = uri.host;
  let $5 = uri.port;
  if ($4 instanceof Some && $5 instanceof Some) {
    let port = $5[0];
    _block$3 = prepend(":", prepend(to_string(port), parts$3));
  } else {
    _block$3 = parts$3;
  }
  let parts$4 = _block$3;
  let _block$4;
  let $6 = uri.scheme;
  let $7 = uri.userinfo;
  let $8 = uri.host;
  if ($6 instanceof Some) {
    if ($7 instanceof Some) {
      if ($8 instanceof Some) {
        let s = $6[0];
        let u = $7[0];
        let h = $8[0];
        _block$4 = prepend(s, prepend("://", prepend(u, prepend("@", prepend(h, parts$4)))));
      } else {
        let s = $6[0];
        _block$4 = prepend(s, prepend(":", parts$4));
      }
    } else if ($8 instanceof Some) {
      let s = $6[0];
      let h = $8[0];
      _block$4 = prepend(s, prepend("://", prepend(h, parts$4)));
    } else {
      let s = $6[0];
      _block$4 = prepend(s, prepend(":", parts$4));
    }
  } else if ($7 instanceof None && $8 instanceof Some) {
    let h = $8[0];
    _block$4 = prepend("//", prepend(h, parts$4));
  } else {
    _block$4 = parts$4;
  }
  let parts$5 = _block$4;
  return concat2(parts$5);
}
function parse2(uri_string) {
  return parse_scheme_loop(uri_string, uri_string, empty, 0);
}
// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}
function lazy_guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence();
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity3(x) {
  return x;
}
// build/dev/javascript/houdini/houdini.ffi.mjs
function do_escape(string4) {
  return string4.replaceAll(/[><&"']/g, (replaced) => {
    switch (replaced) {
      case ">":
        return "&gt;";
      case "<":
        return "&lt;";
      case "'":
        return "&#39;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return replaced;
    }
  });
}

// build/dev/javascript/houdini/houdini/internal/escape_js.mjs
function escape(text) {
  return do_escape(text);
}

// build/dev/javascript/houdini/houdini.mjs
function escape2(string4) {
  return escape(string4);
}

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var error_nil = /* @__PURE__ */ new Error(undefined);

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ Order$Gt();
var LT = /* @__PURE__ */ Order$Lt();
var EQ = /* @__PURE__ */ Order$Eq();
function compare4(a, b) {
  if (a.name === b.name) {
    return EQ;
  } else if (a.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
class Attribute extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
}
class Property extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
}
class Event2 extends CustomType {
  constructor(kind, name, handler, include, prevent_default, stop_propagation, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.debounce = debounce;
    this.throttle = throttle;
  }
}
class Handler extends CustomType {
  constructor(prevent_default, stop_propagation, message) {
    super();
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.message = message;
  }
}
class Never extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
}
class Always extends CustomType {
  constructor(kind) {
    super();
    this.kind = kind;
  }
}
var attribute_kind = 0;
var property_kind = 1;
var event_kind = 2;
var never_kind = 0;
var never = /* @__PURE__ */ new Never(never_kind);
var always_kind = 2;
var always = /* @__PURE__ */ new Always(always_kind);
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes instanceof Empty) {
      return merged;
    } else {
      let $ = attributes.head;
      if ($ instanceof Attribute) {
        let $1 = $.name;
        if ($1 === "") {
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = merged;
        } else if ($1 === "class") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "class") {
                  let kind = $.kind;
                  let class1 = $2;
                  let rest = $3.tail;
                  let class2 = $4.value;
                  let value = class1 + " " + class2;
                  let attribute$1 = new Attribute(kind, "class", value);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else if ($1 === "style") {
          let $2 = $.value;
          if ($2 === "") {
            let rest = attributes.tail;
            loop$attributes = rest;
            loop$merged = merged;
          } else {
            let $3 = attributes.tail;
            if ($3 instanceof Empty) {
              let attribute$1 = $;
              let rest = $3;
              loop$attributes = rest;
              loop$merged = prepend(attribute$1, merged);
            } else {
              let $4 = $3.head;
              if ($4 instanceof Attribute) {
                let $5 = $4.name;
                if ($5 === "style") {
                  let kind = $.kind;
                  let style1 = $2;
                  let rest = $3.tail;
                  let style2 = $4.value;
                  let value = style1 + ";" + style2;
                  let attribute$1 = new Attribute(kind, "style", value);
                  loop$attributes = prepend(attribute$1, rest);
                  loop$merged = merged;
                } else {
                  let attribute$1 = $;
                  let rest = $3;
                  loop$attributes = rest;
                  loop$merged = prepend(attribute$1, merged);
                }
              } else {
                let attribute$1 = $;
                let rest = $3;
                loop$attributes = rest;
                loop$merged = prepend(attribute$1, merged);
              }
            }
          }
        } else {
          let attribute$1 = $;
          let rest = attributes.tail;
          loop$attributes = rest;
          loop$merged = prepend(attribute$1, merged);
        }
      } else {
        let attribute$1 = $;
        let rest = attributes.tail;
        loop$attributes = rest;
        loop$merged = prepend(attribute$1, merged);
      }
    }
  }
}
function prepare(attributes) {
  if (attributes instanceof Empty) {
    return attributes;
  } else {
    let $ = attributes.tail;
    if ($ instanceof Empty) {
      return attributes;
    } else {
      let _pipe = attributes;
      let _pipe$1 = sort(_pipe, (a, b) => {
        return compare4(b, a);
      });
      return merge(_pipe$1, empty_list);
    }
  }
}
function attribute(name, value) {
  return new Attribute(attribute_kind, name, value);
}
function property(name, value) {
  return new Property(property_kind, name, value);
}
function event(name, handler, include, prevent_default, stop_propagation, debounce, throttle) {
  return new Event2(event_kind, name, handler, include, prevent_default, stop_propagation, debounce, throttle);
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name, value) {
  return attribute(name, value);
}
function property2(name, value) {
  return property(name, value);
}
function boolean_attribute(name, value) {
  if (value) {
    return attribute2(name, "");
  } else {
    return property2(name, bool2(false));
  }
}
function class$(name) {
  return attribute2("class", name);
}
function id(value) {
  return attribute2("id", value);
}
function style(property3, value) {
  if (property3 === "") {
    return class$("");
  } else if (value === "") {
    return class$("");
  } else {
    return attribute2("style", property3 + ":" + value + ";");
  }
}
function do_styles(loop$properties, loop$styles) {
  while (true) {
    let properties = loop$properties;
    let styles = loop$styles;
    if (properties instanceof Empty) {
      return styles;
    } else {
      let $ = properties.head[0];
      if ($ === "") {
        let rest = properties.tail;
        loop$properties = rest;
        loop$styles = styles;
      } else {
        let $1 = properties.head[1];
        if ($1 === "") {
          let rest = properties.tail;
          loop$properties = rest;
          loop$styles = styles;
        } else {
          let rest = properties.tail;
          let name$1 = $;
          let value$1 = $1;
          loop$properties = rest;
          loop$styles = styles + name$1 + ":" + value$1 + ";";
        }
      }
    }
  }
}
function styles(properties) {
  return attribute2("style", do_styles(properties, ""));
}
function title(text) {
  return attribute2("title", text);
}
function href(url) {
  return attribute2("href", url);
}
function target(value) {
  return attribute2("target", value);
}
function alt(text) {
  return attribute2("alt", text);
}
function src(url) {
  return attribute2("src", url);
}
function checked(is_checked) {
  return boolean_attribute("checked", is_checked);
}
function disabled(is_disabled) {
  return boolean_attribute("disabled", is_disabled);
}
function placeholder(text) {
  return attribute2("placeholder", text);
}
function type_(control_type) {
  return attribute2("type", control_type);
}
function value(control_value) {
  return attribute2("value", control_value);
}

// build/dev/javascript/lustre/lustre/effect.mjs
class Effect extends CustomType {
  constructor(synchronous, before_paint, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint;
    this.after_paint = after_paint;
  }
}

class Actions extends CustomType {
  constructor(dispatch, emit, select, root, provide) {
    super();
    this.dispatch = dispatch;
    this.emit = emit;
    this.select = select;
    this.root = root;
    this.provide = provide;
  }
}
var empty2 = /* @__PURE__ */ new Effect(/* @__PURE__ */ toList([]), /* @__PURE__ */ toList([]), /* @__PURE__ */ toList([]));
function perform(effect, dispatch, emit, select, root, provide) {
  let actions = new Actions(dispatch, emit, select, root, provide);
  return each(effect.synchronous, (run2) => {
    return run2(actions);
  });
}
function none() {
  return empty2;
}
function from2(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  return new Effect(toList([task]), empty2.before_paint, empty2.after_paint);
}
function batch(effects) {
  return fold2(effects, empty2, (acc, eff) => {
    return new Effect(fold2(eff.synchronous, acc.synchronous, prepend2), fold2(eff.before_paint, acc.before_paint, prepend2), fold2(eff.after_paint, acc.after_paint, prepend2));
  });
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty3() {
  return null;
}
function get2(map5, key) {
  return map5?.get(key);
}
function get_or_compute(map5, key, compute) {
  return map5?.get(key) ?? compute();
}
function has_key(map5, key) {
  return map5 && map5.has(key);
}
function insert2(map5, key, value2) {
  map5 ??= new Map;
  map5.set(key, value2);
  return map5;
}
function remove(map5, key) {
  map5?.delete(key);
  return map5;
}

// build/dev/javascript/lustre/lustre/internals/ref.ffi.mjs
function sameValueZero(x, y) {
  if (typeof x === "number" && typeof y === "number") {
    return x === y || x !== x && y !== y;
  }
  return x === y;
}

// build/dev/javascript/lustre/lustre/internals/ref.mjs
function equal_lists(loop$xs, loop$ys) {
  while (true) {
    let xs = loop$xs;
    let ys = loop$ys;
    if (xs instanceof Empty) {
      if (ys instanceof Empty) {
        return true;
      } else {
        return false;
      }
    } else if (ys instanceof Empty) {
      return false;
    } else {
      let x = xs.head;
      let xs$1 = xs.tail;
      let y = ys.head;
      let ys$1 = ys.tail;
      let $ = sameValueZero(x, y);
      if ($) {
        loop$xs = xs$1;
        loop$ys = ys$1;
      } else {
        return $;
      }
    }
  }
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
class Fragment extends CustomType {
  constructor(kind, key, children, keyed_children) {
    super();
    this.kind = kind;
    this.key = key;
    this.children = children;
    this.keyed_children = keyed_children;
  }
}
class Element extends CustomType {
  constructor(kind, key, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
}
class Text extends CustomType {
  constructor(kind, key, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.content = content;
  }
}
class UnsafeInnerHtml extends CustomType {
  constructor(kind, key, namespace, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
}
class Map2 extends CustomType {
  constructor(kind, key, mapper, child) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.child = child;
  }
}
class Memo extends CustomType {
  constructor(kind, key, dependencies, view) {
    super();
    this.kind = kind;
    this.key = key;
    this.dependencies = dependencies;
    this.view = view;
  }
}
var fragment_kind = 0;
var element_kind = 1;
var text_kind = 2;
var unsafe_inner_html_kind = 3;
var map_kind = 4;
var memo_kind = 5;
function is_void_html_element(tag, namespace) {
  if (namespace === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function to_keyed(key, node) {
  if (node instanceof Fragment) {
    return new Fragment(node.kind, key, node.children, node.keyed_children);
  } else if (node instanceof Element) {
    return new Element(node.kind, key, node.namespace, node.tag, node.attributes, node.children, node.keyed_children, node.self_closing, node.void);
  } else if (node instanceof Text) {
    return new Text(node.kind, key, node.content);
  } else if (node instanceof UnsafeInnerHtml) {
    return new UnsafeInnerHtml(node.kind, key, node.namespace, node.tag, node.attributes, node.inner_html);
  } else if (node instanceof Map2) {
    let child = node.child;
    return new Map2(node.kind, key, node.mapper, to_keyed(key, child));
  } else {
    let view = node.view;
    return new Memo(node.kind, key, node.dependencies, () => {
      return to_keyed(key, view());
    });
  }
}
function fragment(key, children, keyed_children) {
  return new Fragment(fragment_kind, key, children, keyed_children);
}
function element(key, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(element_kind, key, namespace, tag, prepare(attributes), children, keyed_children, self_closing, void$);
}
function text(key, content) {
  return new Text(text_kind, key, content);
}
function unsafe_inner_html(key, namespace, tag, attributes, inner_html) {
  return new UnsafeInnerHtml(unsafe_inner_html_kind, key, namespace, tag, prepare(attributes), inner_html);
}
function map5(element2, mapper) {
  if (element2 instanceof Map2) {
    let child_mapper = element2.mapper;
    return new Map2(map_kind, element2.key, (handler) => {
      return identity3(mapper)(child_mapper(handler));
    }, identity3(element2.child));
  } else {
    return new Map2(map_kind, element2.key, identity3(mapper), identity3(element2));
  }
}
function memo(key, dependencies, view) {
  return new Memo(memo_kind, key, dependencies, view);
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element("", "", tag, attributes, children, empty3(), false, is_void_html_element(tag, ""));
}
function text2(content) {
  return text("", content);
}
function none2() {
  return text("", "");
}
function fragment2(children) {
  return fragment("", children, empty3());
}
function unsafe_raw_html(namespace, tag, attributes, inner_html) {
  return unsafe_inner_html("", namespace, tag, attributes, inner_html);
}
function memo2(dependencies, view) {
  return memo("", dependencies, view);
}
function ref(value2) {
  return identity3(value2);
}
function map6(element3, f) {
  return map5(element3, f);
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function h1(attrs, children) {
  return element2("h1", attrs, children);
}
function h2(attrs, children) {
  return element2("h2", attrs, children);
}
function h3(attrs, children) {
  return element2("h3", attrs, children);
}
function h4(attrs, children) {
  return element2("h4", attrs, children);
}
function h5(attrs, children) {
  return element2("h5", attrs, children);
}
function h6(attrs, children) {
  return element2("h6", attrs, children);
}
function blockquote(attrs, children) {
  return element2("blockquote", attrs, children);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function hr(attrs) {
  return element2("hr", attrs, empty_list);
}
function li(attrs, children) {
  return element2("li", attrs, children);
}
function ol(attrs, children) {
  return element2("ol", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function pre(attrs, children) {
  return element2("pre", attrs, children);
}
function ul(attrs, children) {
  return element2("ul", attrs, children);
}
function a(attrs, children) {
  return element2("a", attrs, children);
}
function br(attrs) {
  return element2("br", attrs, empty_list);
}
function code(attrs, children) {
  return element2("code", attrs, children);
}
function em(attrs, children) {
  return element2("em", attrs, children);
}
function mark(attrs, children) {
  return element2("mark", attrs, children);
}
function span(attrs, children) {
  return element2("span", attrs, children);
}
function strong(attrs, children) {
  return element2("strong", attrs, children);
}
function sup(attrs, children) {
  return element2("sup", attrs, children);
}
function img(attrs) {
  return element2("img", attrs, empty_list);
}
function del(attrs, children) {
  return element2("del", attrs, children);
}
function table(attrs, children) {
  return element2("table", attrs, children);
}
function tbody(attrs, children) {
  return element2("tbody", attrs, children);
}
function td(attrs, children) {
  return element2("td", attrs, children);
}
function th(attrs, children) {
  return element2("th", attrs, children);
}
function thead(attrs, children) {
  return element2("thead", attrs, children);
}
function tr(attrs, children) {
  return element2("tr", attrs, children);
}
function button(attrs, children) {
  return element2("button", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}
function label(attrs, children) {
  return element2("label", attrs, children);
}
function textarea(attrs, content) {
  return element2("textarea", prepend(property2("value", string3(content)), attrs), toList([text2(content)]));
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
class Patch extends CustomType {
  constructor(index4, removed, changes, children) {
    super();
    this.index = index4;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
}
class ReplaceText extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
}
class ReplaceInnerHtml extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
}
class Update extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
}
class Move extends CustomType {
  constructor(kind, key, before) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
  }
}
class Replace extends CustomType {
  constructor(kind, index4, with$) {
    super();
    this.kind = kind;
    this.index = index4;
    this.with = with$;
  }
}
class Remove extends CustomType {
  constructor(kind, index4) {
    super();
    this.kind = kind;
    this.index = index4;
  }
}
class Insert extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
}
var replace_text_kind = 0;
var replace_inner_html_kind = 1;
var update_kind = 2;
var move_kind = 3;
var remove_kind = 4;
var replace_kind = 5;
var insert_kind = 6;
function new$3(index4, removed, changes, children) {
  return new Patch(index4, removed, changes, children);
}
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
function move(key, before) {
  return new Move(move_kind, key, before);
}
function remove2(index4) {
  return new Remove(remove_kind, index4);
}
function replace2(index4, with$) {
  return new Replace(replace_kind, index4, with$);
}
function insert3(children, before) {
  return new Insert(insert_kind, children, before);
}

// build/dev/javascript/lustre/lustre/runtime/transport.mjs
class Mount extends CustomType {
  constructor(kind, open_shadow_root, will_adopt_styles, observed_attributes, observed_properties, requested_contexts, provided_contexts, vdom, memos) {
    super();
    this.kind = kind;
    this.open_shadow_root = open_shadow_root;
    this.will_adopt_styles = will_adopt_styles;
    this.observed_attributes = observed_attributes;
    this.observed_properties = observed_properties;
    this.requested_contexts = requested_contexts;
    this.provided_contexts = provided_contexts;
    this.vdom = vdom;
    this.memos = memos;
  }
}
class Reconcile extends CustomType {
  constructor(kind, patch, memos) {
    super();
    this.kind = kind;
    this.patch = patch;
    this.memos = memos;
  }
}
class Emit extends CustomType {
  constructor(kind, name, data2) {
    super();
    this.kind = kind;
    this.name = name;
    this.data = data2;
  }
}
class Provide extends CustomType {
  constructor(kind, key, value2) {
    super();
    this.kind = kind;
    this.key = key;
    this.value = value2;
  }
}
class Batch extends CustomType {
  constructor(kind, messages) {
    super();
    this.kind = kind;
    this.messages = messages;
  }
}
var ServerMessage$isBatch = (value2) => value2 instanceof Batch;
class AttributeChanged extends CustomType {
  constructor(kind, name, value2) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value2;
  }
}
var ServerMessage$isAttributeChanged = (value2) => value2 instanceof AttributeChanged;
class PropertyChanged extends CustomType {
  constructor(kind, name, value2) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value2;
  }
}
var ServerMessage$isPropertyChanged = (value2) => value2 instanceof PropertyChanged;
class EventFired extends CustomType {
  constructor(kind, path, name, event2) {
    super();
    this.kind = kind;
    this.path = path;
    this.name = name;
    this.event = event2;
  }
}
var ServerMessage$isEventFired = (value2) => value2 instanceof EventFired;
class ContextProvided extends CustomType {
  constructor(kind, key, value2) {
    super();
    this.kind = kind;
    this.key = key;
    this.value = value2;
  }
}
var ServerMessage$isContextProvided = (value2) => value2 instanceof ContextProvided;
var mount_kind = 0;
var reconcile_kind = 1;
var emit_kind = 2;
var provide_kind = 3;
function mount(open_shadow_root, will_adopt_styles, observed_attributes, observed_properties, requested_contexts, provided_contexts, vdom, memos) {
  return new Mount(mount_kind, open_shadow_root, will_adopt_styles, observed_attributes, observed_properties, requested_contexts, provided_contexts, vdom, memos);
}
function reconcile(patch, memos) {
  return new Reconcile(reconcile_kind, patch, memos);
}
function emit(name, data2) {
  return new Emit(emit_kind, name, data2);
}
function provide(key, value2) {
  return new Provide(provide_kind, key, value2);
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
class Root extends CustomType {
}

class Key extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
}

class Index extends CustomType {
  constructor(index4, parent) {
    super();
    this.index = index4;
    this.parent = parent;
  }
}

class Subtree extends CustomType {
  constructor(parent) {
    super();
    this.parent = parent;
  }
}
var root = /* @__PURE__ */ new Root;
var separator_element = "\t";
var separator_subtree = "\r";
var separator_event = `
`;
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path = loop$path;
    let candidates = loop$candidates;
    if (candidates instanceof Empty) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path, candidate);
      if ($) {
        return $;
      } else {
        loop$path = path;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index4, key) {
  if (key === "") {
    return new Index(index4, parent);
  } else {
    return new Key(key, parent);
  }
}
function subtree(path) {
  return new Subtree(path);
}
function finish_to_string(acc) {
  if (acc instanceof Empty) {
    return "";
  } else {
    let segments = acc.tail;
    return concat2(segments);
  }
}
function split_subtree_path(path) {
  return split2(path, separator_subtree);
}
function do_to_string(loop$full, loop$path, loop$acc) {
  while (true) {
    let full = loop$full;
    let path = loop$path;
    let acc = loop$acc;
    if (path instanceof Root) {
      return finish_to_string(acc);
    } else if (path instanceof Key) {
      let key = path.key;
      let parent = path.parent;
      loop$full = full;
      loop$path = parent;
      loop$acc = prepend(separator_element, prepend(key, acc));
    } else if (path instanceof Index) {
      let index4 = path.index;
      let parent = path.parent;
      let acc$1 = prepend(separator_element, prepend(to_string(index4), acc));
      loop$full = full;
      loop$path = parent;
      loop$acc = acc$1;
    } else if (!full) {
      return finish_to_string(acc);
    } else {
      let parent = path.parent;
      if (acc instanceof Empty) {
        loop$full = full;
        loop$path = parent;
        loop$acc = acc;
      } else {
        let acc$1 = acc.tail;
        loop$full = full;
        loop$path = parent;
        loop$acc = prepend(separator_subtree, acc$1);
      }
    }
  }
}
function child(path) {
  return do_to_string(false, path, empty_list);
}
function to_string5(path) {
  return do_to_string(true, path, empty_list);
}
function matches(path, candidates) {
  if (candidates instanceof Empty) {
    return false;
  } else {
    return do_matches(to_string5(path), candidates);
  }
}
function event2(path, event3) {
  return do_to_string(false, path, prepend(separator_event, prepend(event3, empty_list)));
}

// build/dev/javascript/lustre/lustre/vdom/cache.mjs
class Cache extends CustomType {
  constructor(events, vdoms, old_vdoms, dispatched_paths, next_dispatched_paths) {
    super();
    this.events = events;
    this.vdoms = vdoms;
    this.old_vdoms = old_vdoms;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
}

class Events extends CustomType {
  constructor(handlers, children) {
    super();
    this.handlers = handlers;
    this.children = children;
  }
}

class Child extends CustomType {
  constructor(mapper, events) {
    super();
    this.mapper = mapper;
    this.events = events;
  }
}

class AddedChildren extends CustomType {
  constructor(handlers, children, vdoms) {
    super();
    this.handlers = handlers;
    this.children = children;
    this.vdoms = vdoms;
  }
}

class DecodedEvent extends CustomType {
  constructor(path, handler) {
    super();
    this.path = path;
    this.handler = handler;
  }
}

class DispatchedEvent extends CustomType {
  constructor(path) {
    super();
    this.path = path;
  }
}
function compose_mapper(mapper, child_mapper) {
  return (msg) => {
    return mapper(child_mapper(msg));
  };
}
function new_events() {
  return new Events(empty3(), empty3());
}
function new$4() {
  return new Cache(new_events(), empty3(), empty3(), empty_list, empty_list);
}
function tick(cache) {
  return new Cache(cache.events, empty3(), cache.vdoms, cache.next_dispatched_paths, empty_list);
}
function events(cache) {
  return cache.events;
}
function update_events(cache, events2) {
  return new Cache(events2, cache.vdoms, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths);
}
function memos(cache) {
  return cache.vdoms;
}
function get_old_memo(cache, old, new$5) {
  return get_or_compute(cache.old_vdoms, old, new$5);
}
function keep_memo(cache, old, new$5) {
  let node = get_or_compute(cache.old_vdoms, old, new$5);
  let vdoms = insert2(cache.vdoms, new$5, node);
  return new Cache(cache.events, vdoms, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths);
}
function add_memo(cache, new$5, node) {
  let vdoms = insert2(cache.vdoms, new$5, node);
  return new Cache(cache.events, vdoms, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths);
}
function get_subtree(events2, path, old_mapper) {
  let child2 = get_or_compute(events2.children, path, () => {
    return new Child(old_mapper, new_events());
  });
  return child2.events;
}
function update_subtree(parent, path, mapper, events2) {
  let new_child = new Child(mapper, events2);
  let children = insert2(parent.children, path, new_child);
  return new Events(parent.handlers, children);
}
function do_add_event(handlers, path, name, handler) {
  return insert2(handlers, event2(path, name), handler);
}
function add_event(events2, path, name, handler) {
  let handlers = do_add_event(events2.handlers, path, name, handler);
  return new Events(handlers, events2.children);
}
function do_remove_event(handlers, path, name) {
  return remove(handlers, event2(path, name));
}
function remove_event(events2, path, name) {
  let handlers = do_remove_event(events2.handlers, path, name);
  return new Events(handlers, events2.children);
}
function add_attributes(handlers, path, attributes) {
  return fold2(attributes, handlers, (events2, attribute3) => {
    if (attribute3 instanceof Event2) {
      let name = attribute3.name;
      let handler = attribute3.handler;
      return do_add_event(events2, path, name, handler);
    } else {
      return events2;
    }
  });
}
function do_add_children(loop$handlers, loop$children, loop$vdoms, loop$parent, loop$child_index, loop$nodes) {
  while (true) {
    let handlers = loop$handlers;
    let children = loop$children;
    let vdoms = loop$vdoms;
    let parent = loop$parent;
    let child_index = loop$child_index;
    let nodes = loop$nodes;
    let next = child_index + 1;
    if (nodes instanceof Empty) {
      return new AddedChildren(handlers, children, vdoms);
    } else {
      let $ = nodes.head;
      if ($ instanceof Fragment) {
        let rest = nodes.tail;
        let key = $.key;
        let nodes$1 = $.children;
        let path = add2(parent, child_index, key);
        let $1 = do_add_children(handlers, children, vdoms, path, 0, nodes$1);
        let handlers$1;
        let children$1;
        let vdoms$1;
        handlers$1 = $1.handlers;
        children$1 = $1.children;
        vdoms$1 = $1.vdoms;
        loop$handlers = handlers$1;
        loop$children = children$1;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof Element) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let nodes$1 = $.children;
        let path = add2(parent, child_index, key);
        let handlers$1 = add_attributes(handlers, path, attributes);
        let $1 = do_add_children(handlers$1, children, vdoms, path, 0, nodes$1);
        let handlers$2;
        let children$1;
        let vdoms$1;
        handlers$2 = $1.handlers;
        children$1 = $1.children;
        vdoms$1 = $1.vdoms;
        loop$handlers = handlers$2;
        loop$children = children$1;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof Text) {
        let rest = nodes.tail;
        loop$handlers = handlers;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof UnsafeInnerHtml) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let path = add2(parent, child_index, key);
        let handlers$1 = add_attributes(handlers, path, attributes);
        loop$handlers = handlers$1;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else if ($ instanceof Map2) {
        let rest = nodes.tail;
        let key = $.key;
        let mapper = $.mapper;
        let child2 = $.child;
        let path = add2(parent, child_index, key);
        let added = do_add_children(empty3(), empty3(), vdoms, subtree(path), 0, prepend(child2, empty_list));
        let vdoms$1 = added.vdoms;
        let child_events = new Events(added.handlers, added.children);
        let child$1 = new Child(mapper, child_events);
        let children$1 = insert2(children, child(path), child$1);
        loop$handlers = handlers;
        loop$children = children$1;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next;
        loop$nodes = rest;
      } else {
        let rest = nodes.tail;
        let view = $.view;
        let child_node = view();
        let vdoms$1 = insert2(vdoms, view, child_node);
        let next$1 = child_index;
        let rest$1 = prepend(child_node, rest);
        loop$handlers = handlers;
        loop$children = children;
        loop$vdoms = vdoms$1;
        loop$parent = parent;
        loop$child_index = next$1;
        loop$nodes = rest$1;
      }
    }
  }
}
function add_children(cache, events2, path, child_index, nodes) {
  let vdoms = cache.vdoms;
  let handlers;
  let children;
  handlers = events2.handlers;
  children = events2.children;
  let $ = do_add_children(handlers, children, vdoms, path, child_index, nodes);
  let handlers$1;
  let children$1;
  let vdoms$1;
  handlers$1 = $.handlers;
  children$1 = $.children;
  vdoms$1 = $.vdoms;
  return [
    new Cache(cache.events, vdoms$1, cache.old_vdoms, cache.dispatched_paths, cache.next_dispatched_paths),
    new Events(handlers$1, children$1)
  ];
}
function add_child(cache, events2, parent, index4, child2) {
  let children = prepend(child2, empty_list);
  return add_children(cache, events2, parent, index4, children);
}
function from_node(root2) {
  let cache = new$4();
  let $ = add_child(cache, cache.events, root, 0, root2);
  let cache$1;
  let events$1;
  cache$1 = $[0];
  events$1 = $[1];
  return new Cache(events$1, cache$1.vdoms, cache$1.old_vdoms, cache$1.dispatched_paths, cache$1.next_dispatched_paths);
}
function remove_attributes(handlers, path, attributes) {
  return fold2(attributes, handlers, (events2, attribute3) => {
    if (attribute3 instanceof Event2) {
      let name = attribute3.name;
      return do_remove_event(events2, path, name);
    } else {
      return events2;
    }
  });
}
function do_remove_children(loop$handlers, loop$children, loop$vdoms, loop$parent, loop$index, loop$nodes) {
  while (true) {
    let handlers = loop$handlers;
    let children = loop$children;
    let vdoms = loop$vdoms;
    let parent = loop$parent;
    let index4 = loop$index;
    let nodes = loop$nodes;
    let next = index4 + 1;
    if (nodes instanceof Empty) {
      return new Events(handlers, children);
    } else {
      let $ = nodes.head;
      if ($ instanceof Fragment) {
        let rest = nodes.tail;
        let key = $.key;
        let nodes$1 = $.children;
        let path = add2(parent, index4, key);
        let $1 = do_remove_children(handlers, children, vdoms, path, 0, nodes$1);
        let handlers$1;
        let children$1;
        handlers$1 = $1.handlers;
        children$1 = $1.children;
        loop$handlers = handlers$1;
        loop$children = children$1;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof Element) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let nodes$1 = $.children;
        let path = add2(parent, index4, key);
        let handlers$1 = remove_attributes(handlers, path, attributes);
        let $1 = do_remove_children(handlers$1, children, vdoms, path, 0, nodes$1);
        let handlers$2;
        let children$1;
        handlers$2 = $1.handlers;
        children$1 = $1.children;
        loop$handlers = handlers$2;
        loop$children = children$1;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof Text) {
        let rest = nodes.tail;
        loop$handlers = handlers;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof UnsafeInnerHtml) {
        let rest = nodes.tail;
        let key = $.key;
        let attributes = $.attributes;
        let path = add2(parent, index4, key);
        let handlers$1 = remove_attributes(handlers, path, attributes);
        loop$handlers = handlers$1;
        loop$children = children;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else if ($ instanceof Map2) {
        let rest = nodes.tail;
        let key = $.key;
        let path = add2(parent, index4, key);
        let children$1 = remove(children, child(path));
        loop$handlers = handlers;
        loop$children = children$1;
        loop$vdoms = vdoms;
        loop$parent = parent;
        loop$index = next;
        loop$nodes = rest;
      } else {
        let rest = nodes.tail;
        let view = $.view;
        let $1 = has_key(vdoms, view);
        if ($1) {
          let child2 = get2(vdoms, view);
          let nodes$1 = prepend(child2, rest);
          loop$handlers = handlers;
          loop$children = children;
          loop$vdoms = vdoms;
          loop$parent = parent;
          loop$index = index4;
          loop$nodes = nodes$1;
        } else {
          loop$handlers = handlers;
          loop$children = children;
          loop$vdoms = vdoms;
          loop$parent = parent;
          loop$index = next;
          loop$nodes = rest;
        }
      }
    }
  }
}
function remove_child(cache, events2, parent, child_index, child2) {
  return do_remove_children(events2.handlers, events2.children, cache.old_vdoms, parent, child_index, prepend(child2, empty_list));
}
function replace_child(cache, events2, parent, child_index, prev, next) {
  let events$1 = remove_child(cache, events2, parent, child_index, prev);
  return add_child(cache, events$1, parent, child_index, next);
}
function dispatch(cache, event3) {
  let next_dispatched_paths = prepend(event3.path, cache.next_dispatched_paths);
  let cache$1 = new Cache(cache.events, cache.vdoms, cache.old_vdoms, cache.dispatched_paths, next_dispatched_paths);
  if (event3 instanceof DecodedEvent) {
    let handler = event3.handler;
    return [cache$1, new Ok(handler)];
  } else {
    return [cache$1, error_nil];
  }
}
function has_dispatched_events(cache, path) {
  return matches(path, cache.dispatched_paths);
}
function get_handler(loop$events, loop$path, loop$mapper) {
  while (true) {
    let events2 = loop$events;
    let path = loop$path;
    let mapper = loop$mapper;
    if (path instanceof Empty) {
      return error_nil;
    } else {
      let $ = path.tail;
      if ($ instanceof Empty) {
        let key = path.head;
        let $1 = has_key(events2.handlers, key);
        if ($1) {
          let handler = get2(events2.handlers, key);
          return new Ok(map3(handler, (handler2) => {
            return new Handler(handler2.prevent_default, handler2.stop_propagation, identity3(mapper)(handler2.message));
          }));
        } else {
          return error_nil;
        }
      } else {
        let key = path.head;
        let path$1 = $;
        let $1 = has_key(events2.children, key);
        if ($1) {
          let child2 = get2(events2.children, key);
          let mapper$1 = compose_mapper(mapper, child2.mapper);
          loop$events = child2.events;
          loop$path = path$1;
          loop$mapper = mapper$1;
        } else {
          return error_nil;
        }
      }
    }
  }
}
function decode2(cache, path, name, event3) {
  let parts = split_subtree_path(path + separator_event + name);
  let $ = get_handler(cache.events, parts, identity3);
  if ($ instanceof Ok) {
    let handler = $[0];
    let $1 = run(event3, handler);
    if ($1 instanceof Ok) {
      let handler$1 = $1[0];
      return new DecodedEvent(path, handler$1);
    } else {
      return new DispatchedEvent(path);
    }
  } else {
    return new DispatchedEvent(path);
  }
}
function handle(cache, path, name, event3) {
  let _pipe = decode2(cache, path, name, event3);
  return ((_capture) => {
    return dispatch(cache, _capture);
  })(_pipe);
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
class ClientDispatchedMessage extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
}
var Message$isClientDispatchedMessage = (value2) => value2 instanceof ClientDispatchedMessage;
class ClientRegisteredCallback extends CustomType {
  constructor(callback) {
    super();
    this.callback = callback;
  }
}
var Message$isClientRegisteredCallback = (value2) => value2 instanceof ClientRegisteredCallback;
class ClientDeregisteredCallback extends CustomType {
  constructor(callback) {
    super();
    this.callback = callback;
  }
}
var Message$isClientDeregisteredCallback = (value2) => value2 instanceof ClientDeregisteredCallback;
class EffectDispatchedMessage extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
}
var Message$EffectDispatchedMessage = (message) => new EffectDispatchedMessage(message);
var Message$isEffectDispatchedMessage = (value2) => value2 instanceof EffectDispatchedMessage;
class EffectEmitEvent extends CustomType {
  constructor(name, data2) {
    super();
    this.name = name;
    this.data = data2;
  }
}
var Message$EffectEmitEvent = (name, data2) => new EffectEmitEvent(name, data2);
var Message$isEffectEmitEvent = (value2) => value2 instanceof EffectEmitEvent;
class EffectProvidedValue extends CustomType {
  constructor(key, value2) {
    super();
    this.key = key;
    this.value = value2;
  }
}
var Message$EffectProvidedValue = (key, value2) => new EffectProvidedValue(key, value2);
var Message$isEffectProvidedValue = (value2) => value2 instanceof EffectProvidedValue;
class SystemRequestedShutdown extends CustomType {
}
var Message$isSystemRequestedShutdown = (value2) => value2 instanceof SystemRequestedShutdown;

// build/dev/javascript/lustre/lustre/runtime/app.mjs
class App extends CustomType {
  constructor(name, init, update2, view, config2) {
    super();
    this.name = name;
    this.init = init;
    this.update = update2;
    this.view = view;
    this.config = config2;
  }
}
class Config2 extends CustomType {
  constructor(open_shadow_root, adopt_styles, delegates_focus, attributes, properties, contexts, is_form_associated, on_form_autofill, on_form_reset, on_form_restore, on_connect, on_adopt, on_disconnect) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.delegates_focus = delegates_focus;
    this.attributes = attributes;
    this.properties = properties;
    this.contexts = contexts;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
    this.on_connect = on_connect;
    this.on_adopt = on_adopt;
    this.on_disconnect = on_disconnect;
  }
}
var default_config = /* @__PURE__ */ new Config2(true, true, false, empty_list, empty_list, empty_list, false, /* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None);

// build/dev/javascript/lustre/lustre/internals/equals.ffi.mjs
var isEqual2 = (a2, b) => {
  if (a2 === b) {
    return true;
  }
  if (a2 == null || b == null) {
    return false;
  }
  const type = typeof a2;
  if (type !== typeof b) {
    return false;
  }
  if (type !== "object") {
    return false;
  }
  const ctor = a2.constructor;
  if (ctor !== b.constructor) {
    return false;
  }
  if (Array.isArray(a2)) {
    return areArraysEqual(a2, b);
  }
  return areObjectsEqual(a2, b);
};
var areArraysEqual = (a2, b) => {
  let index4 = a2.length;
  if (index4 !== b.length) {
    return false;
  }
  while (index4--) {
    if (!isEqual2(a2[index4], b[index4])) {
      return false;
    }
  }
  return true;
};
var areObjectsEqual = (a2, b) => {
  const properties = Object.keys(a2);
  let index4 = properties.length;
  if (Object.keys(b).length !== index4) {
    return false;
  }
  while (index4--) {
    const property3 = properties[index4];
    if (!Object.hasOwn(b, property3)) {
      return false;
    }
    if (!isEqual2(a2[property3], b[property3])) {
      return false;
    }
  }
  return true;
};

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
class Diff extends CustomType {
  constructor(patch, cache) {
    super();
    this.patch = patch;
    this.cache = cache;
  }
}
class PartialDiff extends CustomType {
  constructor(patch, cache, events2) {
    super();
    this.patch = patch;
    this.cache = cache;
    this.events = events2;
  }
}

class AttributeChange extends CustomType {
  constructor(added, removed, events2) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events2;
  }
}
function is_controlled(cache, namespace, tag, path) {
  if (tag === "input" && namespace === "") {
    return has_dispatched_events(cache, path);
  } else if (tag === "select" && namespace === "") {
    return has_dispatched_events(cache, path);
  } else if (tag === "textarea" && namespace === "") {
    return has_dispatched_events(cache, path);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path = loop$path;
    let events2 = loop$events;
    let old = loop$old;
    let new$5 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (old instanceof Empty) {
      if (new$5 instanceof Empty) {
        return new AttributeChange(added, removed, events2);
      } else {
        let $ = new$5.head;
        if ($ instanceof Event2) {
          let next = $;
          let new$1 = new$5.tail;
          let name = $.name;
          let handler = $.handler;
          let events$1 = add_event(events2, path, name, handler);
          let added$1 = prepend(next, added);
          loop$controlled = controlled;
          loop$path = path;
          loop$events = events$1;
          loop$old = old;
          loop$new = new$1;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let next = $;
          let new$1 = new$5.tail;
          let added$1 = prepend(next, added);
          loop$controlled = controlled;
          loop$path = path;
          loop$events = events2;
          loop$old = old;
          loop$new = new$1;
          loop$added = added$1;
          loop$removed = removed;
        }
      }
    } else if (new$5 instanceof Empty) {
      let $ = old.head;
      if ($ instanceof Event2) {
        let prev = $;
        let old$1 = old.tail;
        let name = $.name;
        let events$1 = remove_event(events2, path, name);
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$events = events$1;
        loop$old = old$1;
        loop$new = new$5;
        loop$added = added;
        loop$removed = removed$1;
      } else {
        let prev = $;
        let old$1 = old.tail;
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$events = events2;
        loop$old = old$1;
        loop$new = new$5;
        loop$added = added;
        loop$removed = removed$1;
      }
    } else {
      let prev = old.head;
      let remaining_old = old.tail;
      let next = new$5.head;
      let remaining_new = new$5.tail;
      let $ = compare4(prev, next);
      if ($ instanceof Lt) {
        if (prev instanceof Event2) {
          let name = prev.name;
          loop$controlled = controlled;
          loop$path = path;
          loop$events = remove_event(events2, path, name);
          loop$old = remaining_old;
          loop$new = new$5;
          loop$added = added;
          loop$removed = prepend(prev, removed);
        } else {
          loop$controlled = controlled;
          loop$path = path;
          loop$events = events2;
          loop$old = remaining_old;
          loop$new = new$5;
          loop$added = added;
          loop$removed = prepend(prev, removed);
        }
      } else if ($ instanceof Eq) {
        if (prev instanceof Attribute) {
          if (next instanceof Attribute) {
            let _block;
            let $1 = next.name;
            if ($1 === "value") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "checked") {
              _block = controlled || prev.value !== next.value;
            } else if ($1 === "selected") {
              _block = controlled || prev.value !== next.value;
            } else {
              _block = prev.value !== next.value;
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (next instanceof Event2) {
            let name = next.name;
            let handler = next.handler;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = add_event(events2, path, name, handler);
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          } else {
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          }
        } else if (prev instanceof Property) {
          if (next instanceof Property) {
            let _block;
            let $1 = next.name;
            if ($1 === "scrollLeft") {
              _block = true;
            } else if ($1 === "scrollRight") {
              _block = true;
            } else if ($1 === "value") {
              _block = controlled || !isEqual2(prev.value, next.value);
            } else if ($1 === "checked") {
              _block = controlled || !isEqual2(prev.value, next.value);
            } else if ($1 === "selected") {
              _block = controlled || !isEqual2(prev.value, next.value);
            } else {
              _block = !isEqual2(prev.value, next.value);
            }
            let has_changes = _block;
            let _block$1;
            if (has_changes) {
              _block$1 = prepend(next, added);
            } else {
              _block$1 = added;
            }
            let added$1 = _block$1;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = added$1;
            loop$removed = removed;
          } else if (next instanceof Event2) {
            let name = next.name;
            let handler = next.handler;
            loop$controlled = controlled;
            loop$path = path;
            loop$events = add_event(events2, path, name, handler);
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          } else {
            loop$controlled = controlled;
            loop$path = path;
            loop$events = events2;
            loop$old = remaining_old;
            loop$new = remaining_new;
            loop$added = prepend(next, added);
            loop$removed = prepend(prev, removed);
          }
        } else if (next instanceof Event2) {
          let name = next.name;
          let handler = next.handler;
          let has_changes = prev.prevent_default.kind !== next.prevent_default.kind || prev.stop_propagation.kind !== next.stop_propagation.kind || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
          let _block;
          if (has_changes) {
            _block = prepend(next, added);
          } else {
            _block = added;
          }
          let added$1 = _block;
          loop$controlled = controlled;
          loop$path = path;
          loop$events = add_event(events2, path, name, handler);
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = added$1;
          loop$removed = removed;
        } else {
          let name = prev.name;
          loop$controlled = controlled;
          loop$path = path;
          loop$events = remove_event(events2, path, name);
          loop$old = remaining_old;
          loop$new = remaining_new;
          loop$added = prepend(next, added);
          loop$removed = prepend(prev, removed);
        }
      } else if (next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        loop$controlled = controlled;
        loop$path = path;
        loop$events = add_event(events2, path, name, handler);
        loop$old = old;
        loop$new = remaining_new;
        loop$added = prepend(next, added);
        loop$removed = removed;
      } else {
        loop$controlled = controlled;
        loop$path = path;
        loop$events = events2;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = prepend(next, added);
        loop$removed = removed;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$changes, loop$children, loop$path, loop$cache, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$5 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let changes = loop$changes;
    let children = loop$children;
    let path = loop$path;
    let cache = loop$cache;
    let events2 = loop$events;
    if (old instanceof Empty) {
      if (new$5 instanceof Empty) {
        let patch = new Patch(patch_index, removed, changes, children);
        return new PartialDiff(patch, cache, events2);
      } else {
        let $ = add_children(cache, events2, path, node_index, new$5);
        let cache$1;
        let events$1;
        cache$1 = $[0];
        events$1 = $[1];
        let insert4 = insert3(new$5, node_index - moved_offset);
        let changes$1 = prepend(insert4, changes);
        let patch = new Patch(patch_index, removed, changes$1, children);
        return new PartialDiff(patch, cache$1, events$1);
      }
    } else if (new$5 instanceof Empty) {
      let prev = old.head;
      let old$1 = old.tail;
      let _block;
      let $ = prev.key === "" || !has_key(moved, prev.key);
      if ($) {
        _block = removed + 1;
      } else {
        _block = removed;
      }
      let removed$1 = _block;
      let events$1 = remove_child(cache, events2, path, node_index, prev);
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$5;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed$1;
      loop$node_index = node_index;
      loop$patch_index = patch_index;
      loop$changes = changes;
      loop$children = children;
      loop$path = path;
      loop$cache = cache;
      loop$events = events$1;
    } else {
      let prev = old.head;
      let next = new$5.head;
      if (prev.key !== next.key) {
        let old_remaining = old.tail;
        let new_remaining = new$5.tail;
        let next_did_exist = has_key(old_keyed, next.key);
        let prev_does_exist = has_key(new_keyed, prev.key);
        if (prev_does_exist) {
          if (next_did_exist) {
            let $ = has_key(moved, prev.key);
            if ($) {
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new$5;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset - 1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            } else {
              let match = get2(old_keyed, next.key);
              let before = node_index - moved_offset;
              let changes$1 = prepend(move(next.key, before), changes);
              let moved$1 = insert2(moved, next.key, undefined);
              loop$old = prepend(match, old);
              loop$old_keyed = old_keyed;
              loop$new = new$5;
              loop$new_keyed = new_keyed;
              loop$moved = moved$1;
              loop$moved_offset = moved_offset + 1;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$changes = changes$1;
              loop$children = children;
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            }
          } else {
            let before = node_index - moved_offset;
            let $ = add_child(cache, events2, path, node_index, next);
            let cache$1;
            let events$1;
            cache$1 = $[0];
            events$1 = $[1];
            let insert4 = insert3(toList([next]), before);
            let changes$1 = prepend(insert4, changes);
            loop$old = old;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset + 1;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes$1;
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if (next_did_exist) {
          let index4 = node_index - moved_offset;
          let changes$1 = prepend(remove2(index4), changes);
          let events$1 = remove_child(cache, events2, path, node_index, prev);
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new$5;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset - 1;
          loop$removed = removed;
          loop$node_index = node_index;
          loop$patch_index = patch_index;
          loop$changes = changes$1;
          loop$children = children;
          loop$path = path;
          loop$cache = cache;
          loop$events = events$1;
        } else {
          let change = replace2(node_index - moved_offset, next);
          let $ = replace_child(cache, events2, path, node_index, prev, next);
          let cache$1;
          let events$1;
          cache$1 = $[0];
          events$1 = $[1];
          loop$old = old_remaining;
          loop$old_keyed = old_keyed;
          loop$new = new_remaining;
          loop$new_keyed = new_keyed;
          loop$moved = moved;
          loop$moved_offset = moved_offset;
          loop$removed = removed;
          loop$node_index = node_index + 1;
          loop$patch_index = patch_index;
          loop$changes = prepend(change, changes);
          loop$children = children;
          loop$path = path;
          loop$cache = cache$1;
          loop$events = events$1;
        }
      } else {
        let $ = old.head;
        if ($ instanceof Fragment) {
          let $1 = new$5.head;
          if ($1 instanceof Fragment) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let $2 = do_diff(prev2.children, prev2.keyed_children, next2.children, next2.keyed_children, empty3(), 0, 0, 0, node_index, empty_list, empty_list, add2(path, node_index, next2.key), cache, events2);
            let patch;
            let cache$1;
            let events$1;
            patch = $2.patch;
            cache$1 = $2.cache;
            events$1 = $2.events;
            let _block;
            let $3 = patch.changes;
            if ($3 instanceof Empty) {
              let $4 = patch.children;
              if ($4 instanceof Empty) {
                let $5 = patch.removed;
                if ($5 === 0) {
                  _block = children;
                } else {
                  _block = prepend(patch, children);
                }
              } else {
                _block = prepend(patch, children);
              }
            } else {
              _block = prepend(patch, children);
            }
            let children$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes;
            loop$children = children$1;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1;
            let events$1;
            cache$1 = $2[0];
            events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof Element) {
          let $1 = new$5.head;
          if ($1 instanceof Element) {
            let prev2 = $;
            let next2 = $1;
            if (prev2.namespace === next2.namespace && prev2.tag === next2.tag) {
              let old$1 = old.tail;
              let new$1 = new$5.tail;
              let child_path = add2(path, node_index, next2.key);
              let controlled = is_controlled(cache, next2.namespace, next2.tag, child_path);
              let $2 = diff_attributes(controlled, child_path, events2, prev2.attributes, next2.attributes, empty_list, empty_list);
              let added_attrs;
              let removed_attrs;
              let events$1;
              added_attrs = $2.added;
              removed_attrs = $2.removed;
              events$1 = $2.events;
              let _block;
              if (added_attrs instanceof Empty && removed_attrs instanceof Empty) {
                _block = empty_list;
              } else {
                _block = toList([update(added_attrs, removed_attrs)]);
              }
              let initial_child_changes = _block;
              let $3 = do_diff(prev2.children, prev2.keyed_children, next2.children, next2.keyed_children, empty3(), 0, 0, 0, node_index, initial_child_changes, empty_list, child_path, cache, events$1);
              let patch;
              let cache$1;
              let events$2;
              patch = $3.patch;
              cache$1 = $3.cache;
              events$2 = $3.events;
              let _block$1;
              let $4 = patch.changes;
              if ($4 instanceof Empty) {
                let $5 = patch.children;
                if ($5 instanceof Empty) {
                  let $6 = patch.removed;
                  if ($6 === 0) {
                    _block$1 = children;
                  } else {
                    _block$1 = prepend(patch, children);
                  }
                } else {
                  _block$1 = prepend(patch, children);
                }
              } else {
                _block$1 = prepend(patch, children);
              }
              let children$1 = _block$1;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children$1;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events$2;
            } else {
              let prev3 = $;
              let old_remaining = old.tail;
              let next3 = $1;
              let new_remaining = new$5.tail;
              let change = replace2(node_index - moved_offset, next3);
              let $2 = replace_child(cache, events2, path, node_index, prev3, next3);
              let cache$1;
              let events$1;
              cache$1 = $2[0];
              events$1 = $2[1];
              loop$old = old_remaining;
              loop$old_keyed = old_keyed;
              loop$new = new_remaining;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = prepend(change, changes);
              loop$children = children;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events$1;
            }
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1;
            let events$1;
            cache$1 = $2[0];
            events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof Text) {
          let $1 = new$5.head;
          if ($1 instanceof Text) {
            let prev2 = $;
            let next2 = $1;
            if (prev2.content === next2.content) {
              let old$1 = old.tail;
              let new$1 = new$5.tail;
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            } else {
              let old$1 = old.tail;
              let next3 = $1;
              let new$1 = new$5.tail;
              let child2 = new$3(node_index, 0, toList([replace_text(next3.content)]), empty_list);
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = prepend(child2, children);
              loop$path = path;
              loop$cache = cache;
              loop$events = events2;
            }
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1;
            let events$1;
            cache$1 = $2[0];
            events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof UnsafeInnerHtml) {
          let $1 = new$5.head;
          if ($1 instanceof UnsafeInnerHtml) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let child_path = add2(path, node_index, next2.key);
            let $2 = diff_attributes(false, child_path, events2, prev2.attributes, next2.attributes, empty_list, empty_list);
            let added_attrs;
            let removed_attrs;
            let events$1;
            added_attrs = $2.added;
            removed_attrs = $2.removed;
            events$1 = $2.events;
            let _block;
            if (added_attrs instanceof Empty && removed_attrs instanceof Empty) {
              _block = empty_list;
            } else {
              _block = toList([update(added_attrs, removed_attrs)]);
            }
            let child_changes = _block;
            let _block$1;
            let $3 = prev2.inner_html === next2.inner_html;
            if ($3) {
              _block$1 = child_changes;
            } else {
              _block$1 = prepend(replace_inner_html(next2.inner_html), child_changes);
            }
            let child_changes$1 = _block$1;
            let _block$2;
            if (child_changes$1 instanceof Empty) {
              _block$2 = children;
            } else {
              _block$2 = prepend(new$3(node_index, 0, child_changes$1, toList([])), children);
            }
            let children$1 = _block$2;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes;
            loop$children = children$1;
            loop$path = path;
            loop$cache = cache;
            loop$events = events$1;
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1;
            let events$1;
            cache$1 = $2[0];
            events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else if ($ instanceof Map2) {
          let $1 = new$5.head;
          if ($1 instanceof Map2) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let child_path = add2(path, node_index, next2.key);
            let child_key = child(child_path);
            let $2 = do_diff(prepend(prev2.child, empty_list), empty3(), prepend(next2.child, empty_list), empty3(), empty3(), 0, 0, 0, node_index, empty_list, empty_list, subtree(child_path), cache, get_subtree(events2, child_key, prev2.mapper));
            let patch;
            let cache$1;
            let child_events;
            patch = $2.patch;
            cache$1 = $2.cache;
            child_events = $2.events;
            let events$1 = update_subtree(events2, child_key, next2.mapper, child_events);
            let _block;
            let $3 = patch.changes;
            if ($3 instanceof Empty) {
              let $4 = patch.children;
              if ($4 instanceof Empty) {
                let $5 = patch.removed;
                if ($5 === 0) {
                  _block = children;
                } else {
                  _block = prepend(patch, children);
                }
              } else {
                _block = prepend(patch, children);
              }
            } else {
              _block = prepend(patch, children);
            }
            let children$1 = _block;
            loop$old = old$1;
            loop$old_keyed = old_keyed;
            loop$new = new$1;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = changes;
            loop$children = children$1;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1;
            let events$1;
            cache$1 = $2[0];
            events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        } else {
          let $1 = new$5.head;
          if ($1 instanceof Memo) {
            let prev2 = $;
            let old$1 = old.tail;
            let next2 = $1;
            let new$1 = new$5.tail;
            let $2 = equal_lists(prev2.dependencies, next2.dependencies);
            if ($2) {
              let cache$1 = keep_memo(cache, prev2.view, next2.view);
              loop$old = old$1;
              loop$old_keyed = old_keyed;
              loop$new = new$1;
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index + 1;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events2;
            } else {
              let prev_node = get_old_memo(cache, prev2.view, prev2.view);
              let next_node = next2.view();
              let cache$1 = add_memo(cache, next2.view, next_node);
              loop$old = prepend(prev_node, old$1);
              loop$old_keyed = old_keyed;
              loop$new = prepend(next_node, new$1);
              loop$new_keyed = new_keyed;
              loop$moved = moved;
              loop$moved_offset = moved_offset;
              loop$removed = removed;
              loop$node_index = node_index;
              loop$patch_index = patch_index;
              loop$changes = changes;
              loop$children = children;
              loop$path = path;
              loop$cache = cache$1;
              loop$events = events2;
            }
          } else {
            let prev2 = $;
            let old_remaining = old.tail;
            let next2 = $1;
            let new_remaining = new$5.tail;
            let change = replace2(node_index - moved_offset, next2);
            let $2 = replace_child(cache, events2, path, node_index, prev2, next2);
            let cache$1;
            let events$1;
            cache$1 = $2[0];
            events$1 = $2[1];
            loop$old = old_remaining;
            loop$old_keyed = old_keyed;
            loop$new = new_remaining;
            loop$new_keyed = new_keyed;
            loop$moved = moved;
            loop$moved_offset = moved_offset;
            loop$removed = removed;
            loop$node_index = node_index + 1;
            loop$patch_index = patch_index;
            loop$changes = prepend(change, changes);
            loop$children = children;
            loop$path = path;
            loop$cache = cache$1;
            loop$events = events$1;
          }
        }
      }
    }
  }
}
function diff(cache, old, new$5) {
  let cache$1 = tick(cache);
  let $ = do_diff(prepend(old, empty_list), empty3(), prepend(new$5, empty_list), empty3(), empty3(), 0, 0, 0, 0, empty_list, empty_list, root, cache$1, events(cache$1));
  let patch;
  let cache$2;
  let events2;
  patch = $.patch;
  cache$2 = $.cache;
  events2 = $.events;
  return new Diff(patch, update_events(cache$2, events2));
}

// build/dev/javascript/lustre/lustre/internals/list.ffi.mjs
var toList2 = (arr) => arr.reduceRight((xs, x) => List$NonEmpty(x, xs), empty_list);
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0;i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4;List$NonEmpty$rest(list4); list4 = List$NonEmpty$rest(list4)) {
      callback(List$NonEmpty$first(list4));
    }
  }
};
var append4 = (a2, b) => {
  if (!List$NonEmpty$rest(a2)) {
    return b;
  } else if (!List$NonEmpty$rest(b)) {
    return a2;
  } else {
    return append(a2, b);
  }
};

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var setTimeout = globalThis.setTimeout;
var clearTimeout = globalThis.clearTimeout;
var createElementNS = (ns, name) => globalThis.document.createElementNS(ns, name);
var createTextNode = (data2) => globalThis.document.createTextNode(data2);
var createComment = (data2) => globalThis.document.createComment(data2);
var createDocumentFragment = () => globalThis.document.createDocumentFragment();
var insertBefore = (parent, node, reference) => parent.insertBefore(node, reference);
var moveBefore = SUPPORTS_MOVE_BEFORE ? (parent, node, reference) => parent.moveBefore(node, reference) : insertBefore;
var removeChild = (parent, child2) => parent.removeChild(child2);
var getAttribute = (node, name) => node.getAttribute(name);
var setAttribute = (node, name, value2) => node.setAttribute(name, value2);
var removeAttribute = (node, name) => node.removeAttribute(name);
var addEventListener = (node, name, handler, options) => node.addEventListener(name, handler, options);
var removeEventListener = (node, name, handler) => node.removeEventListener(name, handler);
var setInnerHtml = (node, innerHtml) => node.innerHTML = innerHtml;
var setData = (node, data2) => node.data = data2;
var meta = Symbol("lustre");

class MetadataNode {
  constructor(kind, parent, node, key) {
    this.kind = kind;
    this.key = key;
    this.parent = parent;
    this.children = [];
    this.node = node;
    this.endNode = null;
    this.handlers = new Map;
    this.throttles = new Map;
    this.debouncers = new Map;
  }
  get isVirtual() {
    return this.kind === fragment_kind || this.kind === map_kind;
  }
  get parentNode() {
    return this.isVirtual ? this.node.parentNode : this.node;
  }
}
var insertMetadataChild = (kind, parent, node, index4, key) => {
  const child2 = new MetadataNode(kind, parent, node, key);
  node[meta] = child2;
  parent?.children.splice(index4, 0, child2);
  return child2;
};
var getPath = (node) => {
  let path = "";
  for (let current = node[meta];current.parent; current = current.parent) {
    const separator = current.parent && current.parent.kind === map_kind ? separator_subtree : separator_element;
    if (current.key) {
      path = `${separator}${current.key}${path}`;
    } else {
      const index4 = current.parent.children.indexOf(current);
      path = `${separator}${index4}${path}`;
    }
  }
  return path.slice(1);
};

class Reconciler {
  #root = null;
  #decodeEvent;
  #dispatch;
  #debug = false;
  constructor(root2, decodeEvent, dispatch2, { debug = false } = {}) {
    this.#root = root2;
    this.#decodeEvent = decodeEvent;
    this.#dispatch = dispatch2;
    this.#debug = debug;
  }
  mount(vdom) {
    insertMetadataChild(element_kind, null, this.#root, 0, null);
    this.#insertChild(this.#root, null, this.#root[meta], 0, vdom);
  }
  push(patch, memos2 = null) {
    this.#memos = memos2;
    this.#stack.push({ node: this.#root[meta], patch });
    this.#reconcile();
  }
  #memos;
  #stack = [];
  #reconcile() {
    const stack = this.#stack;
    while (stack.length) {
      const { node, patch } = stack.pop();
      const { children: childNodes } = node;
      const { changes, removed, children: childPatches } = patch;
      iterate(changes, (change) => this.#patch(node, change));
      if (removed) {
        this.#removeChildren(node, childNodes.length - removed, removed);
      }
      iterate(childPatches, (childPatch) => {
        const child2 = childNodes[childPatch.index | 0];
        this.#stack.push({ node: child2, patch: childPatch });
      });
    }
  }
  #patch(node, change) {
    switch (change.kind) {
      case replace_text_kind:
        this.#replaceText(node, change);
        break;
      case replace_inner_html_kind:
        this.#replaceInnerHtml(node, change);
        break;
      case update_kind:
        this.#update(node, change);
        break;
      case move_kind:
        this.#move(node, change);
        break;
      case remove_kind:
        this.#remove(node, change);
        break;
      case replace_kind:
        this.#replace(node, change);
        break;
      case insert_kind:
        this.#insert(node, change);
        break;
    }
  }
  #insert(parent, { children, before }) {
    const fragment3 = createDocumentFragment();
    const beforeEl = this.#getReference(parent, before);
    this.#insertChildren(fragment3, null, parent, before | 0, children);
    insertBefore(parent.parentNode, fragment3, beforeEl);
  }
  #replace(parent, { index: index4, with: child2 }) {
    this.#removeChildren(parent, index4 | 0, 1);
    const beforeEl = this.#getReference(parent, index4);
    this.#insertChild(parent.parentNode, beforeEl, parent, index4 | 0, child2);
  }
  #getReference(node, index4) {
    index4 = index4 | 0;
    const { children } = node;
    const childCount = children.length;
    if (index4 < childCount)
      return children[index4].node;
    if (node.endNode)
      return node.endNode;
    if (!node.isVirtual)
      return null;
    while (node.isVirtual && node.children.length) {
      if (node.endNode)
        return node.endNode.nextSibling;
      node = node.children[node.children.length - 1];
    }
    return node.node.nextSibling;
  }
  #move(parent, { key, before }) {
    before = before | 0;
    const { children, parentNode } = parent;
    const beforeEl = children[before].node;
    let prev = children[before];
    for (let i = before + 1;i < children.length; ++i) {
      const next = children[i];
      children[i] = prev;
      prev = next;
      if (next.key === key) {
        children[before] = next;
        break;
      }
    }
    this.#moveChild(parentNode, prev, beforeEl);
  }
  #moveChildren(domParent, children, beforeEl) {
    for (let i = 0;i < children.length; ++i) {
      this.#moveChild(domParent, children[i], beforeEl);
    }
  }
  #moveChild(domParent, child2, beforeEl) {
    moveBefore(domParent, child2.node, beforeEl);
    if (child2.isVirtual) {
      this.#moveChildren(domParent, child2.children, beforeEl);
    }
    if (child2.endNode) {
      moveBefore(domParent, child2.endNode, beforeEl);
    }
  }
  #remove(parent, { index: index4 }) {
    this.#removeChildren(parent, index4, 1);
  }
  #removeChildren(parent, index4, count2) {
    const { children, parentNode } = parent;
    const deleted = children.splice(index4, count2);
    for (let i = 0;i < deleted.length; ++i) {
      const child2 = deleted[i];
      const { node, endNode, isVirtual, children: nestedChildren } = child2;
      removeChild(parentNode, node);
      if (endNode) {
        removeChild(parentNode, endNode);
      }
      this.#removeDebouncers(child2);
      if (isVirtual) {
        deleted.push(...nestedChildren);
      }
    }
  }
  #removeDebouncers(node) {
    const { debouncers, children } = node;
    for (const { timeout } of debouncers.values()) {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
    debouncers.clear();
    iterate(children, (child2) => this.#removeDebouncers(child2));
  }
  #update({ node, handlers, throttles, debouncers }, { added, removed }) {
    iterate(removed, ({ name }) => {
      if (handlers.delete(name)) {
        removeEventListener(node, name, handleEvent);
        this.#updateDebounceThrottle(throttles, name, 0);
        this.#updateDebounceThrottle(debouncers, name, 0);
      } else {
        removeAttribute(node, name);
        SYNCED_ATTRIBUTES[name]?.removed?.(node, name);
      }
    });
    iterate(added, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #replaceText({ node }, { content }) {
    setData(node, content ?? "");
  }
  #replaceInnerHtml({ node }, { inner_html }) {
    setInnerHtml(node, inner_html ?? "");
  }
  #insertChildren(domParent, beforeEl, metaParent, index4, children) {
    iterate(children, (child2) => this.#insertChild(domParent, beforeEl, metaParent, index4++, child2));
  }
  #insertChild(domParent, beforeEl, metaParent, index4, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = this.#createElement(metaParent, index4, vnode);
        this.#insertChildren(node, null, node[meta], 0, vnode.children);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case text_kind: {
        const node = this.#createTextNode(metaParent, index4, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case fragment_kind: {
        const marker = "lustre:fragment";
        const head = this.#createHead(marker, metaParent, index4, vnode);
        insertBefore(domParent, head, beforeEl);
        this.#insertChildren(domParent, beforeEl, head[meta], 0, vnode.children);
        if (this.#debug) {
          head[meta].endNode = createComment(` /${marker} `);
          insertBefore(domParent, head[meta].endNode, beforeEl);
        }
        break;
      }
      case unsafe_inner_html_kind: {
        const node = this.#createElement(metaParent, index4, vnode);
        this.#replaceInnerHtml({ node }, vnode);
        insertBefore(domParent, node, beforeEl);
        break;
      }
      case map_kind: {
        const head = this.#createHead("lustre:map", metaParent, index4, vnode);
        insertBefore(domParent, head, beforeEl);
        this.#insertChild(domParent, beforeEl, head[meta], 0, vnode.child);
        break;
      }
      case memo_kind: {
        const child2 = this.#memos?.get(vnode.view) ?? vnode.view();
        this.#insertChild(domParent, beforeEl, metaParent, index4, child2);
        break;
      }
    }
  }
  #createElement(parent, index4, { kind, key, tag, namespace, attributes }) {
    const node = createElementNS(namespace || NAMESPACE_HTML, tag);
    insertMetadataChild(kind, parent, node, index4, key);
    if (this.#debug && key) {
      setAttribute(node, "data-lustre-key", key);
    }
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
    return node;
  }
  #createTextNode(parent, index4, { kind, key, content }) {
    const node = createTextNode(content ?? "");
    insertMetadataChild(kind, parent, node, index4, key);
    return node;
  }
  #createHead(marker, parent, index4, { kind, key }) {
    const node = this.#debug ? createComment(markerComment(marker, key)) : createTextNode("");
    insertMetadataChild(kind, parent, node, index4, key);
    return node;
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name,
      value: value2,
      prevent_default: prevent,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value2 ?? "";
        if (name === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        } else if (name === "virtual:defaultChecked") {
          node.defaultChecked = true;
          return;
        } else if (name === "virtual:defaultSelected") {
          node.defaultSelected = true;
          return;
        }
        if (valueOrDefault !== getAttribute(node, name)) {
          setAttribute(node, name, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name]?.added?.(node, valueOrDefault);
        break;
      }
      case property_kind:
        node[name] = value2;
        break;
      case event_kind: {
        if (handlers.has(name)) {
          removeEventListener(node, name, handleEvent);
        }
        const passive = prevent.kind === never_kind;
        addEventListener(node, name, handleEvent, { passive });
        this.#updateDebounceThrottle(throttles, name, throttleDelay);
        this.#updateDebounceThrottle(debouncers, name, debounceDelay);
        handlers.set(name, (event3) => this.#handleEvent(attribute3, event3));
        break;
      }
    }
  }
  #updateDebounceThrottle(map7, name, delay) {
    const debounceOrThrottle = map7.get(name);
    if (delay > 0) {
      if (debounceOrThrottle) {
        debounceOrThrottle.delay = delay;
      } else {
        map7.set(name, { delay });
      }
    } else if (debounceOrThrottle) {
      const { timeout } = debounceOrThrottle;
      if (timeout) {
        clearTimeout(timeout);
      }
      map7.delete(name);
    }
  }
  #handleEvent(attribute3, event3) {
    const { currentTarget, type } = event3;
    const { debouncers, throttles } = currentTarget[meta];
    const path = getPath(currentTarget);
    const {
      prevent_default: prevent,
      stop_propagation: stop,
      include
    } = attribute3;
    if (prevent.kind === always_kind)
      event3.preventDefault();
    if (stop.kind === always_kind)
      event3.stopPropagation();
    if (type === "submit") {
      event3.detail ??= {};
      event3.detail.formData = [
        ...new FormData(event3.target, event3.submitter).entries()
      ];
    }
    const data2 = this.#decodeEvent(event3, path, type, include);
    const throttle = throttles.get(type);
    if (throttle) {
      const now = Date.now();
      const last = throttle.last || 0;
      if (now > last + throttle.delay) {
        throttle.last = now;
        throttle.lastEvent = event3;
        this.#dispatch(event3, data2);
      }
    }
    const debounce = debouncers.get(type);
    if (debounce) {
      clearTimeout(debounce.timeout);
      debounce.timeout = setTimeout(() => {
        if (event3 === throttles.get(type)?.lastEvent)
          return;
        this.#dispatch(event3, data2);
      }, debounce.delay);
    }
    if (!throttle && !debounce) {
      this.#dispatch(event3, data2);
    }
  }
}
var markerComment = (marker, key) => {
  if (key) {
    return ` ${marker} key="${escape2(key)}" `;
  } else {
    return ` ${marker} `;
  }
};
var handleEvent = (event3) => {
  const { currentTarget, type } = event3;
  const handler = currentTarget[meta].handlers.get(type);
  handler(event3);
};
var syncedBooleanAttribute = (name) => {
  return {
    added(node) {
      node[name] = true;
    },
    removed(node) {
      node[name] = false;
    }
  };
};
var syncedAttribute = (name) => {
  return {
    added(node, value2) {
      node[name] = value2;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => {
        node.focus?.();
      });
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/element/keyed.mjs
function do_extract_keyed_children(loop$key_children_pairs, loop$keyed_children, loop$children) {
  while (true) {
    let key_children_pairs = loop$key_children_pairs;
    let keyed_children = loop$keyed_children;
    let children = loop$children;
    if (key_children_pairs instanceof Empty) {
      return [keyed_children, reverse(children)];
    } else {
      let rest = key_children_pairs.tail;
      let key = key_children_pairs.head[0];
      let element$1 = key_children_pairs.head[1];
      let keyed_element = to_keyed(key, element$1);
      let _block;
      if (key === "") {
        _block = keyed_children;
      } else {
        _block = insert2(keyed_children, key, keyed_element);
      }
      let keyed_children$1 = _block;
      let children$1 = prepend(keyed_element, children);
      loop$key_children_pairs = rest;
      loop$keyed_children = keyed_children$1;
      loop$children = children$1;
    }
  }
}
function extract_keyed_children(children) {
  return do_extract_keyed_children(children, empty3(), empty_list);
}
function element3(tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return element("", "", tag, attributes, children$1, keyed_children, false, is_void_html_element(tag, ""));
}
function namespaced2(namespace, tag, attributes, children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return element("", namespace, tag, attributes, children$1, keyed_children, false, is_void_html_element(tag, namespace));
}
function fragment3(children) {
  let $ = extract_keyed_children(children);
  let keyed_children;
  let children$1;
  keyed_children = $[0];
  children$1 = $[1];
  return fragment("", children$1, keyed_children);
}

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root2) => {
  const rootMeta = insertMetadataChild(element_kind, null, root2, 0, null);
  for (let child2 = root2.firstChild;child2; child2 = child2.nextSibling) {
    const result = virtualiseChild(rootMeta, root2, child2, 0);
    if (result)
      return result.vnode;
  }
  const placeholder2 = globalThis.document.createTextNode("");
  insertMetadataChild(text_kind, rootMeta, placeholder2, 0, null);
  root2.insertBefore(placeholder2, root2.firstChild);
  return none2();
};
var virtualiseChild = (meta2, domParent, child2, index4) => {
  if (child2.nodeType === COMMENT_NODE) {
    const data2 = child2.data.trim();
    if (data2.startsWith("lustre:fragment")) {
      return virtualiseFragment(meta2, domParent, child2, index4);
    }
    if (data2.startsWith("lustre:map")) {
      return virtualiseMap(meta2, domParent, child2, index4);
    }
    if (data2.startsWith("lustre:memo")) {
      return virtualiseMemo(meta2, domParent, child2, index4);
    }
    return null;
  }
  if (child2.nodeType === ELEMENT_NODE) {
    return virtualiseElement(meta2, child2, index4);
  }
  if (child2.nodeType === TEXT_NODE) {
    return virtualiseText(meta2, child2, index4);
  }
  return null;
};
var virtualiseElement = (metaParent, node, index4) => {
  const key = node.getAttribute("data-lustre-key") ?? "";
  if (key) {
    node.removeAttribute("data-lustre-key");
  }
  const meta2 = insertMetadataChild(element_kind, metaParent, node, index4, key);
  const tag = node.localName;
  const namespace = node.namespaceURI;
  const isHtmlElement = !namespace || namespace === NAMESPACE_HTML;
  if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
    virtualiseInputEvents(tag, node);
  }
  const attributes = virtualiseAttributes(node);
  const children = [];
  for (let childNode = node.firstChild;childNode; ) {
    const child2 = virtualiseChild(meta2, node, childNode, children.length);
    if (child2) {
      children.push([child2.key, child2.vnode]);
      childNode = child2.next;
    } else {
      childNode = childNode.nextSibling;
    }
  }
  const vnode = isHtmlElement ? element3(tag, attributes, toList3(children)) : namespaced2(namespace, tag, attributes, toList3(children));
  return childResult(key, vnode, node.nextSibling);
};
var virtualiseText = (meta2, node, index4) => {
  insertMetadataChild(text_kind, meta2, node, index4, null);
  return childResult("", text2(node.data), node.nextSibling);
};
var virtualiseFragment = (metaParent, domParent, node, index4) => {
  const key = parseKey(node.data);
  const meta2 = insertMetadataChild(fragment_kind, metaParent, node, index4, key);
  const children = [];
  node = node.nextSibling;
  while (node && (node.nodeType !== COMMENT_NODE || node.data.trim() !== "/lustre:fragment")) {
    const child2 = virtualiseChild(meta2, domParent, node, children.length);
    if (child2) {
      children.push([child2.key, child2.vnode]);
      node = child2.next;
    } else {
      node = node.nextSibling;
    }
  }
  meta2.endNode = node;
  const vnode = fragment3(toList3(children));
  return childResult(key, vnode, node?.nextSibling);
};
var virtualiseMap = (metaParent, domParent, node, index4) => {
  const key = parseKey(node.data);
  const meta2 = insertMetadataChild(map_kind, metaParent, node, index4, key);
  const child2 = virtualiseNextChild(meta2, domParent, node, 0);
  if (!child2)
    return null;
  const vnode = map6(child2.vnode, (x) => x);
  return childResult(key, vnode, child2.next);
};
var virtualiseMemo = (meta2, domParent, node, index4) => {
  const key = parseKey(node.data);
  const child2 = virtualiseNextChild(meta2, domParent, node, index4);
  if (!child2)
    return null;
  domParent.removeChild(node);
  const vnode = memo2(toList3([ref({})]), () => child2.vnode);
  return childResult(key, vnode, child2.next);
};
var virtualiseNextChild = (meta2, domParent, node, index4) => {
  while (true) {
    node = node.nextSibling;
    if (!node)
      return null;
    const child2 = virtualiseChild(meta2, domParent, node, index4);
    if (child2)
      return child2;
  }
};
var childResult = (key, vnode, next) => {
  return { key, vnode, next };
};
var virtualiseAttributes = (node) => {
  const attributes = [];
  for (let i = 0;i < node.attributes.length; i++) {
    const attr = node.attributes[i];
    if (attr.name !== "xmlns") {
      attributes.push(attribute2(attr.localName, attr.value));
    }
  }
  return toList3(attributes);
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value2 = node.value;
  const checked2 = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked2)
    return;
  if (tag === "input" && node.type === "radio" && !checked2)
    return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value2)
    return;
  queueMicrotask(() => {
    node.value = value2;
    node.checked = checked2;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (globalThis.document.activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var parseKey = (data2) => {
  const keyMatch = data2.match(/key="([^"]*)"/);
  if (!keyMatch)
    return "";
  return unescapeKey(keyMatch[1]);
};
var unescapeKey = (key) => {
  return key.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'");
};
var toList3 = (arr) => arr.reduceRight((xs, x) => List$NonEmpty(x, xs), empty_list);

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!globalThis.document;
class Runtime {
  constructor(root2, [model, effects], view, update2, options) {
    this.root = root2;
    this.#model = model;
    this.#view = view;
    this.#update = update2;
    this.root.addEventListener("context-request", (event3) => {
      if (!(event3.context && event3.callback))
        return;
      if (!this.#contexts.has(event3.context))
        return;
      event3.stopImmediatePropagation();
      const context = this.#contexts.get(event3.context);
      if (event3.subscribe) {
        const unsubscribe = () => {
          context.subscribers = context.subscribers.filter((subscriber) => subscriber !== event3.callback);
        };
        context.subscribers.push([event3.callback, unsubscribe]);
        event3.callback(context.value, unsubscribe);
      } else {
        event3.callback(context.value);
      }
    });
    const decodeEvent = (event3, path, name) => decode2(this.#cache, path, name, event3);
    const dispatch2 = (event3, data2) => {
      const [cache, result] = dispatch(this.#cache, data2);
      this.#cache = cache;
      if (Result$isOk(result)) {
        const handler = Result$Ok$0(result);
        if (handler.stop_propagation)
          event3.stopPropagation();
        if (handler.prevent_default)
          event3.preventDefault();
        this.dispatch(handler.message, false);
      }
    };
    this.#reconciler = new Reconciler(this.root, decodeEvent, dispatch2, options);
    this.#vdom = virtualise(this.root);
    this.#cache = new$4();
    this.#handleEffects(effects);
    this.#render();
  }
  root = null;
  dispatch(msg, shouldFlush = false) {
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects, shouldFlush);
    }
  }
  emit(event3, data2) {
    const target2 = this.root.host ?? this.root;
    target2.dispatchEvent(new CustomEvent(event3, {
      detail: data2,
      bubbles: true,
      composed: true
    }));
  }
  provide(key, value2) {
    if (!this.#contexts.has(key)) {
      this.#contexts.set(key, { value: value2, subscribers: [] });
    } else {
      const context = this.#contexts.get(key);
      if (isEqual2(context.value, value2)) {
        return;
      }
      context.value = value2;
      for (let i = context.subscribers.length - 1;i >= 0; i--) {
        const [subscriber, unsubscribe] = context.subscribers[i];
        if (!subscriber) {
          context.subscribers.splice(i, 1);
          continue;
        }
        subscriber(value2, unsubscribe);
      }
    }
  }
  #model;
  #view;
  #update;
  #vdom;
  #cache;
  #reconciler;
  #contexts = new Map;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #actions = {
    dispatch: (msg) => this.dispatch(msg),
    emit: (event3, data2) => this.emit(event3, data2),
    select: () => {},
    root: () => this.root,
    provide: (key, value2) => this.provide(key, value2)
  };
  #tick(effects, shouldFlush = false) {
    this.#handleEffects(effects);
    if (!this.#renderTimer) {
      if (shouldFlush) {
        this.#renderTimer = "sync";
        queueMicrotask(() => this.#render());
      } else {
        this.#renderTimer = window.requestAnimationFrame(() => this.#render());
      }
    }
  }
  #handleEffects(effects) {
    this.#shouldQueue = true;
    while (true) {
      iterate(effects.synchronous, (effect) => effect(this.#actions));
      this.#beforePaint = append4(this.#beforePaint, effects.before_paint);
      this.#afterPaint = append4(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length)
        break;
      const msg = this.#queue.shift();
      [this.#model, effects] = this.#update(this.#model, msg);
    }
    this.#shouldQueue = false;
  }
  #render() {
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, cache } = diff(this.#cache, this.#vdom, next);
    this.#cache = cache;
    this.#vdom = next;
    this.#reconciler.push(patch, memos(cache));
    if (List$isNonEmpty(this.#beforePaint)) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#tick(effects, true);
      });
    }
    if (List$isNonEmpty(this.#afterPaint)) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      window.requestAnimationFrame(() => this.#tick(effects, true));
    }
  }
}
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
var copiedStyleSheets = new WeakMap;

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
class Spa {
  #runtime;
  constructor(root2, [init, effects], update2, view) {
    this.#runtime = new Runtime(root2, [init, effects], view, update2);
  }
  send(message) {
    if (Message$isEffectDispatchedMessage(message)) {
      this.dispatch(message.message, false);
    } else if (Message$isEffectEmitEvent(message)) {
      this.emit(message.name, message.data);
    } else if (Message$isSystemRequestedShutdown(message)) {}
  }
  dispatch(msg) {
    this.#runtime.dispatch(msg);
  }
  emit(event3, data2) {
    this.#runtime.emit(event3, data2);
  }
}
var start = ({ init, update: update2, view }, selector, flags) => {
  if (!is_browser())
    return Result$Error(Error$NotABrowser());
  const root2 = selector instanceof HTMLElement ? selector : globalThis.document.querySelector(selector);
  if (!root2)
    return Result$Error(Error$ElementNotFound(selector));
  return Result$Ok(new Spa(root2, init(flags), update2, view));
};

// build/dev/javascript/lustre/lustre/runtime/server/runtime.ffi.mjs
class Runtime2 {
  #model;
  #update;
  #view;
  #config;
  #vdom;
  #cache;
  #providers = make();
  #callbacks = /* @__PURE__ */ new Set;
  constructor(_, init, update2, view, config2, start_arguments) {
    const [model, effects] = init(start_arguments);
    this.#model = model;
    this.#update = update2;
    this.#view = view;
    this.#config = config2;
    this.#vdom = this.#view(this.#model);
    this.#cache = from_node(this.#vdom);
    this.#handle_effect(effects);
  }
  send(msg) {
    if (Message$isClientDispatchedMessage(msg)) {
      const { message } = msg;
      const next = this.#handle_client_message(message);
      const diff2 = diff(this.#cache, this.#vdom, next);
      this.#vdom = next;
      this.#cache = diff2.cache;
      this.broadcast(reconcile(diff2.patch, memos(diff2.cache)));
    } else if (Message$isClientRegisteredCallback(msg)) {
      const { callback } = msg;
      this.#callbacks.add(callback);
      callback(mount(this.#config.open_shadow_root, this.#config.adopt_styles, keys(this.#config.attributes), keys(this.#config.properties), keys(this.#config.contexts), this.#providers, this.#vdom, memos(this.#cache)));
      if (Option$isSome(config.on_connect)) {
        this.#dispatch(Option$Some$0(config.on_connect));
      }
    } else if (Message$isClientDeregisteredCallback(msg)) {
      const { callback } = msg;
      this.#callbacks.delete(callback);
      if (Option$isSome(config.on_disconnect)) {
        this.#dispatch(Option$Some$0(config.on_disconnect));
      }
    } else if (Message$isEffectDispatchedMessage(msg)) {
      const { message } = msg;
      const [model, effect] = this.#update(this.#model, message);
      const next = this.#view(model);
      const diff2 = diff(this.#cache, this.#vdom, next);
      this.#handle_effect(effect);
      this.#model = model;
      this.#vdom = next;
      this.#cache = diff2.cache;
      this.broadcast(reconcile(diff2.patch, memos(diff2.cache)));
    } else if (Message$isEffectEmitEvent(msg)) {
      const { name, data: data2 } = msg;
      this.broadcast(emit(name, data2));
    } else if (Message$isEffectProvidedValue(msg)) {
      const { key, value: value2 } = msg;
      const existing = get(this.#providers, key);
      if (Result$isOk(existing) && isEqual2(Result$Ok$0(existing), value2)) {
        return;
      }
      this.#providers = insert(this.#providers, key, value2);
      this.broadcast(provide(key, value2));
    } else if (Message$isSystemRequestedShutdown(msg)) {
      this.#model = null;
      this.#update = null;
      this.#view = null;
      this.#config = null;
      this.#vdom = null;
      this.#cache = null;
      this.#providers = null;
      this.#callbacks.clear();
    }
  }
  broadcast(msg) {
    for (const callback of this.#callbacks) {
      callback(msg);
    }
  }
  #handle_client_message(msg) {
    if (ServerMessage$isBatch(msg)) {
      const { messages } = msg;
      let model = this.#model;
      let effect = none();
      for (let list4 = messages;List$NonEmpty$rest(list4); list4 = List$NonEmpty$rest(list4)) {
        const result = this.#handle_client_message(List$NonEmpty$first(list4));
        if (Result$isOk(result)) {
          model = Result$Ok$0(result)[0];
          effect = batch(toList2([effect, Result$Ok$0(result)[1]]));
          break;
        }
      }
      this.#handle_effect(effect);
      this.#model = model;
      return this.#view(model);
    } else if (ServerMessage$isAttributeChanged(msg)) {
      const { name, value: value2 } = msg;
      const result = this.#handle_attribute_change(name, value2);
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      return this.#dispatch(Result$Ok$0(result));
    } else if (ServerMessage$isPropertyChanged(msg)) {
      const { name, value: value2 } = msg;
      const result = this.#handle_properties_change(name, value2);
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      return this.#dispatch(Result$Ok$0(result));
    } else if (ServerMessage$isEventFired(msg)) {
      const { path, name, event: event3 } = msg;
      const [cache, result] = handle(this.#cache, path, name, event3);
      this.#cache = cache;
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      const { message } = Result$Ok$0(result);
      return this.#dispatch(message);
    } else if (ServerMessage$isContextProvided(msg)) {
      const { key, value: value2 } = msg;
      let result = get(this.#config.contexts, key);
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      result = run(value2, Result$Ok$0(result));
      if (!Result$isOk(result)) {
        return this.#vdom;
      }
      return this.#dispatch(Result$Ok$0(result));
    }
  }
  #dispatch(msg) {
    const [model, effects] = this.#update(this.#model, msg);
    this.#handle_effect(effects);
    this.#model = model;
    return this.#view(this.#model);
  }
  #handle_attribute_change(name, value2) {
    const result = get(this.#config.attributes, name);
    if (!Result$isOk(result)) {
      return result;
    }
    return Result$Ok$0(result)(value2);
  }
  #handle_properties_change(name, value2) {
    const result = get(this.#config.properties, name);
    if (!Result$isOk(result)) {
      return result;
    }
    return Result$Ok$0(result)(value2);
  }
  #handle_effect(effect) {
    const dispatch2 = (message) => this.send(Message$EffectDispatchedMessage(message));
    const emit2 = (name, data2) => this.send(Message$EffectEmitEvent(name, data2));
    const select = () => {
      return;
    };
    const internals = () => {
      return;
    };
    const provide2 = (key, value2) => this.send(Message$EffectProvidedValue(key, value2));
    globalThis.queueMicrotask(() => {
      perform(effect, dispatch2, emit2, select, internals, provide2);
    });
  }
}

// build/dev/javascript/lustre/lustre.mjs
class ElementNotFound extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
}
var Error$ElementNotFound = (selector) => new ElementNotFound(selector);
class NotABrowser extends CustomType {
}
var Error$NotABrowser = () => new NotABrowser;
function application(init, update2, view) {
  return new App(new None, init, update2, view, default_config);
}
function start4(app, selector, arguments$) {
  return guard(!is_browser(), new Error(new NotABrowser), () => {
    return start(app, selector, arguments$);
  });
}
// build/dev/javascript/modem/modem.ffi.mjs
var defaults = {
  handle_external_links: false,
  handle_internal_links: true
};
var initial_location = globalThis?.window?.location?.href;
var do_initial_uri = () => {
  if (!initial_location) {
    return new Error(undefined);
  } else {
    return new Ok(uri_from_url(new URL(initial_location)));
  }
};
var do_init = (dispatch2, options = defaults) => {
  document.addEventListener("click", (event3) => {
    const a2 = find_anchor(event3.target);
    if (!a2)
      return;
    try {
      const url = new URL(a2.href);
      const uri = uri_from_url(url);
      const is_external = url.host !== window.location.host || a2.target === "_blank";
      if (!options.handle_external_links && is_external)
        return;
      if (!options.handle_internal_links && !is_external)
        return;
      event3.preventDefault();
      if (!is_external) {
        window.history.pushState({}, "", a2.href);
        window.requestAnimationFrame(() => {
          if (url.hash) {
            document.getElementById(url.hash.slice(1))?.scrollIntoView();
          } else {
            window.scrollTo(0, 0);
          }
        });
      }
      return dispatch2(uri);
    } catch {
      return;
    }
  });
  window.addEventListener("popstate", (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    const uri = uri_from_url(url);
    window.requestAnimationFrame(() => {
      if (url.hash) {
        document.getElementById(url.hash.slice(1))?.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    });
    dispatch2(uri);
  });
  window.addEventListener("modem-push", ({ detail }) => {
    dispatch2(detail);
  });
  window.addEventListener("modem-replace", ({ detail }) => {
    dispatch2(detail);
  });
};
var do_push = (uri) => {
  window.history.pushState({}, "", to_string3(uri));
  window.requestAnimationFrame(() => {
    if (uri.fragment[0]) {
      document.getElementById(uri.fragment[0])?.scrollIntoView();
    }
  });
  window.dispatchEvent(new CustomEvent("modem-push", { detail: uri }));
};
var find_anchor = (el) => {
  if (!el || el.tagName === "BODY") {
    return null;
  } else if (el.tagName === "A") {
    return el;
  } else {
    return find_anchor(el.parentElement);
  }
};
var uri_from_url = (url) => {
  return new Uri(url.protocol ? new Some(url.protocol.slice(0, -1)) : new None, new None, url.hostname ? new Some(url.hostname) : new None, url.port ? new Some(Number(url.port)) : new None, url.pathname, url.search ? new Some(url.search.slice(1)) : new None, url.hash ? new Some(url.hash.slice(1)) : new None);
};

// build/dev/javascript/modem/modem.mjs
var relative = /* @__PURE__ */ new Uri(/* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, /* @__PURE__ */ new None, "", /* @__PURE__ */ new None, /* @__PURE__ */ new None);
function init(handler) {
  return from2((dispatch2) => {
    return guard(!is_browser(), undefined, () => {
      return do_init((uri) => {
        let _pipe = uri;
        let _pipe$1 = handler(_pipe);
        return dispatch2(_pipe$1);
      });
    });
  });
}
function non_empty(string5) {
  if (string5 === "") {
    return new None;
  } else {
    return new Some(string5);
  }
}
function push(path, query, fragment4) {
  return from2((_) => {
    return guard(!is_browser(), undefined, () => {
      return do_push(new Uri(relative.scheme, relative.userinfo, relative.host, relative.port, path, then$(query, non_empty), then$(fragment4, non_empty)));
    });
  });
}
// build/dev/javascript/gleam_http/gleam/http.mjs
class Get extends CustomType {
}
class Post extends CustomType {
}
class Head extends CustomType {
}
class Put extends CustomType {
}
class Delete extends CustomType {
}
class Trace extends CustomType {
}
class Connect extends CustomType {
}
class Options extends CustomType {
}
class Patch2 extends CustomType {
}
class Http extends CustomType {
}
class Https extends CustomType {
}
function method_to_string(method) {
  if (method instanceof Get) {
    return "GET";
  } else if (method instanceof Post) {
    return "POST";
  } else if (method instanceof Head) {
    return "HEAD";
  } else if (method instanceof Put) {
    return "PUT";
  } else if (method instanceof Delete) {
    return "DELETE";
  } else if (method instanceof Trace) {
    return "TRACE";
  } else if (method instanceof Connect) {
    return "CONNECT";
  } else if (method instanceof Options) {
    return "OPTIONS";
  } else if (method instanceof Patch2) {
    return "PATCH";
  } else {
    let method$1 = method[0];
    return method$1;
  }
}
function scheme_to_string(scheme) {
  if (scheme instanceof Http) {
    return "http";
  } else {
    return "https";
  }
}
function scheme_from_string(scheme) {
  let $ = lowercase(scheme);
  if ($ === "http") {
    return new Ok(new Http);
  } else if ($ === "https") {
    return new Ok(new Https);
  } else {
    return new Error(undefined);
  }
}

// build/dev/javascript/gleam_http/gleam/http/request.mjs
class Request extends CustomType {
  constructor(method, headers, body, scheme, host, port, path, query) {
    super();
    this.method = method;
    this.headers = headers;
    this.body = body;
    this.scheme = scheme;
    this.host = host;
    this.port = port;
    this.path = path;
    this.query = query;
  }
}
function to_uri(request) {
  return new Uri(new Some(scheme_to_string(request.scheme)), new None, new Some(request.host), request.port, request.path, request.query, new None);
}
function from_uri(uri) {
  return try$((() => {
    let _pipe = uri.scheme;
    let _pipe$1 = unwrap(_pipe, "");
    return scheme_from_string(_pipe$1);
  })(), (scheme) => {
    return try$((() => {
      let _pipe = uri.host;
      return to_result(_pipe, undefined);
    })(), (host) => {
      let req = new Request(new Get, toList([]), "", scheme, host, uri.port, uri.path, uri.query);
      return new Ok(req);
    });
  });
}
function set_header(request, key, value2) {
  let headers = key_set(request.headers, lowercase(key), value2);
  return new Request(request.method, headers, request.body, request.scheme, request.host, request.port, request.path, request.query);
}
function set_body(req, body) {
  return new Request(req.method, req.headers, body, req.scheme, req.host, req.port, req.path, req.query);
}
function set_method(req, method) {
  return new Request(method, req.headers, req.body, req.scheme, req.host, req.port, req.path, req.query);
}

// build/dev/javascript/gleam_http/gleam/http/response.mjs
class Response extends CustomType {
  constructor(status, headers, body) {
    super();
    this.status = status;
    this.headers = headers;
    this.body = body;
  }
}
function get_header(response, key) {
  return key_find(response.headers, lowercase(key));
}
// build/dev/javascript/gleam_javascript/gleam_javascript_ffi.mjs
class PromiseLayer {
  constructor(promise) {
    this.promise = promise;
  }
  static wrap(value2) {
    return value2 instanceof Promise ? new PromiseLayer(value2) : value2;
  }
  static unwrap(value2) {
    return value2 instanceof PromiseLayer ? value2.promise : value2;
  }
}
function resolve(value2) {
  return Promise.resolve(PromiseLayer.wrap(value2));
}
function then_await(promise, fn) {
  return promise.then((value2) => fn(PromiseLayer.unwrap(value2)));
}
function map_promise(promise, fn) {
  return promise.then((value2) => PromiseLayer.wrap(fn(PromiseLayer.unwrap(value2))));
}

// build/dev/javascript/gleam_javascript/gleam/javascript/promise.mjs
function tap(promise, callback) {
  let _pipe = promise;
  return map_promise(_pipe, (a2) => {
    callback(a2);
    return a2;
  });
}
function try_await(promise, callback) {
  let _pipe = promise;
  return then_await(_pipe, (result) => {
    if (result instanceof Ok) {
      let a2 = result[0];
      return callback(a2);
    } else {
      let e = result[0];
      return resolve(new Error(e));
    }
  });
}
// build/dev/javascript/gleam_fetch/gleam_fetch_ffi.mjs
async function raw_send(request) {
  try {
    return new Ok(await fetch(request));
  } catch (error) {
    return new Error(new NetworkError(error.toString()));
  }
}
function from_fetch_response(response) {
  return new Response(response.status, List.fromArray([...response.headers]), response);
}
function request_common(request) {
  let url = to_string3(to_uri(request));
  let method = method_to_string(request.method).toUpperCase();
  let options = {
    headers: make_headers(request.headers),
    method
  };
  return [url, options];
}
function to_fetch_request(request) {
  let [url, options] = request_common(request);
  if (options.method !== "GET" && options.method !== "HEAD")
    options.body = request.body;
  return new globalThis.Request(url, options);
}
function make_headers(headersList) {
  let headers = new globalThis.Headers;
  for (let [k, v] of headersList)
    headers.append(k.toLowerCase(), v);
  return headers;
}
async function read_text_body(response) {
  let body;
  try {
    body = await response.body.text();
  } catch (error) {
    return new Error(new UnableToReadBody);
  }
  return new Ok(response.withFields({ body }));
}

// build/dev/javascript/gleam_fetch/gleam/fetch.mjs
class NetworkError extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class UnableToReadBody extends CustomType {
}
function send2(request) {
  let _pipe = request;
  let _pipe$1 = to_fetch_request(_pipe);
  let _pipe$2 = raw_send(_pipe$1);
  return try_await(_pipe$2, (resp) => {
    return resolve(new Ok(from_fetch_response(resp)));
  });
}
// build/dev/javascript/rsvp/rsvp.ffi.mjs
var from_relative_url = (url_string) => {
  if (!globalThis.location)
    return new Error(undefined);
  const url = new URL(url_string, globalThis.location.href);
  const uri = uri_from_url2(url);
  return new Ok(uri);
};
var uri_from_url2 = (url) => {
  const optional = (value2) => value2 ? new Some(value2) : new None;
  return new Uri(optional(url.protocol?.slice(0, -1)), new None, optional(url.hostname), optional(url.port && Number(url.port)), url.pathname, optional(url.search?.slice(1)), optional(url.hash?.slice(1)));
};

// build/dev/javascript/rsvp/rsvp.mjs
class BadBody extends CustomType {
}
class BadUrl extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class HttpError extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class JsonError extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class NetworkError2 extends CustomType {
}
class UnhandledResponse extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Handler2 extends CustomType {
  constructor(run2) {
    super();
    this.run = run2;
  }
}
function expect_ok_response(handler) {
  return new Handler2((result) => {
    return handler(try$(result, (response) => {
      let $ = response.status;
      let code2 = $;
      if (code2 >= 200 && code2 < 300) {
        return new Ok(response);
      } else {
        let code3 = $;
        if (code3 >= 400 && code3 < 600) {
          return new Error(new HttpError(response));
        } else {
          return new Error(new UnhandledResponse(response));
        }
      }
    }));
  });
}
function expect_json_response(handler) {
  return expect_ok_response((result) => {
    return handler(try$(result, (response) => {
      let $ = get_header(response, "content-type");
      if ($ instanceof Ok) {
        let $1 = $[0];
        if ($1 === "application/json") {
          return new Ok(response);
        } else if ($1.startsWith("application/json;")) {
          return new Ok(response);
        } else {
          return new Error(new UnhandledResponse(response));
        }
      } else {
        return new Error(new UnhandledResponse(response));
      }
    }));
  });
}
function do_send(request, handler) {
  return from2((dispatch2) => {
    let _pipe = send2(request);
    let _pipe$1 = try_await(_pipe, read_text_body);
    let _pipe$2 = map_promise(_pipe$1, (_capture) => {
      return map_error(_capture, (error) => {
        if (error instanceof NetworkError) {
          return new NetworkError2;
        } else if (error instanceof UnableToReadBody) {
          return new BadBody;
        } else {
          return new BadBody;
        }
      });
    });
    let _pipe$3 = map_promise(_pipe$2, handler.run);
    tap(_pipe$3, dispatch2);
    return;
  });
}
function send3(request, handler) {
  return do_send(request, handler);
}
function reject(err, handler) {
  return from2((dispatch2) => {
    let _pipe = new Error(err);
    let _pipe$1 = handler.run(_pipe);
    return dispatch2(_pipe$1);
  });
}
function decode_json_body(response, decoder) {
  let _pipe = response.body;
  let _pipe$1 = parse(_pipe, decoder);
  return map_error(_pipe$1, (var0) => {
    return new JsonError(var0);
  });
}
function expect_json(decoder, handler) {
  return expect_json_response((result) => {
    let _pipe = result;
    let _pipe$1 = try$(_pipe, (_capture) => {
      return decode_json_body(_capture, decoder);
    });
    return handler(_pipe$1);
  });
}
function to_uri2(uri_string) {
  let _block;
  if (uri_string.startsWith("./")) {
    _block = from_relative_url(uri_string);
  } else if (uri_string.startsWith("/")) {
    _block = from_relative_url(uri_string);
  } else {
    _block = parse2(uri_string);
  }
  let _pipe = _block;
  return replace_error(_pipe, new BadUrl(uri_string));
}
function get3(url, handler) {
  let $ = to_uri2(url);
  if ($ instanceof Ok) {
    let uri = $[0];
    let $1 = from_uri(uri);
    if ($1 instanceof Ok) {
      let request = $1[0];
      return send3(request, handler);
    } else {
      return reject(new BadUrl(url), handler);
    }
  } else {
    let err = $[0];
    return reject(err, handler);
  }
}
function post(url, body, handler) {
  let $ = to_uri2(url);
  if ($ instanceof Ok) {
    let uri = $[0];
    let $1 = from_uri(uri);
    if ($1 instanceof Ok) {
      let request = $1[0];
      let _pipe = request;
      let _pipe$1 = set_method(_pipe, new Post);
      let _pipe$2 = set_header(_pipe$1, "content-type", "application/json");
      let _pipe$3 = set_body(_pipe$2, to_string2(body));
      return send3(_pipe$3, handler);
    } else {
      return reject(new BadUrl(url), handler);
    }
  } else {
    let err = $[0];
    return reject(err, handler);
  }
}
// build/dev/javascript/shared/shared/pr.mjs
class PullRequest extends CustomType {
  constructor(number, title2, author, url, created_at, review_decision, draft, checks_status, checks_url) {
    super();
    this.number = number;
    this.title = title2;
    this.author = author;
    this.url = url;
    this.created_at = created_at;
    this.review_decision = review_decision;
    this.draft = draft;
    this.checks_status = checks_status;
    this.checks_url = checks_url;
  }
}
class PrFile extends CustomType {
  constructor(path, additions, deletions) {
    super();
    this.path = path;
    this.additions = additions;
    this.deletions = deletions;
  }
}
class PrGroups extends CustomType {
  constructor(created_by_me, review_requested, all_open) {
    super();
    this.created_by_me = created_by_me;
    this.review_requested = review_requested;
    this.all_open = all_open;
  }
}
class PrDetail extends CustomType {
  constructor(number, title2, author, url, body, head_branch, files, diff2) {
    super();
    this.number = number;
    this.title = title2;
    this.author = author;
    this.url = url;
    this.body = body;
    this.head_branch = head_branch;
    this.files = files;
    this.diff = diff2;
  }
}
class ReviewChunk extends CustomType {
  constructor(index5, title2, description, file_path, start_line, diff_content) {
    super();
    this.index = index5;
    this.title = title2;
    this.description = description;
    this.file_path = file_path;
    this.start_line = start_line;
    this.diff_content = diff_content;
  }
}
class LineComment extends CustomType {
  constructor(chunk_index, line_number, body) {
    super();
    this.chunk_index = chunk_index;
    this.line_number = line_number;
    this.body = body;
  }
}
class AnalysisResult extends CustomType {
  constructor(summary, chunks) {
    super();
    this.summary = summary;
    this.chunks = chunks;
  }
}
class PrComment extends CustomType {
  constructor(id2, author, body, path, line, created_at, in_reply_to_id) {
    super();
    this.id = id2;
    this.author = author;
    this.body = body;
    this.path = path;
    this.line = line;
    this.created_at = created_at;
    this.in_reply_to_id = in_reply_to_id;
  }
}
function pull_request_decoder() {
  return field("number", int2, (number) => {
    return field("title", string2, (title2) => {
      return field("author", string2, (author) => {
        return field("url", string2, (url) => {
          return field("created_at", string2, (created_at) => {
            return field("review_decision", string2, (review_decision) => {
              return field("draft", bool, (draft) => {
                return field("checks_status", string2, (checks_status) => {
                  return field("checks_url", string2, (checks_url) => {
                    return success(new PullRequest(number, title2, author, url, created_at, review_decision, draft, checks_status, checks_url));
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}
function pr_groups_decoder() {
  return field("created_by_me", list2(pull_request_decoder()), (created_by_me) => {
    return field("review_requested", list2(pull_request_decoder()), (review_requested) => {
      return field("all_open", list2(pull_request_decoder()), (all_open) => {
        return success(new PrGroups(created_by_me, review_requested, all_open));
      });
    });
  });
}
function pr_file_decoder() {
  return field("path", string2, (path) => {
    return field("additions", int2, (additions) => {
      return field("deletions", int2, (deletions) => {
        return success(new PrFile(path, additions, deletions));
      });
    });
  });
}
function pr_detail_decoder() {
  return field("number", int2, (number) => {
    return field("title", string2, (title2) => {
      return field("author", string2, (author) => {
        return field("url", string2, (url) => {
          return field("body", string2, (body) => {
            return field("head_branch", string2, (head_branch) => {
              return field("files", list2(pr_file_decoder()), (files) => {
                return field("diff", string2, (diff2) => {
                  return success(new PrDetail(number, title2, author, url, body, head_branch, files, diff2));
                });
              });
            });
          });
        });
      });
    });
  });
}
function review_chunk_decoder() {
  return field("index", int2, (index5) => {
    return field("title", string2, (title2) => {
      return field("description", string2, (description) => {
        return field("file_path", string2, (file_path) => {
          return field("start_line", int2, (start_line) => {
            return field("diff_content", string2, (diff_content) => {
              return success(new ReviewChunk(index5, title2, description, file_path, start_line, diff_content));
            });
          });
        });
      });
    });
  });
}
function analysis_result_decoder() {
  return field("summary", string2, (summary) => {
    return field("chunks", list2(review_chunk_decoder()), (chunks) => {
      return success(new AnalysisResult(summary, chunks));
    });
  });
}
function pr_comment_decoder() {
  return field("id", int2, (id2) => {
    return field("author", string2, (author) => {
      return field("body", string2, (body) => {
        return field("path", string2, (path) => {
          return field("line", int2, (line) => {
            return field("created_at", string2, (created_at) => {
              return field("in_reply_to_id", int2, (in_reply_to_id) => {
                return success(new PrComment(id2, author, body, path, line, created_at, in_reply_to_id));
              });
            });
          });
        });
      });
    });
  });
}

// build/dev/javascript/plinth/global_ffi.mjs
function setInterval(delay, callback) {
  return globalThis.setInterval(callback, delay);
}

// build/dev/javascript/client/client/event_source_ffi.mjs
function connect(url, onEvent, onError) {
  const source = new EventSource(url);
  source.addEventListener("analysis_complete", (e) => {
    onEvent("analysis_complete", e.data);
  });
  source.addEventListener("analysis_error", (e) => {
    onEvent("analysis_error", e.data);
  });
  source.addEventListener("heartbeat", (e) => {
    onEvent("heartbeat", e.data);
  });
  source.addEventListener("done", (_e) => {
    source.close();
  });
  source.onerror = (_e) => {
    if (source.readyState === EventSource.CLOSED) {
      return;
    }
    onError("EventSource connection error");
    source.close();
  };
  return source;
}
// build/dev/javascript/client/client/model.mjs
class Dashboard extends CustomType {
}
class PrReview extends CustomType {
}
class NotCommenting extends CustomType {
}
class Commenting extends CustomType {
  constructor(display_line, file_line, text4) {
    super();
    this.display_line = display_line;
    this.file_line = file_line;
    this.text = text4;
  }
}
class PostingComment extends CustomType {
  constructor(display_line, file_line, text4) {
    super();
    this.display_line = display_line;
    this.file_line = file_line;
    this.text = text4;
  }
}
class ReviewIdle extends CustomType {
  constructor(body) {
    super();
    this.body = body;
  }
}
class SubmittingReview extends CustomType {
  constructor(body) {
    super();
    this.body = body;
  }
}
class NotAnalyzed extends CustomType {
}
class Analyzing extends CustomType {
  constructor(heartbeats) {
    super();
    this.heartbeats = heartbeats;
  }
}
class Analyzed extends CustomType {
  constructor(result) {
    super();
    this.result = result;
  }
}
class Model extends CustomType {
  constructor(repos, active_repo, pr_groups, selected_pr, loading, view2, error, analysis_state, current_chunk, comments, commenting, github_comments, description_open, review) {
    super();
    this.repos = repos;
    this.active_repo = active_repo;
    this.pr_groups = pr_groups;
    this.selected_pr = selected_pr;
    this.loading = loading;
    this.view = view2;
    this.error = error;
    this.analysis_state = analysis_state;
    this.current_chunk = current_chunk;
    this.comments = comments;
    this.commenting = commenting;
    this.github_comments = github_comments;
    this.description_open = description_open;
    this.review = review;
  }
}
class GotPrs extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class GotPrDetail extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SelectPr extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SetRepo extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class BackToDashboard extends CustomType {
}
class FetchPrs extends CustomType {
}
class AnalyzePr extends CustomType {
}
class GotAnalysis extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SseAnalysisComplete extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SseAnalysisError extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SseHeartbeat extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SseConnectionError extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class NextChunk extends CustomType {
}
class PrevChunk extends CustomType {
}
class GoToChunk extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class StartComment extends CustomType {
  constructor($0, $1) {
    super();
    this[0] = $0;
    this[1] = $1;
  }
}
class CancelComment extends CustomType {
}
class UpdateCommentText extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SubmitComment extends CustomType {
}
class GotGithubComments extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class CommentPosted extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class UrlChanged extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class ToggleDescription extends CustomType {
}
class SubmitReview extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class SetReviewBody extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class ReviewSubmitted extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class RefreshPrs extends CustomType {
}

// build/dev/javascript/client/client/effects.mjs
function fetch_prs(repo) {
  return get3("/api/prs?repo=" + repo, expect_json(pr_groups_decoder(), (var0) => {
    return new GotPrs(var0);
  }));
}
function fetch_pr_detail(repo, number) {
  return get3("/api/prs/" + to_string(number) + "?repo=" + repo, expect_json(pr_detail_decoder(), (var0) => {
    return new GotPrDetail(var0);
  }));
}
function fetch_github_comments(repo, number) {
  return get3("/api/prs/" + to_string(number) + "/comments?repo=" + repo, expect_json(list2(pr_comment_decoder()), (var0) => {
    return new GotGithubComments(var0);
  }));
}
function analyze_pr_stream(repo, number) {
  return from2((dispatch2) => {
    let url = "/api/prs/" + to_string(number) + "/analyze-stream?repo=" + repo;
    let $ = connect(url, (event_name, data2) => {
      if (event_name === "analysis_complete") {
        return dispatch2(new SseAnalysisComplete(data2));
      } else if (event_name === "analysis_error") {
        return dispatch2(new SseAnalysisError(data2));
      } else if (event_name === "heartbeat") {
        return dispatch2(new SseHeartbeat(data2));
      } else {
        return;
      }
    }, (error_msg) => {
      return dispatch2(new SseConnectionError(error_msg));
    });
    return;
  });
}
function push_url(path) {
  return push(path, new None, new None);
}
function post_github_comment(repo, number, body, path, line) {
  return post("/api/prs/" + to_string(number) + "/comments?repo=" + repo, object2(toList([
    ["body", string3(body)],
    ["path", string3(path)],
    ["line", int3(line)]
  ])), expect_ok_response((resp) => {
    return new CommentPosted(map4(resp, (_) => {
      return;
    }));
  }));
}
function submit_review(repo, number, event3, body) {
  return post("/api/prs/" + to_string(number) + "/review?repo=" + repo, object2(toList([["event", string3(event3)], ["body", string3(body)]])), expect_ok_response((resp) => {
    return new ReviewSubmitted(map4(resp, (_) => {
      return;
    }));
  }));
}
function start_auto_refresh() {
  return from2((dispatch2) => {
    let $ = setInterval(120000, () => {
      return dispatch2(new RefreshPrs);
    });
    return;
  });
}

// build/dev/javascript/lustre/lustre/event.mjs
function on(name, handler) {
  return event(name, map3(handler, (msg) => {
    return new Handler(false, false, msg);
  }), empty_list, never, never, 0, 0);
}
function stop_propagation(event4) {
  if (event4 instanceof Event2) {
    return new Event2(event4.kind, event4.name, event4.handler, event4.include, event4.prevent_default, always, event4.debounce, event4.throttle);
  } else {
    return event4;
  }
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_input(msg) {
  return on("input", subfield(toList(["target", "value"]), string2, (value2) => {
    return success(msg(value2));
  }));
}

// build/dev/javascript/client/client/views/dashboard.mjs
function repo_selector(model) {
  return div(toList([
    styles(toList([
      ["display", "flex"],
      ["gap", "0.5rem"],
      ["margin-bottom", "1.5rem"],
      ["align-items", "center"]
    ]))
  ]), toList([
    label(toList([styles(toList([["font-weight", "600"]]))]), toList([text3("Repository:")])),
    input(toList([
      value(model.active_repo),
      placeholder("owner/repo"),
      on_input((var0) => {
        return new SetRepo(var0);
      }),
      styles(toList([
        ["padding", "0.5rem 0.75rem"],
        ["border", "1px solid #ccc"],
        ["border-radius", "4px"],
        ["flex", "1"],
        ["font-size", "0.95rem"]
      ]))
    ])),
    button(toList([
      on_click(new FetchPrs),
      styles(toList([
        ["padding", "0.5rem 1rem"],
        ["background", "#4361ee"],
        ["color", "white"],
        ["border", "none"],
        ["border-radius", "4px"],
        ["cursor", "pointer"],
        ["font-size", "0.95rem"]
      ]))
    ]), toList([text3("Fetch PRs")]))
  ]));
}
function error_banner(message2) {
  return div(toList([
    styles(toList([
      ["padding", "0.75rem 1rem"],
      ["margin-bottom", "1rem"],
      ["background", "#fee2e2"],
      ["border", "1px solid #fca5a5"],
      ["border-radius", "6px"],
      ["color", "#991b1b"],
      ["font-size", "0.9rem"]
    ]))
  ]), toList([text3(message2)]));
}
function loading_indicator() {
  return div(toList([
    styles(toList([
      ["text-align", "center"],
      ["padding", "3rem"],
      ["color", "#666"],
      ["font-size", "1.1rem"]
    ]))
  ]), toList([text3("Loading pull requests...")]));
}
function section_header(title2, count2) {
  return div(toList([
    styles(toList([
      ["display", "flex"],
      ["align-items", "center"],
      ["gap", "0.5rem"],
      ["margin-bottom", "0.75rem"]
    ]))
  ]), toList([
    h2(toList([
      styles(toList([
        ["color", "#1a1a2e"],
        ["font-size", "1.15rem"],
        ["margin", "0"]
      ]))
    ]), toList([text3(title2)])),
    span(toList([
      styles(toList([
        ["background", "#4361ee"],
        ["color", "white"],
        ["padding", "0.15rem 0.5rem"],
        ["border-radius", "10px"],
        ["font-size", "0.8rem"],
        ["font-weight", "600"]
      ]))
    ]), toList([text3(to_string(count2))]))
  ]));
}
function empty_section_message() {
  return div(toList([
    styles(toList([
      ["padding", "1.5rem"],
      ["color", "#aaa"],
      ["font-style", "italic"],
      ["text-align", "center"],
      ["border", "1px dashed #ddd"],
      ["border-radius", "4px"]
    ]))
  ]), toList([text3("No PRs")]));
}
function header_cell(label2) {
  return th(toList([
    styles(toList([
      ["padding", "0.75rem 1rem"],
      ["border-bottom", "2px solid #ddd"],
      ["font-weight", "600"]
    ]))
  ]), toList([text3(label2)]));
}
function review_badge(decision, draft) {
  let _block;
  if (draft) {
    _block = ["#dbeafe", "#1e40af", "Draft"];
  } else if (decision === "APPROVED") {
    _block = ["#d4edda", "#155724", "Approved"];
  } else if (decision === "CHANGES_REQUESTED") {
    _block = ["#f8d7da", "#721c24", "Changes requested"];
  } else if (decision === "REVIEW_REQUIRED") {
    _block = ["#fff3cd", "#856404", "Review required"];
  } else if (decision === "") {
    _block = ["#f3f4f6", "#6b7280", "No reviews"];
  } else {
    let other = decision;
    _block = ["#e2e3e5", "#383d41", other];
  }
  let $ = _block;
  let bg;
  let fg;
  let label2;
  bg = $[0];
  fg = $[1];
  label2 = $[2];
  return span(toList([
    styles(toList([
      ["padding", "0.25rem 0.5rem"],
      ["border-radius", "4px"],
      ["font-size", "0.7rem"],
      ["white-space", "nowrap"],
      ["background", bg],
      ["color", fg]
    ]))
  ]), toList([text3(label2)]));
}
function checks_badge(status, checks_url) {
  let _block;
  if (status === "passing") {
    _block = ["#22c55e", "check_circle", "Checks passing"];
  } else if (status === "failing") {
    _block = ["#ef4444", "cancel", "Checks failing"];
  } else if (status === "pending") {
    _block = ["#eab308", "schedule", "Checks pending"];
  } else {
    _block = ["#9ca3af", "help", "Checks unknown"];
  }
  let $ = _block;
  let color;
  let icon;
  let title2;
  color = $[0];
  icon = $[1];
  title2 = $[2];
  let icon_el = span(toList([
    class$("material-symbols-outlined"),
    title(title2),
    styles(toList([["font-size", "1.25rem"], ["color", color]]))
  ]), toList([text3(icon)]));
  if (checks_url === "") {
    return icon_el;
  } else {
    let url = checks_url;
    return a(toList([
      href(url),
      target("_blank"),
      title("View failing check"),
      styles(toList([["display", "inline-flex"], ["text-decoration", "none"]])),
      (() => {
        let _pipe = on_click(new FetchPrs);
        return stop_propagation(_pipe);
      })()
    ]), toList([icon_el]));
  }
}
function pr_row(pull_request) {
  return tr(toList([
    on_click(new SelectPr(pull_request.number)),
    styles(toList([["cursor", "pointer"], ["border-bottom", "1px solid #eee"]]))
  ]), toList([
    td(toList([styles(toList([["padding", "0.75rem 1rem"]]))]), toList([
      a(toList([
        href(pull_request.url),
        target("_blank"),
        (() => {
          let _pipe = on_click(new FetchPrs);
          return stop_propagation(_pipe);
        })(),
        styles(toList([
          ["color", "#4361ee"],
          ["text-decoration", "none"],
          ["font-weight", "500"]
        ])),
        class$("hover-underline")
      ]), toList([text3("#" + to_string(pull_request.number))]))
    ])),
    td(toList([
      styles(toList([["padding", "0.75rem 1rem"], ["font-weight", "500"]]))
    ]), toList([text3(pull_request.title)])),
    td(toList([styles(toList([["padding", "0.75rem 1rem"]]))]), toList([text3(pull_request.author)])),
    td(toList([styles(toList([["padding", "0.75rem 1rem"]]))]), toList([
      checks_badge(pull_request.checks_status, pull_request.checks_url)
    ])),
    td(toList([
      styles(toList([["padding", "0.75rem 1rem"], ["min-width", "8rem"]]))
    ]), toList([review_badge(pull_request.review_decision, pull_request.draft)]))
  ]));
}
function pr_table(prs) {
  return table(toList([
    styles(toList([["width", "100%"], ["border-collapse", "collapse"]]))
  ]), toList([
    thead(toList([]), toList([
      tr(toList([
        styles(toList([["background", "#f0f0f5"], ["text-align", "left"]]))
      ]), toList([
        header_cell("#"),
        header_cell("Title"),
        header_cell("Author"),
        header_cell("Checks"),
        header_cell("Review")
      ]))
    ])),
    tbody(toList([]), map2(prs, pr_row))
  ]));
}
function pr_section(title2, prs) {
  let count2 = length(prs);
  return div(toList([styles(toList([["margin-bottom", "2rem"]]))]), toList([
    section_header(title2, count2),
    (() => {
      if (count2 === 0) {
        return empty_section_message();
      } else {
        return pr_table(prs);
      }
    })()
  ]));
}
function pr_sections(groups) {
  if (groups instanceof Some) {
    let g = groups[0];
    return div(toList([]), toList([
      pr_section("Created by Me", g.created_by_me),
      pr_section("My Review Requested", g.review_requested),
      pr_section("All Open PRs", g.all_open)
    ]));
  } else {
    return div(toList([
      styles(toList([
        ["text-align", "center"],
        ["padding", "3rem"],
        ["color", "#888"]
      ]))
    ]), toList([text3("No pull requests found. Click Fetch PRs to load.")]));
  }
}
function view2(model) {
  return div(toList([
    styles(toList([
      ["max-width", "960px"],
      ["margin", "0 auto"],
      ["padding", "2rem"],
      ["font-family", "system-ui, sans-serif"]
    ]))
  ]), toList([
    h1(toList([
      styles(toList([["color", "#1a1a2e"], ["margin-bottom", "1.5rem"]]))
    ]), toList([text3("Augmented Review Dashboard")])),
    repo_selector(model),
    (() => {
      let $ = model.error;
      if ($ instanceof Some) {
        let err = $[0];
        return error_banner(err);
      } else {
        return text3("");
      }
    })(),
    (() => {
      let $ = model.loading;
      if ($) {
        return loading_indicator();
      } else {
        return pr_sections(model.pr_groups);
      }
    })()
  ]));
}

// build/dev/javascript/client/client/highlight_ffi.mjs
function highlight_line(code2, language) {
  const h = globalThis.hljs || typeof window !== "undefined" && window.hljs;
  if (!h || !language || language === "") {
    return escapeHtml(code2);
  }
  try {
    const result = h.highlight(code2, { language, ignoreIllegals: true });
    return result.value;
  } catch (e) {
    try {
      const result = h.highlightAuto(code2);
      return result.value;
    } catch (e2) {
      return escapeHtml(code2);
    }
  }
}
function escapeHtml(text4) {
  return text4.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function detect_language(file_path) {
  const clean_path = file_path.replace(/\s*\(\+\d+ more\)$/, "");
  const ext = clean_path.split(".").pop()?.toLowerCase() || "";
  const map9 = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    gleam: "erlang",
    ex: "elixir",
    exs: "elixir",
    erl: "erlang",
    css: "css",
    scss: "scss",
    html: "html",
    xml: "xml",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    toml: "ini",
    dockerfile: "dockerfile",
    graphql: "graphql",
    gql: "graphql",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp"
  };
  return map9[ext] || "";
}
// build/dev/javascript/gleam_regexp/gleam_regexp_ffi.mjs
function check(regex, string5) {
  regex.lastIndex = 0;
  return regex.test(string5);
}
function compile(pattern, options) {
  try {
    let flags = "gu";
    if (options.case_insensitive)
      flags += "i";
    if (options.multi_line)
      flags += "m";
    return new Ok(new RegExp(pattern, flags));
  } catch (error) {
    const number = (error.columnNumber || 0) | 0;
    return new Error(new CompileError(error.message, number));
  }
}
function scan(regex, string5) {
  regex.lastIndex = 0;
  const matches2 = Array.from(string5.matchAll(regex)).map((match) => {
    const content = match[0];
    return new Match(content, submatches(match.slice(1)));
  });
  return List.fromArray(matches2);
}
function replace3(regex, original_string, replacement) {
  regex.lastIndex = 0;
  return original_string.replaceAll(regex, replacement);
}
function submatches(groups) {
  const submatches2 = [];
  for (let n = groups.length - 1;n >= 0; n--) {
    if (groups[n]) {
      submatches2[n] = new Some(groups[n]);
      continue;
    }
    if (submatches2.length > 0) {
      submatches2[n] = new None;
    }
  }
  return List.fromArray(submatches2);
}

// build/dev/javascript/gleam_regexp/gleam/regexp.mjs
class Match extends CustomType {
  constructor(content, submatches2) {
    super();
    this.content = content;
    this.submatches = submatches2;
  }
}
class CompileError extends CustomType {
  constructor(error, byte_index) {
    super();
    this.error = error;
    this.byte_index = byte_index;
  }
}
class Options2 extends CustomType {
  constructor(case_insensitive, multi_line) {
    super();
    this.case_insensitive = case_insensitive;
    this.multi_line = multi_line;
  }
}
function compile2(pattern, options) {
  return compile(pattern, options);
}
function from_string(pattern) {
  return compile2(pattern, new Options2(false, false));
}
function check2(regexp, string5) {
  return check(regexp, string5);
}
function scan2(regexp, string5) {
  return scan(regexp, string5);
}

// build/dev/javascript/splitter/splitter_ffi.mjs
function make2(patterns) {
  let pattern = "";
  let cursor = patterns;
  while (cursor.tail) {
    if (pattern !== "")
      pattern += "|";
    pattern += escapeRegExp(cursor.head);
    cursor = cursor.tail;
  }
  return new RegExp(pattern);
}
function split4(splitter, string5) {
  const match = string5.match(splitter);
  if (!match)
    return [string5, "", ""];
  const index5 = match.index;
  const delimiter = match[0];
  return [
    string5.slice(0, index5),
    delimiter,
    string5.slice(index5 + delimiter.length)
  ];
}
function split_after(splitter, string5) {
  const match = string5.match(splitter);
  if (!match)
    return [string5, ""];
  const split_point = match.index + match[0].length;
  return [string5.slice(0, split_point), string5.slice(split_point)];
}
function escapeRegExp(string5) {
  return string5.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// build/dev/javascript/splitter/splitter.mjs
function new$6(substrings) {
  let _pipe = substrings;
  let _pipe$1 = filter(_pipe, (x) => {
    return x !== "";
  });
  return make2(_pipe$1);
}
// build/dev/javascript/mork/mork/document.mjs
class Options3 extends CustomType {
  constructor(strip_frontmatter, footnotes, heading_ids, tables, tasklists, emojis, autolinks) {
    super();
    this.strip_frontmatter = strip_frontmatter;
    this.footnotes = footnotes;
    this.heading_ids = heading_ids;
    this.tables = tables;
    this.tasklists = tasklists;
    this.emojis = emojis;
    this.autolinks = autolinks;
  }
}
class Document extends CustomType {
  constructor(options, blocks, links, footnotes) {
    super();
    this.options = options;
    this.blocks = blocks;
    this.links = links;
    this.footnotes = footnotes;
  }
}
class BlockQuote extends CustomType {
  constructor(blocks) {
    super();
    this.blocks = blocks;
  }
}
class BulletList extends CustomType {
  constructor(pack, items) {
    super();
    this.pack = pack;
    this.items = items;
  }
}
class Code extends CustomType {
  constructor(lang, text4) {
    super();
    this.lang = lang;
    this.text = text4;
  }
}
class Empty2 extends CustomType {
}
class Heading extends CustomType {
  constructor(level, id2, raw, inlines) {
    super();
    this.level = level;
    this.id = id2;
    this.raw = raw;
    this.inlines = inlines;
  }
}
class HtmlBlock extends CustomType {
  constructor(raw) {
    super();
    this.raw = raw;
  }
}
class Newline extends CustomType {
}
class OrderedList extends CustomType {
  constructor(pack, items, start5) {
    super();
    this.pack = pack;
    this.items = items;
    this.start = start5;
  }
}
class Paragraph extends CustomType {
  constructor(raw, inlines) {
    super();
    this.raw = raw;
    this.inlines = inlines;
  }
}
class Table extends CustomType {
  constructor(header, rows) {
    super();
    this.header = header;
    this.rows = rows;
  }
}
class ThematicBreak extends CustomType {
}
class THead extends CustomType {
  constructor(align, raw, inlines) {
    super();
    this.align = align;
    this.raw = raw;
    this.inlines = inlines;
  }
}
class Left extends CustomType {
}
class Right extends CustomType {
}
class Center extends CustomType {
}
class Cell extends CustomType {
  constructor(raw, inlines) {
    super();
    this.raw = raw;
    this.inlines = inlines;
  }
}
class Autolink extends CustomType {
  constructor(uri, text4) {
    super();
    this.uri = uri;
    this.text = text4;
  }
}
class CodeSpan extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class EmailAutolink extends CustomType {
  constructor(mail) {
    super();
    this.mail = mail;
  }
}
class Emphasis extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Footnote extends CustomType {
  constructor(num, label2) {
    super();
    this.num = num;
    this.label = label2;
  }
}
class FullImage extends CustomType {
  constructor(text4, data2) {
    super();
    this.text = text4;
    this.data = data2;
  }
}
class FullLink extends CustomType {
  constructor(text4, data2) {
    super();
    this.text = text4;
    this.data = data2;
  }
}
class HardBreak extends CustomType {
}
class Highlight extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class InlineFootnote extends CustomType {
  constructor(num, text4) {
    super();
    this.num = num;
    this.text = text4;
  }
}
class InlineHtml extends CustomType {
  constructor(tag, attrs, children) {
    super();
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
  }
}
class RawHtml extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class RefImage extends CustomType {
  constructor(text4, label2) {
    super();
    this.text = text4;
    this.label = label2;
  }
}
class RefLink extends CustomType {
  constructor(text4, label2) {
    super();
    this.text = text4;
    this.label = label2;
  }
}
class SoftBreak extends CustomType {
}
class Strikethrough extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Strong extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Text2 extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
class Checkbox extends CustomType {
  constructor(checked2) {
    super();
    this.checked = checked2;
  }
}
class Delim extends CustomType {
  constructor(style2, len, can_open, can_close) {
    super();
    this.style = style2;
    this.len = len;
    this.can_open = can_open;
    this.can_close = can_close;
  }
}
class Loose extends CustomType {
}
class Tight extends CustomType {
}
class ListItem extends CustomType {
  constructor(blocks, ends_with_blank, contains_blank) {
    super();
    this.blocks = blocks;
    this.ends_with_blank = ends_with_blank;
    this.contains_blank = contains_blank;
  }
}
class LinkData extends CustomType {
  constructor(dest, title2) {
    super();
    this.dest = dest;
    this.title = title2;
  }
}
class FootnoteData extends CustomType {
  constructor(num, blocks) {
    super();
    this.num = num;
    this.blocks = blocks;
  }
}
class Absolute extends CustomType {
  constructor(uri) {
    super();
    this.uri = uri;
  }
}
class Relative extends CustomType {
  constructor(uri) {
    super();
    this.uri = uri;
  }
}
class Anchor extends CustomType {
  constructor(id2) {
    super();
    this.id = id2;
  }
}
function new$7(options) {
  return new Document(options, toList([]), make(), make());
}
function new_destination(uri) {
  if (uri.startsWith("#")) {
    let anchor = uri.slice(1);
    return new Anchor(anchor);
  } else {
    let $ = contains_string(uri, ":");
    if ($) {
      return new Absolute(uri);
    } else {
      return new Relative(uri);
    }
  }
}

// build/dev/javascript/casefold/casefold_ffi.js
function casefold(s) {
  return s.toLowerCase().toUpperCase().toLowerCase();
}
// build/dev/javascript/casefold/casefold.mjs
var ascii_lowercase = "abcdefghijklmnopqrstuvwxyz";
var ascii_uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var ascii_letters = ascii_lowercase + ascii_uppercase;
var digits = "0123456789";
var ascii_punctuation = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~.";
var ascii_whitespace = ` 	
\r\f\v`;
var ascii_printable = digits + ascii_letters + ascii_punctuation + ascii_whitespace;
var alnum = ascii_letters + digits;

// build/dev/javascript/mork/mork/internal/util.mjs
var FILEPATH = "src/mork/internal/util.gleam";
function check3(cond, yes, nope) {
  if (cond) {
    return yes;
  } else {
    return nope;
  }
}
function do_expand_tabs_indent(loop$s, loop$col) {
  while (true) {
    let s = loop$s;
    let col = loop$col;
    if (s.startsWith("    ")) {
      let rest = s.slice(4);
      loop$s = rest;
      loop$col = col + 4;
    } else if (s.startsWith("   ")) {
      let rest = s.slice(3);
      loop$s = rest;
      loop$col = col + 3;
    } else if (s.startsWith("  ")) {
      let rest = s.slice(2);
      loop$s = rest;
      loop$col = col + 2;
    } else if (s.startsWith(" ")) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + 1;
    } else if (s.startsWith("\t")) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + (4 - col % 4);
    } else {
      return [s, col];
    }
  }
}
function expand_tabs_indent(s) {
  let $ = do_expand_tabs_indent(s, 0);
  let body;
  let indent;
  body = $[0];
  indent = $[1];
  if (indent === 0) {
    return [body, indent];
  } else {
    return [repeat(" ", indent) + body, indent];
  }
}
function expand_tabs_blockquote(loop$s, loop$col) {
  while (true) {
    let s = loop$s;
    let col = loop$col;
    if (s.startsWith(" ")) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + 1;
    } else if (s.startsWith(">")) {
      let rest = s.slice(1);
      let $ = do_expand_tabs_indent(rest, col + 1);
      let body;
      let indent;
      body = $[0];
      indent = $[1];
      return repeat(" ", indent - col - 1) + body;
    } else if (s.startsWith("\t")) {
      let rest = s.slice(1);
      loop$s = rest;
      loop$col = col + (4 - col % 4);
    } else {
      return repeat(" ", col + 1) + s;
    }
  }
}
function expand_tabs_postmarker(loop$rest, loop$col, loop$acc) {
  while (true) {
    let rest = loop$rest;
    let col = loop$col;
    let acc = loop$acc;
    if (rest.startsWith("\t")) {
      let rest$1 = rest.slice(1);
      let newcol = col + (4 - col % 4);
      loop$rest = rest$1;
      loop$col = newcol;
      loop$acc = acc + repeat(" ", newcol - col);
    } else if (rest.startsWith(" ")) {
      let ch = " ";
      let rest$1 = rest.slice(1);
      loop$rest = rest$1;
      loop$col = col + 1;
      loop$acc = acc + ch;
    } else {
      return acc + rest;
    }
  }
}
function expand_tabs_premarker(rest, marker, col, acc) {
  return lazy_guard(starts_with(rest, marker), () => {
    return expand_tabs_postmarker(drop_start(rest, 1), col + 1, acc + marker);
  }, () => {
    if (rest.startsWith("\t")) {
      let rest$1 = rest.slice(1);
      let newcol = col + (4 - col % 4);
      return expand_tabs_premarker(rest$1, marker, newcol, acc + repeat(" ", newcol - col));
    } else if (rest.startsWith("0")) {
      let ch = "0";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("1")) {
      let ch = "1";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("2")) {
      let ch = "2";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("3")) {
      let ch = "3";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("4")) {
      let ch = "4";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("5")) {
      let ch = "5";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("6")) {
      let ch = "6";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("7")) {
      let ch = "7";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("8")) {
      let ch = "8";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith("9")) {
      let ch = "9";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else if (rest.startsWith(" ")) {
      let ch = " ";
      let rest$1 = rest.slice(1);
      return expand_tabs_premarker(rest$1, marker, col + 1, acc + ch);
    } else {
      return acc + rest;
    }
  });
}
function expand_tabs_listitem(s, marker) {
  return expand_tabs_premarker(s, marker, 0, "");
}
function do_find_indent(loop$line, loop$depth) {
  while (true) {
    let line = loop$line;
    let depth = loop$depth;
    if (line.startsWith(" ")) {
      let rest = line.slice(1);
      loop$line = rest;
      loop$depth = depth + 1;
    } else if (line.startsWith("\t")) {
      let rest = line.slice(1);
      loop$line = rest;
      loop$depth = depth + (4 - depth % 4);
    } else {
      return depth;
    }
  }
}
function find_indent(line) {
  return do_find_indent(line, 0);
}
function has_ordinal_marker(loop$line, loop$marker) {
  while (true) {
    let line = loop$line;
    let marker = loop$marker;
    if (line.startsWith("0")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("1")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("2")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("3")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("4")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("5")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("6")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("7")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("8")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else if (line.startsWith("9")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$marker = marker;
    } else {
      return starts_with(line, marker);
    }
  }
}
function drop_indent(line, count2) {
  let $ = do_expand_tabs_indent(line, 0);
  let body;
  let indent;
  body = $[0];
  indent = $[1];
  let indent$1 = max(indent - count2, 0);
  return repeat(" ", indent$1) + body;
}
function drop_blockquote_marker(line) {
  let $ = expand_tabs_blockquote(line, 0);
  if ($.startsWith(" ")) {
    let line$1 = $.slice(1);
    return line$1;
  } else {
    return $;
  }
}
function has_blockquote_marker(line) {
  if (line.startsWith(">")) {
    return true;
  } else if (line.startsWith(" >")) {
    return true;
  } else if (line.startsWith("  >")) {
    return true;
  } else if (line.startsWith("   >")) {
    return true;
  } else {
    return false;
  }
}
function drop_all_blockquote_markers(loop$line) {
  while (true) {
    let line = loop$line;
    let $ = has_blockquote_marker(line);
    if ($) {
      let _pipe = line;
      let _pipe$1 = drop_blockquote_marker(_pipe);
      loop$line = _pipe$1;
    } else {
      return line;
    }
  }
}
function clear_marker(line, marker, indent) {
  let line$1 = expand_tabs_listitem(line, marker);
  return repeat(" ", indent) + drop_start(line$1, indent);
}
function drop_3_spaces(line) {
  if (line.startsWith("   ")) {
    let line$1 = line.slice(3);
    return line$1;
  } else if (line.startsWith("  ")) {
    let line$1 = line.slice(2);
    return line$1;
  } else if (line.startsWith(" ")) {
    let line$1 = line.slice(1);
    return line$1;
  } else {
    let line$1 = line;
    return line$1;
  }
}
function has_list_marker(line, marker) {
  let line$1 = drop_3_spaces(line);
  if (marker === "-") {
    let ch = marker;
    return starts_with(line$1, ch);
  } else if (marker === "+") {
    let ch = marker;
    return starts_with(line$1, ch);
  } else if (marker === "*") {
    let ch = marker;
    return starts_with(line$1, ch);
  } else {
    if (line$1.startsWith("0")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("1")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("2")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("3")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("4")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("5")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("6")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("7")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("8")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else if (line$1.startsWith("9")) {
      let line$2 = line$1.slice(1);
      return has_ordinal_marker(line$2, marker);
    } else {
      return false;
    }
  }
}
function count_spaces(loop$line, loop$acc) {
  while (true) {
    let line = loop$line;
    let acc = loop$acc;
    if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$acc = acc + 1;
    } else {
      return acc;
    }
  }
}
function collapse_interior_space(s) {
  let $ = from_string("\\s+");
  let re;
  if ($ instanceof Ok) {
    re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH, "mork/internal/util", 234, "collapse_interior_space", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 5934,
      end: 5980,
      pattern_start: 5945,
      pattern_end: 5951
    });
  }
  return replace3(re, s, " ");
}
function do_gobble_link_label(loop$sp, loop$rest, loop$acc) {
  while (true) {
    let sp = loop$sp;
    let rest = loop$rest;
    let acc = loop$acc;
    let $ = split4(sp, rest);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    let body = acc + l;
    if (s === "") {
      return [body, ""];
    } else if (s === "\\") {
      if (r.startsWith("\\")) {
        let rest$1 = r.slice(1);
        loop$sp = sp;
        loop$rest = rest$1;
        loop$acc = body + "\\";
      } else if (r.startsWith("]")) {
        let rest$1 = r.slice(1);
        loop$sp = sp;
        loop$rest = rest$1;
        loop$acc = body + "]";
      } else if (r.startsWith("[")) {
        let rest$1 = r.slice(1);
        loop$sp = sp;
        loop$rest = rest$1;
        loop$acc = body + "[";
      } else {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = body + "\\";
      }
    } else if (s === "[") {
      return ["", acc + rest];
    } else if (s === "]") {
      return [body, r];
    } else {
      throw makeError("panic", FILEPATH, "mork/internal/util", 262, "do_gobble_link_label", "bad splitter, bad", {});
    }
  }
}
function gobble_link_label(sp, rest) {
  let $ = do_gobble_link_label(sp, rest, "");
  let label2;
  let rest$1;
  label2 = $[0];
  rest$1 = $[1];
  let label$1 = collapse_interior_space(label2);
  return [label$1, rest$1];
}
function gobble_hspace(loop$in) {
  while (true) {
    let in$ = loop$in;
    if (in$.startsWith(" ")) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
    } else if (in$.startsWith("\t")) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
    } else {
      return in$;
    }
  }
}
function do_parse_link_dest(loop$sp, loop$in, loop$acc, loop$stack, loop$value) {
  while (true) {
    let sp = loop$sp;
    let in$ = loop$in;
    let acc = loop$acc;
    let stack = loop$stack;
    let value2 = loop$value;
    let $ = split4(sp, in$);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    let body = acc + l;
    if (s === "") {
      if (stack instanceof Empty) {
        if (body === "") {
          return new Error(undefined);
        } else {
          return value2(new_destination(body), r);
        }
      } else {
        return new Error(undefined);
      }
    } else if (s === `
`) {
      return value2(new_destination(body), r);
    } else if (s === "\\") {
      if (r.startsWith("!")) {
        let ch = "!";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("#")) {
        let ch = "#";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("$")) {
        let ch = "$";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("%")) {
        let ch = "%";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("&")) {
        let ch = "&";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("'")) {
        let ch = "'";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("(")) {
        let ch = "(";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(")")) {
        let ch = ")";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("*")) {
        let ch = "*";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("+")) {
        let ch = "+";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(",")) {
        let ch = ",";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("-")) {
        let ch = "-";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(".")) {
        let ch = ".";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("/")) {
        let ch = "/";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(":")) {
        let ch = ":";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(";")) {
        let ch = ";";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("=")) {
        let ch = "=";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("?")) {
        let ch = "?";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("@")) {
        let ch = "@";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("[")) {
        let ch = "[";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("\\")) {
        let ch = "\\";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("]")) {
        let ch = "]";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("^")) {
        let ch = "^";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("_")) {
        let ch = "_";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("`")) {
        let ch = "`";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("{")) {
        let ch = "{";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("|")) {
        let ch = "|";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("}")) {
        let ch = "}";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("~")) {
        let ch = "~";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith('"')) {
        let ch = '"';
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("<")) {
        let ch = "<";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(">")) {
        let ch = ">";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$acc = body + ch;
        loop$stack = stack;
        loop$value = value2;
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$acc = body + "\\";
        loop$stack = stack;
        loop$value = value2;
      }
    } else if (s === ")") {
      if (stack instanceof Empty) {
        return value2(new_destination(body), ")" + r);
      } else {
        let $1 = stack.head;
        if ($1 === ")") {
          let rest = stack.tail;
          loop$sp = sp;
          loop$in = r;
          loop$acc = body + ")";
          loop$stack = rest;
          loop$value = value2;
        } else {
          return new Error(undefined);
        }
      }
    } else if (s === "(") {
      loop$sp = sp;
      loop$in = r;
      loop$acc = body + "(";
      loop$stack = prepend(")", stack);
      loop$value = value2;
    } else if (s === " ") {
      if (stack instanceof Empty) {
        return value2(new_destination(body), r);
      } else {
        return new Error(undefined);
      }
    } else if (s === "\t") {
      if (stack instanceof Empty) {
        return value2(new_destination(body), r);
      } else {
        return new Error(undefined);
      }
    } else {
      throw makeError("panic", FILEPATH, "mork/internal/util", 402, "do_parse_link_dest", "missing case in splitter", {});
    }
  }
}
function try_pop(ch, in$, value2) {
  if (in$.startsWith("<")) {
    let first3 = "<";
    if (ch === first3) {
      let rest = in$.slice(1);
      return value2(rest);
    } else {
      return new Error(undefined);
    }
  } else if (in$.startsWith(">")) {
    let first3 = ">";
    if (ch === first3) {
      let rest = in$.slice(1);
      return value2(rest);
    } else {
      return new Error(undefined);
    }
  } else if (in$.startsWith("[")) {
    let first3 = "[";
    if (ch === first3) {
      let rest = in$.slice(1);
      return value2(rest);
    } else {
      return new Error(undefined);
    }
  } else if (in$.startsWith("]")) {
    let first3 = "]";
    if (ch === first3) {
      let rest = in$.slice(1);
      return value2(rest);
    } else {
      return new Error(undefined);
    }
  } else {
    return new Error(undefined);
  }
}
function do_parse_link_dest_tag(loop$sp, loop$in, loop$acc, loop$value) {
  while (true) {
    let sp = loop$sp;
    let in$ = loop$in;
    let acc = loop$acc;
    let value2 = loop$value;
    let $ = split4(sp, in$);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    if (s === "") {
      return new Error(undefined);
    } else if (s === "\\") {
      let $1 = pop_grapheme(r);
      if ($1 instanceof Ok) {
        let ch = $1[0][0];
        let rest = $1[0][1];
        loop$sp = sp;
        loop$in = rest;
        loop$acc = acc + ch;
        loop$value = value2;
      } else {
        loop$sp = sp;
        loop$in = "";
        loop$acc = acc + "\\";
        loop$value = value2;
      }
    } else if (s === `
`) {
      return new Error(undefined);
    } else if (s === "<") {
      return new Error(undefined);
    } else if (s === ">") {
      return value2(new_destination(acc + l), s + r);
    } else {
      throw makeError("panic", FILEPATH, "mork/internal/util", 438, "do_parse_link_dest_tag", "`panic` expression evaluated.", {});
    }
  }
}
function parse_link_dest(in$, sp_link_dest, sp_link_dest_tag, value2) {
  let $ = starts_with(in$, "<");
  if ($) {
    return try_pop("<", in$, (in$2) => {
      return do_parse_link_dest_tag(sp_link_dest_tag, in$2, "", (dest, in$3) => {
        return try_pop(">", in$3, (in$4) => {
          if (in$4 === " ") {
            return value2(dest, in$4);
          } else if (in$4 === "\t") {
            return value2(dest, in$4);
          } else if (in$4 === "\r") {
            return value2(dest, in$4);
          } else if (in$4 === `
`) {
            return value2(dest, in$4);
          } else if (in$4 === "") {
            return value2(dest, in$4);
          } else if (in$4 === ")") {
            return value2(dest, in$4);
          } else if (in$4 === "]") {
            return value2(dest, in$4);
          } else {
            return new Error(undefined);
          }
        });
      });
    });
  } else {
    let in$1 = gobble_hspace(in$);
    return do_parse_link_dest(sp_link_dest, in$1, "", toList([]), (dest, in$2) => {
      return value2(dest, in$2);
    });
  }
}
function is_blank(loop$line) {
  while (true) {
    let line = loop$line;
    if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if (line.startsWith("\t")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if (line === "") {
      return true;
    } else {
      return false;
    }
  }
}
function is_blankn(loop$line) {
  while (true) {
    let line = loop$line;
    if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if (line.startsWith("\t")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
    } else if (line === "") {
      return true;
    } else if (line.startsWith(`
`)) {
      return true;
    } else {
      return false;
    }
  }
}
function do_parse_link_title(loop$sp, loop$in, loop$brace, loop$acc, loop$stack, loop$value) {
  while (true) {
    let sp = loop$sp;
    let in$ = loop$in;
    let brace = loop$brace;
    let acc = loop$acc;
    let stack = loop$stack;
    let value2 = loop$value;
    let $ = split4(sp, in$);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    if (s === "\\") {
      if (r.startsWith("!")) {
        let ch = "!";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("#")) {
        let ch = "#";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("$")) {
        let ch = "$";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("%")) {
        let ch = "%";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("&")) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&amp;";
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("'")) {
        let ch = "'";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("(")) {
        let ch = "(";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(")")) {
        let ch = ")";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("*")) {
        let ch = "*";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("+")) {
        let ch = "+";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(",")) {
        let ch = ",";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("-")) {
        let ch = "-";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(".")) {
        let ch = ".";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("/")) {
        let ch = "/";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(":")) {
        let ch = ":";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(";")) {
        let ch = ";";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("<")) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&lt;";
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("=")) {
        let ch = "=";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith(">")) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&gt;";
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("?")) {
        let ch = "?";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("@")) {
        let ch = "@";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("[")) {
        let ch = "[";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith('"')) {
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + "&quot;";
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("\\")) {
        let ch = "\\";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("]")) {
        let ch = "]";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("^")) {
        let ch = "^";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("_")) {
        let ch = "_";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("`")) {
        let ch = "`";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("{")) {
        let ch = "{";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("|")) {
        let ch = "|";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("}")) {
        let ch = "}";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else if (r.startsWith("~")) {
        let ch = "~";
        let rest = r.slice(1);
        loop$sp = sp;
        loop$in = rest;
        loop$brace = brace;
        loop$acc = acc + l + ch;
        loop$stack = stack;
        loop$value = value2;
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + s;
        loop$stack = stack;
        loop$value = value2;
      }
    } else if (s === '"') {
      let $1 = brace === '"';
      if ($1) {
        return value2(new Some(acc + l), r);
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + '"';
        loop$stack = stack;
        loop$value = value2;
      }
    } else if (s === "'") {
      let $1 = brace === "'";
      if ($1) {
        return value2(new Some(acc + l), r);
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + "'";
        loop$stack = stack;
        loop$value = value2;
      }
    } else if (s === ")") {
      if (stack instanceof Empty) {
        return value2(new Some(acc + l), r);
      } else {
        let stack$1 = stack.tail;
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + ")";
        loop$stack = stack$1;
        loop$value = value2;
      }
    } else if (s === "(") {
      loop$sp = sp;
      loop$in = r;
      loop$brace = brace;
      loop$acc = acc + l + "(";
      loop$stack = prepend(")", stack);
      loop$value = value2;
    } else if (s === `
`) {
      let $1 = r !== "" && is_blankn(r);
      if ($1) {
        return new Error(undefined);
      } else {
        loop$sp = sp;
        loop$in = r;
        loop$brace = brace;
        loop$acc = acc + l + `
`;
        loop$stack = stack;
        loop$value = value2;
      }
    } else {
      return new Error(undefined);
    }
  }
}
function parse_link_title(in$, sp_link_title, value2) {
  if (in$.startsWith(")")) {
    return value2(new None, in$);
  } else if (in$.startsWith('"')) {
    let ch = '"';
    let rest = in$.slice(1);
    return do_parse_link_title(sp_link_title, rest, ch, "", toList([]), value2);
  } else if (in$.startsWith("'")) {
    let ch = "'";
    let rest = in$.slice(1);
    return do_parse_link_title(sp_link_title, rest, ch, "", toList([]), value2);
  } else if (in$.startsWith("(")) {
    let ch = "(";
    let rest = in$.slice(1);
    return do_parse_link_title(sp_link_title, rest, ch, "", toList([]), value2);
  } else {
    return new Error(undefined);
  }
}
function parse_ordinal(ord) {
  let ordlen = string_length(ord);
  return guard(ordlen < 1 || ordlen > 9, new Error(undefined), () => {
    let _pipe = ord;
    let _pipe$1 = parse_int(_pipe);
    return try$(_pipe$1, (ord2) => {
      return guard(ord2 < 0, new Error(undefined), () => {
        return new Ok(ord2);
      });
    });
  });
}
function calc_post_item_width(idx, post2) {
  let _block;
  if (post2 === "") {
    _block = 1;
  } else if (post2.startsWith(" ")) {
    let $ = expand_tabs_indent(post2);
    let expanded;
    expanded = $[0];
    let $1 = count_spaces(expanded, 0);
    let sp = $1;
    if (sp > 4) {
      _block = 1;
    } else {
      _block = $1;
    }
  } else if (post2.startsWith("\t")) {
    let $ = expand_tabs_indent(post2);
    let expanded;
    expanded = $[0];
    let $1 = count_spaces(expanded, 0);
    let sp = $1;
    if (sp > 4) {
      _block = 1;
    } else {
      _block = $1;
    }
  } else {
    _block = 0;
  }
  let postcount = _block;
  let _block$1;
  if (postcount === 0) {
    _block$1 = postcount;
  } else {
    let n = postcount;
    _block$1 = idx + n;
  }
  let ret = _block$1;
  return ret;
}
function do_countdrop_spaces(loop$line, loop$spaces, loop$count) {
  while (true) {
    let line = loop$line;
    let spaces = loop$spaces;
    let count2 = loop$count;
    let $ = spaces < 1;
    if ($) {
      return [count2, line];
    } else {
      if (line.startsWith(" ")) {
        let rest = line.slice(1);
        loop$line = rest;
        loop$spaces = spaces - 1;
        loop$count = count2 + 1;
      } else {
        return [count2, line];
      }
    }
  }
}
function countdrop_3_spaces(line) {
  return do_countdrop_spaces(line, 3, 0);
}
function is_empty_list(sp_dot_paren, line) {
  let $ = countdrop_3_spaces(line);
  let line$1;
  line$1 = $[1];
  if (line$1.startsWith("-")) {
    let rest = line$1.slice(1);
    return is_blank(rest);
  } else if (line$1.startsWith("+")) {
    let rest = line$1.slice(1);
    return is_blank(rest);
  } else if (line$1.startsWith("*")) {
    let rest = line$1.slice(1);
    return is_blank(rest);
  } else {
    let $1 = split4(sp_dot_paren, line$1);
    let ord;
    let marker;
    let rest;
    ord = $1[0];
    marker = $1[1];
    rest = $1[2];
    return guard(marker !== "." && marker !== ")", false, () => {
      let $2 = parse_ordinal(ord);
      if ($2 instanceof Ok) {
        return is_blank(rest);
      } else {
        return false;
      }
    });
  }
}
function parse_bullet_item(line) {
  let $ = countdrop_3_spaces(line);
  let idx;
  let line$1;
  idx = $[0];
  line$1 = $[1];
  if (line$1.startsWith("-")) {
    let marker = "-";
    let rest = line$1.slice(1);
    let $1 = is_blank(rest);
    if ($1) {
      return new Ok([marker, idx + 2]);
    } else {
      let indent = calc_post_item_width(idx + 1, rest);
      return guard(indent === 0, new Error(undefined), () => {
        return new Ok([marker, indent]);
      });
    }
  } else if (line$1.startsWith("+")) {
    let marker = "+";
    let rest = line$1.slice(1);
    let $1 = is_blank(rest);
    if ($1) {
      return new Ok([marker, idx + 2]);
    } else {
      let indent = calc_post_item_width(idx + 1, rest);
      return guard(indent === 0, new Error(undefined), () => {
        return new Ok([marker, indent]);
      });
    }
  } else if (line$1.startsWith("*")) {
    let marker = "*";
    let rest = line$1.slice(1);
    let $1 = is_blank(rest);
    if ($1) {
      return new Ok([marker, idx + 2]);
    } else {
      let indent = calc_post_item_width(idx + 1, rest);
      return guard(indent === 0, new Error(undefined), () => {
        return new Ok([marker, indent]);
      });
    }
  } else {
    return new Error(undefined);
  }
}
function parse_ordinal_item(sp_dot_paren, line) {
  let $ = countdrop_3_spaces(line);
  let idx;
  let line$1;
  idx = $[0];
  line$1 = $[1];
  let $1 = split4(sp_dot_paren, line$1);
  let ord;
  let marker;
  let rest;
  ord = $1[0];
  marker = $1[1];
  rest = $1[2];
  return guard(marker !== "." && marker !== ")", new Error(undefined), () => {
    let ordlen = string_length(ord);
    return guard(ordlen < 1 || ordlen > 9, new Error(undefined), () => {
      let _pipe = ord;
      let _pipe$1 = parse_int(_pipe);
      return try$(_pipe$1, (ord2) => {
        return guard(ord2 < 0, new Error(undefined), () => {
          let indent = calc_post_item_width(idx + ordlen + 1, rest);
          return guard(indent === 0, new Error(undefined), () => {
            return new Ok([marker, indent, ord2]);
          });
        });
      });
    });
  });
}
function take_star_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.startsWith("*")) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_unds_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.startsWith("_")) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_quot_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.startsWith("`")) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_tilde_run(loop$in, loop$acc) {
  while (true) {
    let in$ = loop$in;
    let acc = loop$acc;
    if (in$.startsWith("~")) {
      let in$1 = in$.slice(1);
      loop$in = in$1;
      loop$acc = acc + 1;
    } else {
      return [acc, in$];
    }
  }
}
function take_fence_run(in$, fence) {
  if (fence === "`") {
    return take_quot_run(in$, 1);
  } else if (fence === "~") {
    return take_tilde_run(in$, 1);
  } else {
    throw makeError("panic", FILEPATH, "mork/internal/util", 746, "take_fence_run", "take_fence_run bad fence: " + fence, {});
  }
}
function hr_eat_and_count_star(loop$line, loop$count) {
  while (true) {
    let line = loop$line;
    let count2 = loop$count;
    if (line.startsWith("*")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2 + 1;
    } else if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line.startsWith("\t")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line === "") {
      return new Ok(count2);
    } else {
      return new Error(undefined);
    }
  }
}
function hr_eat_and_count_dash(loop$line, loop$count) {
  while (true) {
    let line = loop$line;
    let count2 = loop$count;
    if (line.startsWith("-")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2 + 1;
    } else if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line.startsWith("\t")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line === "") {
      return new Ok(count2);
    } else {
      return new Error(undefined);
    }
  }
}
function hr_eat_and_count_unds(loop$line, loop$count) {
  while (true) {
    let line = loop$line;
    let count2 = loop$count;
    if (line.startsWith("_")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2 + 1;
    } else if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line.startsWith("\t")) {
      let line$1 = line.slice(1);
      loop$line = line$1;
      loop$count = count2;
    } else if (line === "") {
      return new Ok(count2);
    } else {
      return new Error(undefined);
    }
  }
}
function match_hr(line) {
  let line$1 = drop_3_spaces(line);
  let _block;
  if (line$1.startsWith("*")) {
    let line$2 = line$1.slice(1);
    _block = hr_eat_and_count_star(line$2, 1);
  } else if (line$1.startsWith("-")) {
    let line$2 = line$1.slice(1);
    _block = hr_eat_and_count_dash(line$2, 1);
  } else if (line$1.startsWith("_")) {
    let line$2 = line$1.slice(1);
    _block = hr_eat_and_count_unds(line$2, 1);
  } else {
    _block = new Error(undefined);
  }
  let count2 = _block;
  return unwrap2(count2, 0) > 2;
}

// build/dev/javascript/mork/mork/internal/cache.mjs
var FILEPATH2 = "src/mork/internal/cache.gleam";

class Cache2 extends CustomType {
  constructor(atx_heading_empty, atx_heading_tail, atx_heading_id, autolink, email_autolink, setext_h1, setext_h2, open_tag, close_tag, is_html_block_start, is_paragraph_continuation_text, is_a_html_tag, starts_with_ws, ends_with_ws, starts_with_p, ends_with_p, html_1_start, html_1_end, html_2_start, html_3_start, sp_hspace, sp_line, sp_scheme, sp_semi, sp_question, sp_escape, sp_html_escape, sp_dot_paren, sp_tag, sp_link_text, sp_link_dest, sp_inline, sp_link_label, sp_link_title, sp_link_dest_tag, sp_1backquote, sp_pipe) {
    super();
    this.atx_heading_empty = atx_heading_empty;
    this.atx_heading_tail = atx_heading_tail;
    this.atx_heading_id = atx_heading_id;
    this.autolink = autolink;
    this.email_autolink = email_autolink;
    this.setext_h1 = setext_h1;
    this.setext_h2 = setext_h2;
    this.open_tag = open_tag;
    this.close_tag = close_tag;
    this.is_html_block_start = is_html_block_start;
    this.is_paragraph_continuation_text = is_paragraph_continuation_text;
    this.is_a_html_tag = is_a_html_tag;
    this.starts_with_ws = starts_with_ws;
    this.ends_with_ws = ends_with_ws;
    this.starts_with_p = starts_with_p;
    this.ends_with_p = ends_with_p;
    this.html_1_start = html_1_start;
    this.html_1_end = html_1_end;
    this.html_2_start = html_2_start;
    this.html_3_start = html_3_start;
    this.sp_hspace = sp_hspace;
    this.sp_line = sp_line;
    this.sp_scheme = sp_scheme;
    this.sp_semi = sp_semi;
    this.sp_question = sp_question;
    this.sp_escape = sp_escape;
    this.sp_html_escape = sp_html_escape;
    this.sp_dot_paren = sp_dot_paren;
    this.sp_tag = sp_tag;
    this.sp_link_text = sp_link_text;
    this.sp_link_dest = sp_link_dest;
    this.sp_inline = sp_inline;
    this.sp_link_label = sp_link_label;
    this.sp_link_title = sp_link_title;
    this.sp_link_dest_tag = sp_link_dest_tag;
    this.sp_1backquote = sp_1backquote;
    this.sp_pipe = sp_pipe;
  }
}
var punctuation = "[!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~\\p{P}\\p{S}]";
var tag_name = "[A-Za-z][A-Za-z0-9-]*";
var attribute_name = "[a-zA-Z_:][a-zA-Z0-9:._-]*";
var unquoted_value = "[^\"'=<>`\\x00-\\x20]+";
var singlequoted_value = "'[^']*'";
var doublequoted_value = '"[^"]*"';
var attribute_value = "(?:" + unquoted_value + "|" + singlequoted_value + "|" + doublequoted_value + ")";
var attribute_value_spec = "(?:" + "\\s*=" + "\\s*" + attribute_value + ")";
var attribute3 = "(?:" + "\\s+" + attribute_name + attribute_value_spec + "?)";
function re_from_string(re) {
  let $ = from_string(re);
  let re$1;
  if ($ instanceof Ok) {
    re$1 = $[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 152, "re_from_string", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 4971,
      end: 5013,
      pattern_start: 4982,
      pattern_end: 4988
    });
  }
  return re$1;
}
function re_from_string_i(re) {
  let opt = new Options2(true, false);
  let $ = compile2(re, opt);
  let re$1;
  if ($ instanceof Ok) {
    re$1 = $[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 158, "re_from_string_i", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 5128,
      end: 5171,
      pattern_start: 5139,
      pattern_end: 5145
    });
  }
  return re$1;
}
function make_is_html_block_start(is_a_html_tag) {
  let re2 = re_from_string("^[A-Za-z]");
  let re1 = re_from_string_i("^(?:pre|script|style|textarea)(?:(?:[ \\t>]$)|$)");
  let re3 = re_from_string_i("^\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:(?:[ \\t>])|$|\\/>)");
  return (line, inc_type_7) => {
    if (line.startsWith("<")) {
      let line2 = line.slice(1);
      if (line2.startsWith("!")) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if (line2.startsWith("?")) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else if (line.startsWith(" <")) {
      let line2 = line.slice(2);
      if (line2.startsWith("!")) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if (line2.startsWith("?")) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else if (line.startsWith("  <")) {
      let line2 = line.slice(3);
      if (line2.startsWith("!")) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if (line2.startsWith("?")) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else if (line.startsWith("   <")) {
      let line2 = line.slice(4);
      if (line2.startsWith("!")) {
        let line2$1 = line2.slice(1);
        return starts_with(line2$1, "--") || starts_with(line2$1, "[CDATA[") || check2(re2, line2$1);
      } else if (line2.startsWith("?")) {
        return true;
      } else {
        return check2(re1, line2) || check2(re3, line2) || (() => {
          if (inc_type_7) {
            return is_a_html_tag(line, true, false);
          } else {
            return inc_type_7;
          }
        })();
      }
    } else {
      return false;
    }
  };
}
function make_is_paragraph_continuation_text(is_html_block, sp_dot_paren) {
  let $ = from_string("^(\\*[ \\t]*){3,}[ \\t\\*]*$");
  let re_hr_1;
  if ($ instanceof Ok) {
    re_hr_1 = $[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 243, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 7948,
      end: 8023,
      pattern_start: 7959,
      pattern_end: 7970
    });
  }
  let $1 = from_string("^(-[ \\t]*){3,}[ \\t-]*$");
  let re_hr_2;
  if ($1 instanceof Ok) {
    re_hr_2 = $1[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 244, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $1,
      start: 8026,
      end: 8097,
      pattern_start: 8037,
      pattern_end: 8048
    });
  }
  let $2 = from_string("^(_[ \\t]*){3,}[ \\t_]*$");
  let re_hr_3;
  if ($2 instanceof Ok) {
    re_hr_3 = $2[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 245, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $2,
      start: 8100,
      end: 8171,
      pattern_start: 8111,
      pattern_end: 8122
    });
  }
  let $3 = from_string("^([`]{3,}|[~]{3,})[ \\t]*(.*)$");
  let re_fenced;
  if ($3 instanceof Ok) {
    re_fenced = $3[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 246, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $3,
      start: 8174,
      end: 8257,
      pattern_start: 8185,
      pattern_end: 8198
    });
  }
  let $4 = from_string("^(#{1,6})[ \\t]+(.+)[ \\t]*#*$");
  let re_h_atx;
  if ($4 instanceof Ok) {
    re_h_atx = $4[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 248, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $4,
      start: 8260,
      end: 8338,
      pattern_start: 8271,
      pattern_end: 8283
    });
  }
  let $5 = from_string("^([-]|\\+|\\*)(?:[ ]|\\t)");
  let re_list_1;
  if ($5 instanceof Ok) {
    re_list_1 = $5[0];
  } else {
    throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 249, "make_is_paragraph_continuation_text", "Pattern match failed, no pattern matched the value.", {
      value: $5,
      start: 8341,
      end: 8415,
      pattern_start: 8352,
      pattern_end: 8365
    });
  }
  return (line) => {
    if (line.startsWith("   ")) {
      let line$1 = line.slice(3);
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    } else if (line.startsWith("  ")) {
      let line$1 = line.slice(2);
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    } else if (line.startsWith(" ")) {
      let line$1 = line.slice(1);
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    } else {
      let line$1 = line;
      let $6 = is_blank(line$1) || check2(re_hr_1, line$1) || check2(re_hr_2, line$1) || check2(re_hr_3, line$1) || check2(re_fenced, line$1) || check2(re_list_1, line$1) || check2(re_h_atx, line$1) || is_html_block(line$1, false);
      if ($6) {
        return false;
      } else {
        let $7 = parse_ordinal_item(sp_dot_paren, line$1);
        if ($7 instanceof Ok) {
          let ord = $7[0][2];
          return ord !== 1;
        } else {
          return true;
        }
      }
    }
  };
}
function make_is_a_html_tag() {
  return (in$, anchor_start, anchor_end) => {
    let s = "^[ ]{0,3}";
    let e = "$";
    let $ = from_string("<" + tag_name + attribute3 + "*" + "\\s*/?>");
    let open_tag;
    if ($ instanceof Ok) {
      open_tag = $[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 285, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $,
        start: 9547,
        end: 9647,
        pattern_start: 9558,
        pattern_end: 9570
      });
    }
    let $1 = from_string(s + "<" + tag_name + attribute3 + "*" + "\\s*/?>");
    let open_tag_s;
    if ($1 instanceof Ok) {
      open_tag_s = $1[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 287, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $1,
        start: 9652,
        end: 9759,
        pattern_start: 9663,
        pattern_end: 9677
      });
    }
    let $2 = from_string("<" + tag_name + attribute3 + "*" + "\\s*/?>" + e);
    let open_tag_e;
    if ($2 instanceof Ok) {
      open_tag_e = $2[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 289, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $2,
        start: 9764,
        end: 9871,
        pattern_start: 9775,
        pattern_end: 9789
      });
    }
    let $3 = from_string(s + "<" + tag_name + attribute3 + "*" + "\\s*/?>" + e);
    let open_tag_se;
    if ($3 instanceof Ok) {
      open_tag_se = $3[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 291, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $3,
        start: 9876,
        end: 10006,
        pattern_start: 9887,
        pattern_end: 9902
      });
    }
    let $4 = from_string("</" + tag_name + "\\s*[>]");
    let close_tag;
    if ($4 instanceof Ok) {
      close_tag = $4[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 295, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $4,
        start: 10011,
        end: 10087,
        pattern_start: 10022,
        pattern_end: 10035
      });
    }
    let $5 = from_string(s + "</" + tag_name + "\\s*[>]");
    let close_tag_s;
    if ($5 instanceof Ok) {
      close_tag_s = $5[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 296, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $5,
        start: 10092,
        end: 10181,
        pattern_start: 10103,
        pattern_end: 10118
      });
    }
    let $6 = from_string("</" + tag_name + "\\s*[>]" + e);
    let close_tag_e;
    if ($6 instanceof Ok) {
      close_tag_e = $6[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 298, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $6,
        start: 10186,
        end: 10275,
        pattern_start: 10197,
        pattern_end: 10212
      });
    }
    let $7 = from_string(s + "</" + tag_name + "\\s*[>]" + e);
    let close_tag_se;
    if ($7 instanceof Ok) {
      close_tag_se = $7[0];
    } else {
      throw makeError("let_assert", FILEPATH2, "mork/internal/cache", 300, "make_is_a_html_tag", "Pattern match failed, no pattern matched the value.", {
        value: $7,
        start: 10280,
        end: 10375,
        pattern_start: 10291,
        pattern_end: 10307
      });
    }
    if (anchor_start) {
      if (anchor_end) {
        return check2(open_tag_se, in$) || check2(close_tag_se, in$);
      } else {
        return check2(open_tag_s, in$) || check2(close_tag_s, in$);
      }
    } else {
      if (anchor_end) {
        return check2(open_tag_e, in$) || check2(close_tag_e, in$);
      } else {
        return check2(open_tag, in$) || check2(close_tag, in$);
      }
    }
  };
}
function new$8() {
  let sp_dot_paren = new$6(toList([".", ")"]));
  let is_a_html_tag = make_is_a_html_tag();
  let is_html_block_start = make_is_html_block_start(is_a_html_tag);
  let is_pct = make_is_paragraph_continuation_text(is_html_block_start, sp_dot_paren);
  let re_starts_with_ws = re_from_string("^\\s");
  let re_ends_with_ws = re_from_string("\\s$");
  let re_starts_with_p = re_from_string("^" + punctuation);
  let re_ends_with_p = re_from_string(punctuation + "$");
  let starts_with_ws = (s) => {
    let $ = s === "";
    if ($) {
      return $;
    } else {
      return check2(re_starts_with_ws, s);
    }
  };
  let ends_with_ws = (s) => {
    let $ = s === "";
    if ($) {
      return $;
    } else {
      return check2(re_ends_with_ws, s);
    }
  };
  let starts_with_p = (s) => {
    return check2(re_starts_with_p, s);
  };
  let ends_with_p = (s) => {
    return check2(re_ends_with_p, s);
  };
  let html_1_start = re_from_string_i("^<(?:pre|script|style|textarea)(?:(?:[ \\t>])|$)");
  let html_1_end = re_from_string_i("<\\/(?:pre|script|style|textarea)>");
  let html_2_start = re_from_string_i("^<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:(?:[ \\t>])|$|\\/>)");
  let html_3_start = re_from_string("^<![A-Za-z]");
  return new Cache2(re_from_string("^#+[ \\t]*$"), re_from_string("[ \\t]+#+[ \\t]*$"), re_from_string("\\{#(\\S+)\\}[ \\t]*$"), re_from_string("^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\\x00-\\x20<> ]*$"), re_from_string("^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"), re_from_string("^[ ]{0,3}=+[ \\t]*$"), re_from_string("^[ ]{0,3}-+[ \\t]*$"), re_from_string("<" + tag_name + attribute3 + "*" + "\\s/?>"), re_from_string("</" + tag_name + attribute3 + "*" + "\\s/?>"), is_html_block_start, is_pct, is_a_html_tag, starts_with_ws, ends_with_ws, starts_with_p, ends_with_p, html_1_start, html_1_end, html_2_start, html_3_start, new$6(toList([" ", "\t"])), new$6(toList([`
`, `\r
`])), new$6(toList(["://", ":"])), new$6(toList([";"])), new$6(toList(["?"])), new$6(toList(["\\"])), new$6(toList(["\\", "&", "<", ">", '"'])), sp_dot_paren, new$6(toList([">", "\\", '"', "'"])), new$6(toList(["[", "]", "\\", `
`])), new$6(toList(["\\", " ", "\t", ")", "(", `
`])), new$6(toList([
    "\\",
    "*",
    "_",
    "~~",
    "==",
    "![",
    "[^",
    "[",
    "`",
    "<",
    ">",
    "&",
    '"',
    `
`,
    "]",
    "https://",
    "http://",
    "www."
  ])), new$6(toList(["\\", "[", "]"])), new$6(toList(["\\", '"', "'", "(", ")", `
`])), new$6(toList(["\\", `
`, "<", ">"])), new$6(toList(["`"])), new$6(toList(["|", "\\|"])));
}

// build/dev/javascript/mork/mork/internal/mork_ffi.js
function do_try_pop(pos, ch, orelse, cont) {
  if (pos.startsWith(ch)) {
    return cont(pos.slice(1));
  } else {
    return orelse();
  }
}
function do_take_while(haystack, needle, acc) {
  while (haystack.startsWith(needle)) {
    acc = needle + acc;
    haystack = haystack.slice(1);
  }
  return [acc, haystack];
}

// build/dev/javascript/mork/mork/internal/parser.mjs
var FILEPATH3 = "src/mork/internal/parser.gleam";

class Parser extends CustomType {
  constructor(line_splitter, start5, rest, line, pos, indent) {
    super();
    this.line_splitter = line_splitter;
    this.start = start5;
    this.rest = rest;
    this.line = line;
    this.pos = pos;
    this.indent = indent;
  }
}
function new_state(start5, line_splitter) {
  let $ = split4(line_splitter, start5);
  let current;
  let rest;
  current = $[0];
  rest = $[2];
  let $1 = expand_tabs_indent(current);
  let line;
  let indent;
  line = $1[0];
  indent = $1[1];
  return new Parser(line_splitter, start5, rest, line, line, indent);
}
function advance_line(state) {
  let $ = split4(state.line_splitter, state.rest);
  let new_current;
  let new_rest;
  new_current = $[0];
  new_rest = $[2];
  let $1 = expand_tabs_indent(new_current);
  let line;
  let indent;
  line = $1[0];
  indent = $1[1];
  return new Parser(state.line_splitter, state.start, new_rest, line, line, indent);
}
function next_line_is_blank(state) {
  let $ = split4(state.line_splitter, state.rest);
  let next;
  next = $[0];
  return is_blank(next);
}
function next_line(state) {
  let $ = split4(state.line_splitter, state.rest);
  let next;
  next = $[0];
  return next;
}
function at_eof(state) {
  return state.line === "" && state.rest === "";
}
function update_pos(state, pos) {
  return new Parser(state.line_splitter, state.start, state.rest, state.line, pos, state.indent);
}
function try_pop2(state, ch, orelse, cont) {
  return do_try_pop(state.pos, ch, orelse, (pos) => {
    return cont(update_pos(state, pos));
  });
}
function next_nonspace(loop$state, loop$cont) {
  while (true) {
    let state = loop$state;
    let cont = loop$cont;
    let pos = gobble_hspace(state.pos);
    if (pos === "") {
      let $ = at_eof(state);
      if ($) {
        return cont(state);
      } else {
        loop$state = advance_line(state);
        loop$cont = cont;
      }
    } else {
      return cont(update_pos(state, pos));
    }
  }
}
function next_line_if_blank(state, cont) {
  let pos = gobble_hspace(state.pos);
  if (pos === "") {
    return lazy_guard(at_eof(state), () => {
      return cont(state);
    }, () => {
      let state$1 = advance_line(state);
      let pos$1 = gobble_hspace(state$1.pos);
      return cont(update_pos(state$1, pos$1));
    });
  } else {
    return cont(update_pos(state, pos));
  }
}
function do_merge_until_unescaped_end_bracket(loop$in, loop$sp, loop$acc, loop$stack) {
  while (true) {
    let in$ = loop$in;
    let sp = loop$sp;
    let acc = loop$acc;
    let stack = loop$stack;
    let $ = split4(sp, in$);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    let body = acc + l;
    if (s === "") {
      return l;
    } else if (s === "[") {
      loop$in = r;
      loop$sp = sp;
      loop$acc = body + "[";
      loop$stack = prepend("]", stack);
    } else if (s === "]") {
      if (stack instanceof Empty) {
        return body + "]" + r;
      } else {
        let $1 = stack.head;
        if ($1 === "]") {
          let stack$1 = stack.tail;
          loop$in = r;
          loop$sp = sp;
          loop$acc = body + "]";
          loop$stack = stack$1;
        } else {
          throw makeError("panic", FILEPATH3, "mork/internal/parser", 140, "do_merge_until_unescaped_end_bracket", "unexpected stack contents", {});
        }
      }
    } else if (s === "\\") {
      if (r.startsWith("\\")) {
        let r$1 = r.slice(1);
        loop$in = r$1;
        loop$sp = sp;
        loop$acc = body + "\\\\";
        loop$stack = stack;
      } else if (r.startsWith("[")) {
        let r$1 = r.slice(1);
        loop$in = r$1;
        loop$sp = sp;
        loop$acc = body + "\\[";
        loop$stack = stack;
      } else if (r.startsWith("]")) {
        let r$1 = r.slice(1);
        loop$in = r$1;
        loop$sp = sp;
        loop$acc = body + "\\]";
        loop$stack = stack;
      } else {
        loop$in = r;
        loop$sp = sp;
        loop$acc = body + "\\";
        loop$stack = stack;
      }
    } else if (s === `
`) {
      loop$in = r;
      loop$sp = sp;
      loop$acc = body + " ";
      loop$stack = stack;
    } else {
      throw makeError("panic", FILEPATH3, "mork/internal/parser", 153, "do_merge_until_unescaped_end_bracket", "unexpected split", {});
    }
  }
}
function merge_until_unescaped_end_bracket(state, lbrbescn, cont) {
  let data2 = do_merge_until_unescaped_end_bracket(state.pos + `
` + state.rest, lbrbescn, "", toList([]));
  return cont(new_state(data2, state.line_splitter));
}

// build/dev/javascript/mork/mork/internal/context.mjs
class Context extends CustomType {
  constructor(cache, state, stack, doc, nest) {
    super();
    this.cache = cache;
    this.state = state;
    this.stack = stack;
    this.doc = doc;
    this.nest = nest;
  }
}
class NestItem extends CustomType {
  constructor(indent) {
    super();
    this.indent = indent;
  }
}
function from_string2(options, text4) {
  let cache = new$8();
  let state = new_state(text4, cache.sp_line);
  let doc = new$7(options);
  return new Context(cache, state, toList([]), doc, toList([]));
}
function update_blocks(ctx, blocks) {
  return new Context(ctx.cache, ctx.state, ctx.stack, (() => {
    let _record = ctx.doc;
    return new Document(_record.options, blocks, _record.links, _record.footnotes);
  })(), ctx.nest);
}
function advance_pos(ctx, pos) {
  return new Context(ctx.cache, update_pos(ctx.state, pos), ctx.stack, ctx.doc, ctx.nest);
}
function advance_line2(ctx) {
  return new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
}
function advance_line_with_blocks(ctx, blocks) {
  return new Context(ctx.cache, advance_line(ctx.state), ctx.stack, (() => {
    let _record = ctx.doc;
    return new Document(_record.options, blocks, _record.links, _record.footnotes);
  })(), ctx.nest);
}
function with_state(ctx, raw) {
  return new Context(ctx.cache, new_state(raw, ctx.cache.sp_line), ctx.stack, ctx.doc, ctx.nest);
}
function with_state_reset_blocks(ctx, raw) {
  return new Context(ctx.cache, new_state(raw, ctx.cache.sp_line), toList([]), (() => {
    let _record = ctx.doc;
    return new Document(_record.options, toList([]), _record.links, _record.footnotes);
  })(), toList([]));
}
function merge3(ctx, other, blocks) {
  return new Context(ctx.cache, ctx.state, ctx.stack, new Document(ctx.doc.options, blocks, other.doc.links, other.doc.footnotes), ctx.nest);
}

// build/dev/javascript/mork/mork/internal/blocks.mjs
var FILEPATH4 = "src/mork/internal/blocks.gleam";

class SetextH1 extends CustomType {
}

class SetextH2 extends CustomType {
}

class SetextNot extends CustomType {
}
function try_parse_blank(ctx, cont) {
  let $ = (() => {
    let _pipe = ctx.state.pos;
    return is_blank(_pipe);
  })();
  if ($) {
    return advance_line_with_blocks(ctx, prepend(new Newline, ctx.doc.blocks));
  } else {
    return cont();
  }
}
function try_parse_thematic_break(ctx, cont) {
  return lazy_guard(!match_hr(ctx.state.pos), cont, () => {
    return advance_line_with_blocks(ctx, prepend(new ThematicBreak, ctx.doc.blocks));
  });
}
function take_hashes(loop$input, loop$acc) {
  while (true) {
    let input2 = loop$input;
    let acc = loop$acc;
    if (input2.startsWith("#")) {
      let input$1 = input2.slice(1);
      loop$input = input$1;
      loop$acc = acc + 1;
    } else {
      return [acc, input2];
    }
  }
}
function take_hspaces(loop$tail, loop$rest) {
  while (true) {
    let tail = loop$tail;
    let rest = loop$rest;
    if (tail.startsWith(" ")) {
      let tail$1 = tail.slice(1);
      loop$tail = tail$1;
      loop$rest = rest;
    } else if (tail.startsWith("\t")) {
      let tail$1 = tail.slice(1);
      loop$tail = tail$1;
      loop$rest = rest;
    } else {
      return rest(tail);
    }
  }
}
function take_hspaces1(tail, cont, rest) {
  if (tail.startsWith(" ")) {
    let tail$1 = tail.slice(1);
    return take_hspaces(tail$1, rest);
  } else if (tail.startsWith("\t")) {
    let tail$1 = tail.slice(1);
    return take_hspaces(tail$1, rest);
  } else if (tail === "") {
    return rest(tail);
  } else {
    return cont();
  }
}
function do_heading_id(loop$text, loop$acc) {
  while (true) {
    let text4 = loop$text;
    let acc = loop$acc;
    let $ = pop_grapheme(text4);
    if ($ instanceof Ok) {
      let ch = $[0][0];
      let rest = $[0][1];
      let $1 = contains_string("abcdefghijklmnopqrstuvwxyz0123456789", lowercase(ch));
      if ($1) {
        loop$text = rest;
        loop$acc = acc + ch;
      } else {
        if (ch === " ") {
          loop$text = rest;
          loop$acc = acc + "-";
        } else if (ch === "-") {
          loop$text = rest;
          loop$acc = acc + "-";
        } else if (ch === "_") {
          loop$text = rest;
          loop$acc = acc + "-";
        } else {
          loop$text = rest;
          loop$acc = acc;
        }
      }
    } else {
      return acc;
    }
  }
}
function heading_id(re, text4) {
  let $ = scan2(re, text4);
  if ($ instanceof Empty) {
    return do_heading_id(text4, "");
  } else {
    let $1 = $.tail;
    if ($1 instanceof Empty) {
      let $2 = $.head.submatches;
      if ($2 instanceof Empty) {
        return do_heading_id(text4, "");
      } else {
        let $3 = $2.head;
        if ($3 instanceof Some) {
          let $4 = $2.tail;
          if ($4 instanceof Empty) {
            let text$1 = $3[0];
            return text$1;
          } else {
            return do_heading_id(text4, "");
          }
        } else {
          return do_heading_id(text4, "");
        }
      }
    } else {
      return do_heading_id(text4, "");
    }
  }
}
function try_parse_atx_heading(ctx, rest, cont) {
  let $ = take_hashes(rest, 1);
  let num;
  let rest$1;
  num = $[0];
  rest$1 = $[1];
  return lazy_guard(num > 6, cont, () => {
    return take_hspaces1(rest$1, cont, (rest2) => {
      let rest$12 = replace3(ctx.cache.atx_heading_tail, rest2, "");
      let _block;
      let $1 = check2(ctx.cache.atx_heading_empty, rest$12);
      if ($1) {
        _block = "";
      } else {
        _block = rest$12;
      }
      let rest$2 = _block;
      let _block$1;
      let $2 = ctx.doc.options.heading_ids;
      if ($2) {
        _block$1 = heading_id(ctx.cache.atx_heading_id, rest$2);
      } else {
        _block$1 = "";
      }
      let id2 = _block$1;
      let _block$2;
      let $3 = ctx.doc.options.heading_ids;
      if ($3) {
        _block$2 = replace3(ctx.cache.atx_heading_id, rest$2, "");
      } else {
        _block$2 = rest$2;
      }
      let rest$3 = _block$2;
      return advance_line_with_blocks(ctx, prepend(new Heading(num, id2, rest$3, toList([])), ctx.doc.blocks));
    });
  });
}
function try_or(res, when_err, when_ok) {
  if (res instanceof Ok) {
    let v = res[0];
    return when_ok(v);
  } else {
    return when_err();
  }
}
function are_separated(items) {
  if (items instanceof Empty) {
    return false;
  } else {
    let $ = items.tail;
    if ($ instanceof Empty) {
      return false;
    } else {
      let item = items.head;
      let rest = $;
      return item.ends_with_blank || are_separated(rest);
    }
  }
}
function calculate_list_pack(items) {
  let contains2 = any(items, (item) => {
    return item.contains_blank;
  });
  return check3(contains2 || are_separated(items), new Loose, new Tight);
}
function list_item_indent(ctx, line, marker) {
  if (marker === ".") {
    let $ = parse_ordinal_item(ctx.cache.sp_dot_paren, line);
    if ($ instanceof Ok) {
      let indent = $[0][1];
      return indent;
    } else {
      return 0;
    }
  } else if (marker === ")") {
    let $ = parse_ordinal_item(ctx.cache.sp_dot_paren, line);
    if ($ instanceof Ok) {
      let indent = $[0][1];
      return indent;
    } else {
      return 0;
    }
  } else {
    let $ = parse_bullet_item(line);
    if ($ instanceof Ok) {
      let indent = $[0][1];
      return indent;
    } else {
      return 0;
    }
  }
}
function list_item_line_start(ctx, marker, require_indent) {
  let line = ctx.state.pos;
  return guard(is_blank(line), [new None, require_indent], () => {
    let line_indent = find_indent(line);
    let list_indent = list_item_indent(ctx, line, marker);
    return guard(line_indent > require_indent, [new None, list_indent], () => {
      return guard(match_hr(line), [new None, list_indent], () => {
        return lazy_guard(is_empty_list(ctx.cache.sp_dot_paren, line), () => {
          let $ = has_list_marker(line, marker);
          if ($) {
            return [new Some(""), list_indent];
          } else {
            return [new None, list_indent];
          }
        }, () => {
          return lazy_guard(has_list_marker(line, marker), () => {
            return [
              new Some(clear_marker(line, marker, list_indent)),
              list_indent
            ];
          }, () => {
            return [new None, list_indent];
          });
        });
      });
    });
  });
}
function is_list_item(ctx, line) {
  return guard(match_hr(line), false, () => {
    let $ = parse_bullet_item(line);
    if ($ instanceof Ok) {
      return true;
    } else {
      let $1 = parse_ordinal_item(ctx.cache.sp_dot_paren, line);
      if ($1 instanceof Ok) {
        return true;
      } else {
        return false;
      }
    }
  });
}
function item_ends_with_blank(lines) {
  let _block;
  let _pipe = lines;
  _block = reverse(_pipe);
  let lines$1 = _block;
  if (lines$1 instanceof Empty) {
    return false;
  } else {
    let $ = lines$1.tail;
    if ($ instanceof Empty) {
      return false;
    } else {
      let head = lines$1.head;
      return head === "";
    }
  }
}
function block_contains_blank(block) {
  return block instanceof Newline;
}
function item_contains_blank(blocks) {
  return count(blocks, (block) => {
    if (block instanceof Paragraph) {
      return true;
    } else {
      return false;
    }
  }) > 1 || any(blocks, block_contains_blank);
}
function set_nest_listitem(ctx, indent) {
  return new Context(ctx.cache, ctx.state, ctx.stack, ctx.doc, prepend(new NestItem(indent), ctx.nest));
}
function set_nest_blockquote(ctx) {
  let $ = ctx.nest;
  if ($ instanceof Empty) {
    return new Context(ctx.cache, ctx.state, ctx.stack, ctx.doc, prepend(new NestItem(0), ctx.nest));
  } else {
    return ctx;
  }
}
function new_code_block(lang, lines) {
  return new Code(lang, join(reverse(lines), `
`) + `
`);
}
function drop_empty(lines) {
  if (lines instanceof Empty) {
    return lines;
  } else {
    let $ = lines.head;
    if ($ === "") {
      let lines$1 = lines.tail;
      return lines$1;
    } else {
      return lines;
    }
  }
}
function drop_empty_tail(lines) {
  let _pipe = lines;
  let _pipe$1 = reverse(_pipe);
  let _pipe$2 = drop_empty(_pipe$1);
  return reverse(_pipe$2);
}
function add_indented_code_block(ctx, lines) {
  let _block;
  let _pipe = lines;
  let _pipe$1 = drop_empty(_pipe);
  _block = drop_empty_tail(_pipe$1);
  let lines$1 = _block;
  return update_blocks(ctx, prepend(new_code_block(new None, lines$1), ctx.doc.blocks));
}
function do_indented(loop$ctx, loop$indent, loop$lines) {
  while (true) {
    let ctx = loop$ctx;
    let indent = loop$indent;
    let lines = loop$lines;
    let to_drop = 4 + indent;
    let lines$1 = prepend(drop_indent(ctx.state.line, to_drop), lines);
    let ctx$1 = new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
    let $ = !at_eof(ctx$1.state) && (ctx$1.state.indent >= to_drop || is_blank(ctx$1.state.pos));
    if ($) {
      loop$ctx = ctx$1;
      loop$indent = indent;
      loop$lines = lines$1;
    } else {
      return add_indented_code_block(ctx$1, lines$1);
    }
  }
}
function line_is_codeblock(line) {
  let indent = find_indent(line);
  return guard(indent >= 4, true, () => {
    let line$1 = drop_3_spaces(line);
    if (line$1.startsWith("`")) {
      let line$2 = line$1.slice(1);
      let $ = take_quot_run(line$2, 1);
      let len;
      let line$3;
      len = $[0];
      line$3 = $[1];
      return guard(len < 3, false, () => {
        return guard(contains_string(line$3, "`"), false, () => {
          return true;
        });
      });
    } else if (line$1.startsWith("~")) {
      let line$2 = line$1.slice(1);
      let $ = take_tilde_run(line$2, 1);
      let len;
      len = $[0];
      return guard(len < 3, false, () => {
        return true;
      });
    } else {
      return false;
    }
  });
}
function is_blockquote_line(line) {
  let line$1 = drop_3_spaces(line);
  if (line$1.startsWith(">")) {
    return true;
  } else {
    return false;
  }
}
function setext_underline(ctx, line) {
  return guard(check2(ctx.cache.setext_h1, line), new SetextH1, () => {
    return guard(check2(ctx.cache.setext_h2, line), new SetextH2, () => {
      return new SetextNot;
    });
  });
}
function do_take_lines(loop$ctx, loop$cond, loop$acc) {
  while (true) {
    let ctx = loop$ctx;
    let cond = loop$cond;
    let acc = loop$acc;
    let $ = at_eof(ctx.state);
    if ($) {
      return [ctx, acc];
    } else {
      let $1 = cond(ctx.state.pos);
      if ($1 instanceof Some) {
        let line = $1[0];
        loop$ctx = advance_line2(ctx);
        loop$cond = cond;
        loop$acc = prepend(line, acc);
      } else {
        return [ctx, acc];
      }
    }
  }
}
function take_lines(ctx, cond) {
  let $ = do_take_lines(ctx, cond, toList([]));
  let ctx$1;
  let lines;
  ctx$1 = $[0];
  lines = $[1];
  return [ctx$1, reverse(lines)];
}
function try_parse_fenced_code(ctx, fence_ch, rest, cont) {
  let $ = take_fence_run(rest, fence_ch);
  let fence_len;
  let rest$1;
  fence_len = $[0];
  rest$1 = $[1];
  return lazy_guard(fence_len < 3, cont, () => {
    return take_hspaces(rest$1, (rest2) => {
      return lazy_guard(fence_ch === "`" && contains_string(rest2, "`"), cont, () => {
        let _block;
        if (rest2 === "") {
          _block = new None;
        } else {
          _block = new Some(rest2);
        }
        let lang = _block;
        let nspaces = count_spaces(ctx.state.line, 0);
        let ctx$1 = advance_line2(ctx);
        let $1 = take_lines(ctx$1, (line) => {
          let dropped = drop_indent(line, nspaces);
          let text4 = drop_3_spaces(dropped);
          let $2 = take_fence_run(text4, fence_ch);
          let endlen_plus_1;
          let text$1;
          endlen_plus_1 = $2[0];
          text$1 = $2[1];
          return guard(endlen_plus_1 <= fence_len, new Some(dropped), () => {
            return guard(!is_blank(text$1), new Some(dropped), () => {
              return new None;
            });
          });
        });
        let ctx$2;
        let lines;
        ctx$2 = $1[0];
        lines = $1[1];
        let _block$1;
        if (lines instanceof Empty) {
          _block$1 = "";
        } else {
          _block$1 = join(lines, `
`) + `
`;
        }
        let body = _block$1;
        return advance_line_with_blocks(ctx$2, prepend(new Code(lang, body), ctx$2.doc.blocks));
      });
    });
  });
}
function do_take_lines_with_state(ctx, state, cond, acc) {
  return guard(at_eof(ctx.state), [ctx, acc], () => {
    let $ = cond(ctx.state.pos, state);
    let $1 = $[0];
    if ($1 instanceof Some) {
      let state$1 = $[1];
      let line = $1[0];
      let ctx$1 = new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
      return do_take_lines_with_state(ctx$1, state$1, cond, prepend(line, acc));
    } else {
      return [ctx, acc];
    }
  });
}
function take_lines_with_state(ctx, state, cond) {
  let $ = do_take_lines_with_state(ctx, state, cond, toList([]));
  let ctx$1;
  let lines;
  ctx$1 = $[0];
  lines = $[1];
  return [ctx$1, reverse(lines)];
}
function raw_line_minus_nest(ctx) {
  let $ = ctx.nest;
  if ($ instanceof Empty) {
    return ctx.state.line;
  } else {
    let indent = $.head.indent;
    return drop_indent(ctx.state.line, indent);
  }
}
function do_take_lines_until_inclusive(ctx, strict, end_cond, acc) {
  return lazy_guard(at_eof(ctx.state), () => {
    return [
      ctx,
      (() => {
        if (strict) {
          return toList([]);
        } else {
          return acc;
        }
      })()
    ];
  }, () => {
    let line = raw_line_minus_nest(ctx);
    let next = new Context(ctx.cache, advance_line(ctx.state), ctx.stack, ctx.doc, ctx.nest);
    let $ = end_cond(ctx.state);
    if ($) {
      return [next, prepend(line, acc)];
    } else {
      return do_take_lines_until_inclusive(next, strict, end_cond, prepend(line, acc));
    }
  });
}
function take_lines_until_inclusive(ctx, strict, end_cond) {
  let $ = do_take_lines_until_inclusive(ctx, strict, end_cond, toList([]));
  let ctx$1;
  let lines;
  ctx$1 = $[0];
  lines = $[1];
  return [ctx$1, reverse(lines)];
}
function html_block_condition(ctx, strict, start5, end, cont) {
  return lazy_guard(!start5(ctx.state), () => {
    return cont();
  }, () => {
    let $ = take_lines_until_inclusive(ctx, strict, end);
    let ctx$1;
    let lines;
    ctx$1 = $[0];
    lines = $[1];
    if (lines instanceof Empty) {
      return cont();
    } else {
      let html = join(lines, `
`) + `
`;
      return update_blocks(ctx$1, prepend(new HtmlBlock(html), ctx$1.doc.blocks));
    }
  });
}
function try_parse_html(ctx, cont) {
  return html_block_condition(ctx, true, (state) => {
    return starts_with(state.pos, "<!--");
  }, (state) => {
    return contains_string(state.pos, "-->");
  }, () => {
    return html_block_condition(ctx, true, (state) => {
      return starts_with(state.pos, "<!--");
    }, (state) => {
      return contains_string(state.pos, "-->");
    }, () => {
      return html_block_condition(ctx, true, (state) => {
        return starts_with(state.pos, "<?");
      }, (state) => {
        return contains_string(state.pos, "?>");
      }, () => {
        return html_block_condition(ctx, true, (state) => {
          return starts_with(state.pos, "<![CDATA[");
        }, (state) => {
          return contains_string(state.pos, "]]>");
        }, () => {
          return html_block_condition(ctx, true, (state) => {
            return check2(ctx.cache.html_3_start, state.pos);
          }, (state) => {
            return contains_string(state.pos, ">");
          }, () => {
            return html_block_condition(ctx, false, (state) => {
              let ok = check2(ctx.cache.html_1_start, state.pos);
              return ok;
            }, (state) => {
              return lazy_guard(at_eof(state), () => {
                return true;
              }, () => {
                let ok = check2(ctx.cache.html_1_end, state.pos);
                return ok;
              });
            }, () => {
              return html_block_condition(ctx, true, (state) => {
                return guard(check2(ctx.cache.html_2_start, state.pos), true, () => {
                  return guard(state.pos === "<!-->", true, () => {
                    return guard(state.pos === "<!--->", true, () => {
                      return guard(starts_with(state.pos, "<!--") && ends_with(state.pos, "-->"), true, () => {
                        return ctx.cache.is_a_html_tag(state.pos, true, true);
                      });
                    });
                  });
                });
              }, next_line_is_blank, () => {
                return cont();
              });
            });
          });
        });
      });
    });
  });
}
function next_line_if_blank2(ctx, in$) {
  let $ = is_blank(in$);
  if ($) {
    let ctx$1 = advance_line2(ctx);
    return [ctx$1, ctx$1.state.pos];
  } else {
    return [ctx, in$];
  }
}
function starts_title(in$) {
  return starts_with(in$, '"') || starts_with(in$, "'") || starts_with(in$, "(");
}
function set_link(doc, label2, dest, title2) {
  let _block;
  let _pipe = label2;
  _block = casefold(_pipe);
  let label$1 = _block;
  let links = upsert(doc.links, label$1, (current) => {
    if (current instanceof Some) {
      let v = current[0];
      return v;
    } else {
      return new LinkData(dest, title2);
    }
  });
  return new Document(doc.options, doc.blocks, links, doc.footnotes);
}
function set_footnote(doc, label2, blocks) {
  let _block;
  let _pipe = label2;
  _block = casefold(_pipe);
  let label$1 = _block;
  let num = size(doc.footnotes) + 1;
  let footnotes = upsert(doc.footnotes, label$1, (current) => {
    if (current instanceof Some) {
      let v = current[0];
      return v;
    } else {
      return new FootnoteData(num, blocks);
    }
  });
  return new Document(doc.options, doc.blocks, doc.links, footnotes);
}
function with_doc(ctx, doc) {
  return new Context(ctx.cache, ctx.state, ctx.stack, doc, ctx.nest);
}
function do_try_parse_link(ctx) {
  return next_nonspace(ctx.state, (state) => {
    return merge_until_unescaped_end_bracket(state, ctx.cache.sp_link_text, (state2) => {
      let $ = gobble_link_label(ctx.cache.sp_link_label, state2.pos);
      let label2;
      let pos;
      label2 = $[0];
      pos = $[1];
      return guard(label2 === "", new Error(undefined), () => {
        let state$1 = update_pos(state2, pos);
        return try_pop2(state$1, ":", () => {
          return new Error(undefined);
        }, (state3) => {
          return next_line_if_blank(state3, (state4) => {
            let ctx$1 = new Context(ctx.cache, state4, ctx.stack, ctx.doc, ctx.nest);
            let in$ = state4.pos;
            return parse_link_dest(in$, ctx$1.cache.sp_link_dest, ctx$1.cache.sp_link_dest_tag, (dest, in$2) => {
              let in$1 = gobble_hspace(in$2);
              let state$12 = update_pos(state4, in$1);
              let with_title = (ctx2, in$3) => {
                return parse_link_title(in$3, ctx2.cache.sp_link_title, (title2, in$4) => {
                  let $1 = is_blankn(in$4);
                  if ($1) {
                    let doc = set_link(ctx2.doc, label2, dest, title2);
                    let ctx$12 = new Context(ctx2.cache, new_state(in$4, ctx2.cache.sp_line), ctx2.stack, doc, ctx2.nest);
                    return new Ok(ctx$12);
                  } else {
                    return new Error(undefined);
                  }
                });
              };
              return lazy_guard(starts_title(in$1), () => {
                let $1 = with_title(ctx$1, in$1 + `
` + state$12.rest);
                if ($1 instanceof Ok) {
                  return $1;
                } else {
                  return new Error(undefined);
                }
              }, () => {
                let $1 = next_line_if_blank2(ctx$1, in$1);
                let ctx$2;
                let in$22;
                ctx$2 = $1[0];
                in$22 = $1[1];
                let state$2 = ctx$2.state;
                let in$3 = gobble_hspace(in$22);
                let $2 = starts_title(in$3);
                if ($2) {
                  let $3 = with_title(ctx$2, in$3 + `
` + state$2.rest);
                  if ($3 instanceof Ok) {
                    return $3;
                  } else {
                    return new Ok(with_doc(ctx$2, set_link(ctx$2.doc, label2, dest, new None)));
                  }
                } else {
                  return new Ok(with_doc(ctx$2, set_link(ctx$2.doc, label2, dest, new None)));
                }
              });
            });
          });
        });
      });
    });
  });
}
function try_parse_link(ctx, cont) {
  return lazy_unwrap(do_try_parse_link(ctx), cont);
}
function skip_blanks(loop$ctx) {
  while (true) {
    let ctx = loop$ctx;
    let $ = !at_eof(ctx.state) && is_blank(ctx.state.pos);
    if ($) {
      loop$ctx = advance_line2(ctx);
    } else {
      return ctx;
    }
  }
}
function nest_indent(ctx) {
  let $ = ctx.nest;
  if ($ instanceof Empty) {
    return 0;
  } else {
    let indent = $.head.indent;
    return indent;
  }
}
function list_item_line(ctx, line, indent, lazy) {
  let line_indent = find_indent(line);
  let nest = nest_indent(ctx);
  return lazy_guard(is_blank(line), () => {
    return new Some("");
  }, () => {
    return lazy_guard(!lazy && line_indent < nest + indent, () => {
      return new None;
    }, () => {
      return lazy_guard(line_indent < indent && is_empty_list(ctx.cache.sp_dot_paren, line), () => {
        return new None;
      }, () => {
        return lazy_guard(line_indent <= nest && is_list_item(ctx, line), () => {
          return new None;
        }, () => {
          return guard(lazy && ctx.cache.is_paragraph_continuation_text(line), new Some(line), () => {
            return lazy_guard(lazy && ctx.state.indent > 0 && !(setext_underline(ctx, line) instanceof SetextNot), () => {
              return new Some(line);
            }, () => {
              let $ = line_indent >= indent;
              if ($) {
                return new Some(line);
              } else {
                return new None;
              }
            });
          });
        });
      });
    });
  });
}
function try_parse_indented_code(ctx, cont) {
  let nest_indent$1 = nest_indent(ctx);
  return lazy_guard(ctx.state.indent - nest_indent$1 < 4, cont, () => {
    return do_indented(ctx, nest_indent$1, toList([]));
  });
}
function maybe_delim_row(loop$s, loop$npipes) {
  while (true) {
    let s = loop$s;
    let npipes = loop$npipes;
    let $ = gobble_hspace(s);
    if ($.startsWith("|")) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes + 1;
    } else if ($.startsWith("-")) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes;
    } else if ($.startsWith(":")) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes;
    } else if ($.startsWith(" ")) {
      let s$1 = $.slice(1);
      loop$s = s$1;
      loop$npipes = npipes;
    } else if ($ === "") {
      return npipes > 0;
    } else {
      return false;
    }
  }
}
function column_alignment(spec) {
  let spec$1 = trim(spec);
  let $ = from_string("^:?-+:?$");
  let re;
  if ($ instanceof Ok) {
    re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH4, "mork/internal/blocks", 1091, "column_alignment", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 30852,
      end: 30902,
      pattern_start: 30863,
      pattern_end: 30869
    });
  }
  let $1 = check2(re, spec$1);
  if ($1) {
    let l = starts_with(spec$1, ":");
    let r = ends_with(spec$1, ":");
    return new Ok((() => {
      if (r) {
        if (l === true) {
          return new Center;
        } else {
          return new Right;
        }
      } else {
        return new Left;
      }
    })());
  } else {
    return new Error(undefined);
  }
}
function do_delim_row(loop$pipe, loop$input, loop$count, loop$res) {
  while (true) {
    let pipe = loop$pipe;
    let input2 = loop$input;
    let count2 = loop$count;
    let res = loop$res;
    let input$1 = gobble_hspace(input2);
    let $ = split4(pipe, input$1);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    if (s === "\\|") {
      return new Error(undefined);
    } else if (s === "|") {
      let $1 = l === "";
      if ($1) {
        if (res instanceof Empty) {
          loop$pipe = pipe;
          loop$input = r;
          loop$count = count2;
          loop$res = res;
        } else {
          loop$pipe = pipe;
          loop$input = r;
          loop$count = count2 + 1;
          loop$res = prepend(new Left, res);
        }
      } else {
        let $2 = column_alignment(l);
        if ($2 instanceof Ok) {
          let align = $2[0];
          loop$pipe = pipe;
          loop$input = r;
          loop$count = count2 + 1;
          loop$res = prepend(align, res);
        } else {
          return $2;
        }
      }
    } else if (s === "") {
      let $1 = l === "";
      if ($1) {
        return new Ok([count2, res]);
      } else {
        let $2 = column_alignment(l);
        if ($2 instanceof Ok) {
          let align = $2[0];
          return new Ok([count2 + 1, prepend(align, res)]);
        } else {
          return $2;
        }
      }
    } else {
      throw makeError("panic", FILEPATH4, "mork/internal/blocks", 1085, "do_delim_row", "unreachable", {});
    }
  }
}
function parse_delim_row(pipe, s) {
  let _pipe = do_delim_row(pipe, s, 0, toList([]));
  return map4(_pipe, (v) => {
    return [
      v[0],
      (() => {
        let _pipe$1 = v[1];
        return reverse(_pipe$1);
      })()
    ];
  });
}
function do_pipe_split(loop$pipe, loop$input, loop$acc, loop$res) {
  while (true) {
    let pipe = loop$pipe;
    let input2 = loop$input;
    let acc = loop$acc;
    let res = loop$res;
    let $ = split4(pipe, input2);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    let body = acc + l;
    if (s === "|") {
      loop$pipe = pipe;
      loop$input = r;
      loop$acc = "";
      loop$res = prepend(body, res);
    } else if (s === "\\|") {
      loop$pipe = pipe;
      loop$input = r;
      loop$acc = body + "|";
      loop$res = res;
    } else if (s === "") {
      return prepend(body, res);
    } else {
      throw makeError("panic", FILEPATH4, "mork/internal/blocks", 1144, "do_pipe_split", "unreachable", {});
    }
  }
}
function pipe_split(pipe, input2) {
  let input$1 = trim(input2);
  let _block;
  let $ = starts_with(input$1, "|") && ends_with(input$1, "|");
  if ($) {
    _block = slice(input$1, 1, string_length(input$1) - 2);
  } else {
    _block = input$1;
  }
  let input$2 = _block;
  let _pipe = do_pipe_split(pipe, input$2, "", toList([]));
  return reverse(_pipe);
}
function parse_header_row(pipe, header, num_cols, aligns) {
  let cols = pipe_split(pipe, header);
  let true_len = length(cols);
  let $ = true_len === length(aligns) && true_len === num_cols;
  if ($) {
    return new Ok(map2(zip(cols, aligns), (data2) => {
      let raw;
      let align;
      raw = data2[0];
      align = data2[1];
      return new THead(align, raw, toList([]));
    }));
  } else {
    return new Error(undefined);
  }
}
function parse_table_row(ctx, num_cols, row) {
  let _block;
  let _pipe = pipe_split(ctx.cache.sp_pipe, row);
  _block = map2(_pipe, (_capture) => {
    return new Cell(_capture, toList([]));
  });
  let cols = _block;
  let $ = num_cols === length(cols);
  if ($) {
    return new Some(cols);
  } else {
    return new None;
  }
}
function try_parse_table(ctx, abort) {
  return lazy_guard(!ctx.doc.options.tables, abort, () => {
    let pipe = ctx.cache.sp_pipe;
    let delim_row = next_line(ctx.state);
    let $ = maybe_delim_row(delim_row, 0);
    if ($) {
      let $1 = parse_delim_row(pipe, delim_row);
      if ($1 instanceof Ok) {
        let num_cols = $1[0][0];
        let aligns = $1[0][1];
        let $2 = parse_header_row(pipe, ctx.state.pos, num_cols, aligns);
        if ($2 instanceof Ok) {
          let header = $2[0];
          let _block;
          let _pipe = ctx;
          let _pipe$1 = advance_line2(_pipe);
          _block = advance_line2(_pipe$1);
          let ctx$1 = _block;
          let $3 = take_lines(ctx$1, (_capture) => {
            return parse_table_row(ctx$1, num_cols, _capture);
          });
          let ctx$2;
          let rows;
          ctx$2 = $3[0];
          rows = $3[1];
          return update_blocks(ctx$2, prepend(new Table(header, rows), ctx$2.doc.blocks));
        } else {
          return abort();
        }
      } else {
        return abort();
      }
    } else {
      return abort();
    }
  });
}
function take_first_paragraph_line(ctx, cont, when_ok) {
  let line = ctx.state.pos;
  let $ = is_blank(line);
  if ($) {
    return cont();
  } else {
    return when_ok(advance_line2(ctx), line);
  }
}
function try_parse_paragraph(ctx, cont) {
  return take_first_paragraph_line(ctx, cont, (ctx2, line) => {
    let nest = nest_indent(ctx2);
    let $ = take_lines(ctx2, (line2) => {
      let undented = drop_indent(line2, nest);
      let line_indent = find_indent(line2);
      let $1 = !(is_blockquote_line(undented) || !(setext_underline(ctx2, undented) instanceof SetextNot) && (isEqual(ctx2.nest, toList([])) || ctx2.state.indent > 0)) && (is_empty_list(ctx2.cache.sp_dot_paren, line2) || nest > line_indent && line_indent > 3 || ctx2.cache.is_paragraph_continuation_text(undented));
      if ($1) {
        return new Some(undented);
      } else {
        return new None;
      }
    });
    let ctx$1;
    let lines;
    ctx$1 = $[0];
    lines = $[1];
    let lines$1 = prepend(line, lines);
    return lazy_guard(isEqual(lines$1, toList([])), cont, () => {
      let raw = join(lines$1, `
`);
      return lazy_guard(!isEqual(ctx$1.nest, toList([])) && ctx$1.state.indent === 0, () => {
        return update_blocks(ctx$1, prepend(new Paragraph(raw, toList([])), ctx$1.doc.blocks));
      }, () => {
        let $1 = setext_underline(ctx$1, ctx$1.state.pos);
        if ($1 instanceof SetextH1) {
          return advance_line_with_blocks(ctx$1, prepend(new Heading(1, "", raw, toList([])), ctx$1.doc.blocks));
        } else if ($1 instanceof SetextH2) {
          return advance_line_with_blocks(ctx$1, prepend(new Heading(2, "", raw, toList([])), ctx$1.doc.blocks));
        } else {
          return update_blocks(ctx$1, prepend(new Paragraph(raw, toList([])), ctx$1.doc.blocks));
        }
      });
    });
  });
}
function block_fallback(ctx) {
  return try_parse_table(ctx, () => {
    return try_parse_paragraph(ctx, () => {
      return try_parse_blank(ctx, () => {
        throw makeError("panic", FILEPATH4, "mork/internal/blocks", 63, "block_fallback", "try_parse_block could not parse: " + inspect2(ctx), {});
      });
    });
  });
}
function take_footnote_paragraphs(loop$ctx) {
  while (true) {
    let ctx = loop$ctx;
    let _block;
    let _pipe = try_parse_paragraph(ctx, () => {
      return ctx;
    });
    _block = skip_blanks(_pipe);
    let next = _block;
    let $ = next.state.indent >= 4 && !isEqual(next.doc.blocks, ctx.doc.blocks);
    if ($) {
      let state = update_pos(next.state, drop_indent(next.state.pos, 4));
      let next$1 = new Context(next.cache, state, next.stack, next.doc, next.nest);
      loop$ctx = next$1;
    } else {
      return next;
    }
  }
}
function do_try_parse_footnote(ctx) {
  return next_nonspace(ctx.state, (state) => {
    return try_pop2(state, "^", () => {
      return new Error(undefined);
    }, (state2) => {
      return merge_until_unescaped_end_bracket(state2, ctx.cache.sp_link_text, (state3) => {
        let $ = gobble_link_label(ctx.cache.sp_link_label, state3.pos);
        let label2;
        let pos;
        label2 = $[0];
        pos = $[1];
        return guard(label2 === "", new Error(undefined), () => {
          let state$1 = update_pos(state3, pos);
          return try_pop2(state$1, ":", () => {
            return new Error(undefined);
          }, (state4) => {
            return next_line_if_blank(state4, (state5) => {
              let footnote_ctx = new Context(ctx.cache, state5, ctx.stack, (() => {
                let _record = ctx.doc;
                return new Document(_record.options, toList([]), _record.links, _record.footnotes);
              })(), prepend(new NestItem(4), ctx.nest));
              let footnote_ctx$1 = take_footnote_paragraphs(footnote_ctx);
              let doc = set_footnote(ctx.doc, label2, footnote_ctx$1.doc.blocks);
              let ctx$1 = new Context(ctx.cache, footnote_ctx$1.state, ctx.stack, doc, ctx.nest);
              return new Ok(ctx$1);
            });
          });
        });
      });
    });
  });
}
function try_parse_footnote(ctx, cont) {
  let $ = ctx.doc.options.footnotes;
  if ($) {
    let _pipe = ctx;
    let _pipe$1 = do_try_parse_footnote(_pipe);
    return lazy_unwrap(_pipe$1, cont);
  } else {
    return cont();
  }
}
function collect_list_item(ctx, marker, require_indent) {
  let $ = list_item_line_start(ctx, marker, require_indent);
  let item;
  let indent;
  item = $[0];
  indent = $[1];
  let empty4 = isEqual(item, new Some(""));
  if (item instanceof Some) {
    let first_line = item[0];
    let ctx$1 = advance_line2(ctx);
    let _block;
    if (empty4) {
      _block = take_lines(ctx$1, (line) => {
        let $22 = list_item_line(ctx$1, line, indent, false);
        if ($22 instanceof Some) {
          let $32 = $22[0];
          if ($32 === "") {
            return new None;
          } else {
            return $22;
          }
        } else {
          return $22;
        }
      });
    } else {
      _block = take_lines_with_state(ctx$1, true, (line, lazy) => {
        let $22 = list_item_line(ctx$1, line, indent, lazy);
        if ($22 instanceof Some) {
          let $32 = $22[0];
          if ($32 === "") {
            return check3(empty4, [new None, lazy], [new Some(""), false]);
          } else {
            let text4 = $32;
            return [new Some(text4), lazy];
          }
        } else {
          return [new None, lazy];
        }
      });
    }
    let $1 = _block;
    let ctx$2;
    let lines;
    ctx$2 = $1[0];
    lines = $1[1];
    let _block$1;
    let $3 = empty4 && is_blank(ctx$2.state.pos);
    if ($3) {
      _block$1 = [advance_line2(ctx$2), true];
    } else {
      _block$1 = [ctx$2, false];
    }
    let $2 = _block$1;
    let ctx$3;
    let ends_with_blank;
    ctx$3 = $2[0];
    ends_with_blank = $2[1];
    let _block$2;
    if (first_line === "") {
      _block$2 = lines;
    } else {
      _block$2 = prepend(first_line, lines);
    }
    let lines$1 = _block$2;
    let inner_text = join(lines$1, `
`) + `
`;
    let _block$3;
    let _pipe = with_state_reset_blocks(ctx$3, inner_text);
    let _pipe$1 = set_nest_listitem(_pipe, indent);
    _block$3 = parse_blocks(_pipe$1);
    let inner_ctx = _block$3;
    let ends_with_blank$1 = ends_with_blank || item_ends_with_blank(lines$1);
    let blocks = inner_ctx.doc.blocks;
    return [
      merge3(ctx$3, inner_ctx, ctx$3.doc.blocks),
      indent,
      new Some(new ListItem(blocks, ends_with_blank$1, item_contains_blank(blocks)))
    ];
  } else {
    return [ctx, indent, new None];
  }
}
function parse_blocks(ctx) {
  let ctx$1 = do_parse_blocks(ctx);
  return update_blocks(ctx$1, (() => {
    let _pipe = ctx$1.doc.blocks;
    return reverse(_pipe);
  })());
}
function do_parse_blocks(loop$ctx) {
  while (true) {
    let ctx = loop$ctx;
    let $ = (() => {
      let _pipe = ctx.state;
      return at_eof(_pipe);
    })();
    if ($) {
      return ctx;
    } else {
      let $1 = ctx.nest;
      if ($1 instanceof Empty) {
        let _pipe = ctx;
        let _pipe$1 = try_parse_block(_pipe);
        loop$ctx = _pipe$1;
      } else {
        let indent = $1.head.indent;
        let $2 = is_blank(ctx.state.pos);
        if ($2) {
          let _pipe = advance_pos(ctx, "");
          let _pipe$1 = try_parse_block(_pipe);
          loop$ctx = _pipe$1;
        } else {
          let got_indent = find_indent(ctx.state.pos);
          if (got_indent < indent) {
            return ctx;
          } else {
            let _pipe = advance_pos(ctx, drop_indent(ctx.state.pos, indent));
            let _pipe$1 = try_parse_block(_pipe);
            loop$ctx = _pipe$1;
          }
        }
      }
    }
  }
}
function try_parse_block(ctx) {
  let $ = ctx.state.pos;
  if ($.startsWith("    ")) {
    return try_parse_indented_code(ctx, () => {
      return block_fallback(ctx);
    });
  } else if ($.startsWith("   ")) {
    let rest = $.slice(3);
    if (rest.startsWith("#")) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("`")) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("~")) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith(">")) {
      return try_parse_blockquote(ctx);
    } else if (rest.startsWith("<")) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("[")) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("*")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("-")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("_")) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("+")) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("\t")) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("0")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("1")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("2")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("3")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("4")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("5")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("6")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("7")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("8")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("9")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  } else if ($.startsWith("  ")) {
    let rest = $.slice(2);
    if (rest.startsWith("#")) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("`")) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("~")) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith(">")) {
      return try_parse_blockquote(ctx);
    } else if (rest.startsWith("<")) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("[")) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("*")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("-")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("_")) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("+")) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("\t")) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("0")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("1")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("2")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("3")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("4")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("5")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("6")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("7")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("8")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("9")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  } else if ($.startsWith(" ")) {
    let rest = $.slice(1);
    if (rest.startsWith("#")) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("`")) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("~")) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith(">")) {
      return try_parse_blockquote(ctx);
    } else if (rest.startsWith("<")) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("[")) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("*")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("-")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("_")) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("+")) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("\t")) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("0")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("1")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("2")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("3")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("4")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("5")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("6")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("7")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("8")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("9")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  } else {
    let rest = $;
    if (rest.startsWith("#")) {
      let tail = rest.slice(1);
      return try_parse_atx_heading(ctx, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("`")) {
      let fence = "`";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("~")) {
      let fence = "~";
      let tail = rest.slice(1);
      return try_parse_fenced_code(ctx, fence, tail, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith(">")) {
      return try_parse_blockquote(ctx);
    } else if (rest.startsWith("<")) {
      return try_parse_html(advance_pos(ctx, rest), () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("[")) {
      let post_bracket = rest.slice(1);
      let link_ctx = advance_pos(ctx, post_bracket);
      return try_parse_footnote(link_ctx, () => {
        return try_parse_link(link_ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("*")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("-")) {
      return try_parse_thematic_break(ctx, () => {
        return try_parse_bullet_list(ctx, () => {
          return block_fallback(ctx);
        });
      });
    } else if (rest.startsWith("_")) {
      return try_parse_thematic_break(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("+")) {
      return try_parse_bullet_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("\t")) {
      return try_parse_indented_code(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("0")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("1")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("2")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("3")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("4")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("5")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("6")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("7")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("8")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else if (rest.startsWith("9")) {
      return try_parse_ordered_list(ctx, () => {
        return block_fallback(ctx);
      });
    } else {
      return block_fallback(ctx);
    }
  }
}
function try_parse_ordered_list(ctx, cont) {
  return try_or(parse_ordinal_item(ctx.cache.sp_dot_paren, ctx.state.pos), cont, (_use0) => {
    let marker;
    let indent;
    let ordinal;
    marker = _use0[0];
    indent = _use0[1];
    ordinal = _use0[2];
    let ordinal$1 = check3(ordinal !== 1, new Some(ordinal), new None);
    let $ = collect_list_items(ctx, marker, indent);
    let ctx$1;
    let items;
    ctx$1 = $[0];
    items = $[1];
    let pack = calculate_list_pack(items);
    return update_blocks(ctx$1, prepend(new OrderedList(pack, items, ordinal$1), ctx$1.doc.blocks));
  });
}
function collect_list_items(ctx, marker, indent) {
  let $ = do_collect_list_items(ctx, marker, indent, toList([]));
  let ctx$1;
  let items;
  ctx$1 = $[0];
  items = $[1];
  return [
    ctx$1,
    (() => {
      let _pipe = items;
      return reverse(_pipe);
    })()
  ];
}
function do_collect_list_items(loop$ctx, loop$marker, loop$indent, loop$items) {
  while (true) {
    let ctx = loop$ctx;
    let marker = loop$marker;
    let indent = loop$indent;
    let items = loop$items;
    let $ = collect_list_item(ctx, marker, indent);
    let ctx$1;
    let new_indent;
    let item;
    ctx$1 = $[0];
    new_indent = $[1];
    item = $[2];
    if (item instanceof Some) {
      let item$1 = item[0];
      loop$ctx = ctx$1;
      loop$marker = marker;
      loop$indent = new_indent;
      loop$items = prepend(item$1, items);
    } else {
      return [ctx$1, items];
    }
  }
}
function try_parse_bullet_list(ctx, cont) {
  return try_or(parse_bullet_item(ctx.state.pos), cont, (_use0) => {
    let marker;
    let indent;
    marker = _use0[0];
    indent = _use0[1];
    let $ = collect_list_items(ctx, marker, indent);
    let ctx$1;
    let items;
    ctx$1 = $[0];
    items = $[1];
    let pack = calculate_list_pack(items);
    return update_blocks(ctx$1, prepend(new BulletList(pack, items), ctx$1.doc.blocks));
  });
}
function try_parse_blockquote(ctx) {
  let $ = take_lines_with_state(ctx, "", (line, state) => {
    return guard(is_blockquote_line(line), [new Some(line), line], () => {
      let prev = drop_all_blockquote_markers(state);
      return guard(line_is_codeblock(prev), [new None, line], () => {
        return guard(is_blank(prev), [new None, line], () => {
          return guard(ctx.cache.is_paragraph_continuation_text(line), [new Some(line), line], () => {
            return [new None, line];
          });
        });
      });
    });
  });
  let ctx$1;
  let lines;
  ctx$1 = $[0];
  lines = $[1];
  let inner_text = join(map2(lines, drop_blockquote_marker), `
`) + `
`;
  let _block;
  let _pipe = with_state_reset_blocks(ctx$1, inner_text);
  let _pipe$1 = set_nest_blockquote(_pipe);
  _block = parse_blocks(_pipe$1);
  let inner_ctx = _block;
  return merge3(ctx$1, inner_ctx, prepend(new BlockQuote(inner_ctx.doc.blocks), ctx$1.doc.blocks));
}

// build/dev/javascript/mork/mork/internal/inlines.mjs
var FILEPATH5 = "src/mork/internal/inlines.gleam";

class InlineState extends CustomType {
  constructor(ctx, inlines) {
    super();
    this.ctx = ctx;
    this.inlines = inlines;
  }
}
function try_parse_checkbox(raw) {
  let raw$1 = gobble_hspace(raw);
  return try_pop("[", raw$1, (raw2) => {
    if (raw2.startsWith(" ]")) {
      let rest = raw2.slice(2);
      return new Ok([new Checkbox(false), rest]);
    } else if (raw2.startsWith("x]")) {
      let rest = raw2.slice(2);
      return new Ok([new Checkbox(true), rest]);
    } else {
      return new Error(undefined);
    }
  });
}
function push_text(text4, inlines) {
  if (text4 === "") {
    return inlines;
  } else {
    return prepend((() => {
      let _pipe = text4;
      return new Text2(_pipe);
    })(), inlines);
  }
}
function make_break(acc, inlines) {
  let nspaces = count_spaces(reverse3(acc), 0);
  let $ = nspaces >= 2;
  if ($) {
    return prepend(new HardBreak, push_text(drop_end(acc, nspaces), inlines));
  } else {
    return prepend(new SoftBreak, push_text(trim_end(acc), inlines));
  }
}
function do_last_char_of(inline) {
  if (inline instanceof Autolink) {
    return ">";
  } else if (inline instanceof CodeSpan) {
    return "`";
  } else if (inline instanceof EmailAutolink) {
    return ">";
  } else if (inline instanceof Emphasis) {
    return "*";
  } else if (inline instanceof Footnote) {
    return "]";
  } else if (inline instanceof FullImage) {
    return "]";
  } else if (inline instanceof FullLink) {
    return "]";
  } else if (inline instanceof HardBreak) {
    return `
`;
  } else if (inline instanceof Highlight) {
    return "=";
  } else if (inline instanceof InlineFootnote) {
    return "]";
  } else if (inline instanceof InlineHtml) {
    return ">";
  } else if (inline instanceof RawHtml) {
    let text4 = inline[0];
    return text4;
  } else if (inline instanceof RefImage) {
    return "]";
  } else if (inline instanceof RefLink) {
    return "]";
  } else if (inline instanceof SoftBreak) {
    return `
`;
  } else if (inline instanceof Strikethrough) {
    return "~";
  } else if (inline instanceof Strong) {
    return "*";
  } else if (inline instanceof Text2) {
    let text4 = inline[0];
    return text4;
  } else if (inline instanceof Checkbox) {
    return "]";
  } else {
    let style2 = inline.style;
    return style2;
  }
}
function last_char_of(inlines) {
  if (inlines instanceof Empty) {
    return "";
  } else {
    let inline = inlines.head;
    return do_last_char_of(inline);
  }
}
function take_while(haystack, needle) {
  return do_take_while(haystack, needle, "");
}
function contains_a_link(inlines) {
  if (inlines instanceof Empty) {
    return false;
  } else {
    let inline = inlines.head;
    let rest = inlines.tail;
    return (() => {
      if (inline instanceof Emphasis) {
        let inlines$1 = inline[0];
        return contains_a_link(inlines$1);
      } else if (inline instanceof FullImage) {
        let text4 = inline.text;
        return contains_a_link(text4);
      } else if (inline instanceof FullLink) {
        return true;
      } else if (inline instanceof RefImage) {
        let text4 = inline.text;
        return contains_a_link(text4);
      } else if (inline instanceof RefLink) {
        return true;
      } else if (inline instanceof Strong) {
        let inlines$1 = inline[0];
        return contains_a_link(inlines$1);
      } else {
        return false;
      }
    })() || contains_a_link(rest);
  }
}
function parse_link_paren(ctx, in$) {
  let in$1 = gobble_hspace(in$);
  return parse_link_dest(in$1, ctx.cache.sp_link_dest, ctx.cache.sp_link_dest_tag, (dest, in$2) => {
    let in$12 = gobble_hspace(in$2);
    if (in$12.startsWith(")")) {
      let rest = in$12.slice(1);
      return new Ok([new LinkData(dest, new None), rest]);
    } else {
      return parse_link_title(in$12, ctx.cache.sp_link_title, (title2, in$3) => {
        let in$13 = gobble_hspace(in$3);
        if (in$13.startsWith(")")) {
          let rest = in$13.slice(1);
          return new Ok([new LinkData(dest, title2), rest]);
        } else {
          return new Error(undefined);
        }
      });
    }
  });
}
function do_split_at_tag(loop$sp, loop$rest, loop$acc, loop$stack) {
  while (true) {
    let sp = loop$sp;
    let rest = loop$rest;
    let acc = loop$acc;
    let stack = loop$stack;
    let $ = split4(sp, rest);
    let l;
    let s;
    let r;
    l = $[0];
    s = $[1];
    r = $[2];
    if (s === "") {
      return [acc + rest, "", ""];
    } else if (s === ">") {
      if (stack instanceof Empty) {
        return [acc + l, ">", r];
      } else {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + ">";
        loop$stack = stack;
      }
    } else if (s === '"') {
      if (stack instanceof Empty) {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + '"';
        loop$stack = prepend('"', stack);
      } else {
        let $1 = stack.head;
        if ($1 === '"') {
          let stack$1 = stack.tail;
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + '"';
          loop$stack = stack$1;
        } else if ($1 === "'") {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + '"';
          loop$stack = stack;
        } else {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + '"';
          loop$stack = prepend('"', stack);
        }
      }
    } else if (s === "'") {
      if (stack instanceof Empty) {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + "'";
        loop$stack = prepend("'", stack);
      } else {
        let $1 = stack.head;
        if ($1 === "'") {
          let stack$1 = stack.tail;
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "'";
          loop$stack = stack$1;
        } else if ($1 === '"') {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "'";
          loop$stack = stack;
        } else {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "'";
          loop$stack = prepend("'", stack);
        }
      }
    } else if (s === "\\") {
      let $1 = pop_grapheme(r);
      if ($1 instanceof Ok) {
        let ch = $1[0][0];
        let tail = $1[0][1];
        if (ch === '"') {
          loop$sp = sp;
          loop$rest = tail;
          loop$acc = acc + l + ch;
          loop$stack = stack;
        } else if (ch === "'") {
          loop$sp = sp;
          loop$rest = tail;
          loop$acc = acc + l + ch;
          loop$stack = stack;
        } else {
          loop$sp = sp;
          loop$rest = r;
          loop$acc = acc + l + "\\";
          loop$stack = stack;
        }
      } else {
        loop$sp = sp;
        loop$rest = r;
        loop$acc = acc + l + "\\";
        loop$stack = stack;
      }
    } else {
      throw makeError("panic", FILEPATH5, "mork/internal/inlines", 767, "do_split_at_tag", "unreachable", {});
    }
  }
}
function split_at_tag(ctx, s) {
  return do_split_at_tag(ctx.cache.sp_tag, s, "", toList([]));
}
function is_matched(loop$s, loop$lp, loop$rp) {
  while (true) {
    let s = loop$s;
    let lp = loop$lp;
    let rp = loop$rp;
    if (s.startsWith("(")) {
      let s$1 = s.slice(1);
      loop$s = s$1;
      loop$lp = lp + 1;
      loop$rp = rp;
    } else if (s.startsWith(")")) {
      let s$1 = s.slice(1);
      loop$s = s$1;
      loop$lp = lp;
      loop$rp = rp + 1;
    } else {
      let $ = pop_grapheme(s);
      if ($ instanceof Ok) {
        let s$1 = $[0][1];
        loop$s = s$1;
        loop$lp = lp;
        loop$rp = rp;
      } else {
        return lp === rp;
      }
    }
  }
}
function backtrack_autolink(loop$s, loop$acc) {
  while (true) {
    let s = loop$s;
    let acc = loop$acc;
    if (s.startsWith(")")) {
      let p2 = ")";
      let rest = s.slice(1);
      let $ = is_matched(rest, 0, 1);
      if ($) {
        return [acc, s];
      } else {
        loop$s = rest;
        loop$acc = acc + p2;
      }
    } else if (s.startsWith(";")) {
      let p2 = ";";
      let rest = s.slice(1);
      let $ = from_string("^[A-Za-z0-9]+&");
      let re;
      if ($ instanceof Ok) {
        re = $[0];
      } else {
        throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 838, "backtrack_autolink", "Pattern match failed, no pattern matched the value.", {
          value: $,
          start: 24286,
          end: 24342,
          pattern_start: 24297,
          pattern_end: 24303
        });
      }
      let $1 = check2(re, rest);
      if ($1) {
        let $2 = split_once(rest, "&");
        if ($2 instanceof Ok) {
          let escape3 = $2[0][0];
          let rest$1 = $2[0][1];
          return [acc + p2 + escape3 + "&", rest$1];
        } else {
          return [acc, rest];
        }
      } else {
        loop$s = rest;
        loop$acc = acc + p2;
      }
    } else if (s.startsWith(".")) {
      let p2 = ".";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith(",")) {
      let p2 = ",";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith("!")) {
      let p2 = "!";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith("?")) {
      let p2 = "?";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith(":")) {
      let p2 = ":";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith("*")) {
      let p2 = "*";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith("_")) {
      let p2 = "_";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else if (s.startsWith("~")) {
      let p2 = "~";
      let rest = s.slice(1);
      loop$s = rest;
      loop$acc = acc + p2;
    } else {
      return [acc, s];
    }
  }
}
function parse_autolink_tail(_, rest) {
  let $ = from_string("^[A-Za-z0-9_-]+\\.[A-Za-z0-9.-]+");
  let re;
  if ($ instanceof Ok) {
    re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 812, "parse_autolink_tail", "Pattern match failed, no pattern matched the value.", {
      value: $,
      start: 23495,
      end: 23569,
      pattern_start: 23506,
      pattern_end: 23512
    });
  }
  let $1 = check2(re, rest);
  if ($1) {
    let sp = new$6(toList([" ", `\r
`, `
`, "\t", "<"]));
    let $2 = split4(sp, rest);
    let l;
    let s;
    let r;
    l = $2[0];
    s = $2[1];
    r = $2[2];
    let reversed = reverse3(l);
    let $3 = backtrack_autolink(reversed, "");
    let post2;
    let body;
    post2 = $3[0];
    body = $3[1];
    let body$1 = reverse3(body);
    let post$1 = reverse3(post2);
    return [body$1, post$1 + s + r];
  } else {
    return ["", rest];
  }
}
function normalize_span(s) {
  let s$1 = replace(s, `
`, " ");
  let $ = starts_with(s$1, " ") && ends_with(s$1, " ") && !is_blank(s$1);
  if ($) {
    let _pipe = s$1;
    let _pipe$1 = drop_start(_pipe, 1);
    return drop_end(_pipe$1, 1);
  } else {
    return s$1;
  }
}
function make_codespan(body) {
  let _pipe = body;
  let _pipe$1 = normalize_span(_pipe);
  return new CodeSpan(_pipe$1);
}
function do_item_blocks(ctx, blocks) {
  let $ = ctx.doc.options.tasklists;
  if ($) {
    if (blocks instanceof Empty) {
      return map2(blocks, (_capture) => {
        return parse_block_inlines(ctx, _capture);
      });
    } else {
      let $1 = blocks.head;
      if ($1 instanceof Paragraph) {
        let blocks$1 = blocks.tail;
        let raw = $1.raw;
        let first3 = new Paragraph("", do_checkbox_inlines(ctx, raw));
        let rest = map2(blocks$1, (_capture) => {
          return parse_block_inlines(ctx, _capture);
        });
        return prepend2(rest, first3);
      } else {
        return map2(blocks, (_capture) => {
          return parse_block_inlines(ctx, _capture);
        });
      }
    }
  } else {
    return map2(blocks, (_capture) => {
      return parse_block_inlines(ctx, _capture);
    });
  }
}
function parse_block_inlines(ctx, block) {
  if (block instanceof BlockQuote) {
    let blocks = block.blocks;
    return new BlockQuote(map2(blocks, (_capture) => {
      return parse_block_inlines(ctx, _capture);
    }));
  } else if (block instanceof BulletList) {
    let pack = block.pack;
    let items = block.items;
    return new BulletList(pack, map2(items, (item) => {
      return new ListItem(do_item_blocks(ctx, item.blocks), item.ends_with_blank, item.contains_blank);
    }));
  } else if (block instanceof Heading) {
    let level = block.level;
    let id2 = block.id;
    let raw = block.raw;
    return new Heading(level, id2, "", do_inlines(ctx, raw));
  } else if (block instanceof OrderedList) {
    let pack = block.pack;
    let items = block.items;
    let start5 = block.start;
    return new OrderedList(pack, map2(items, (item) => {
      return new ListItem(do_item_blocks(ctx, item.blocks), item.ends_with_blank, item.contains_blank);
    }), start5);
  } else if (block instanceof Paragraph) {
    let raw = block.raw;
    return new Paragraph("", do_inlines(ctx, raw));
  } else if (block instanceof Table) {
    let header = block.header;
    let rows = block.rows;
    return new Table(map2(header, (head) => {
      return new THead(head.align, "", do_inlines(ctx, head.raw));
    }), map2(rows, (_capture) => {
      return map2(_capture, (cell) => {
        return new Cell("", do_inlines(ctx, cell.raw));
      });
    }));
  } else {
    return block;
  }
}
function parse_footnote_blocks(ctx, data2) {
  return new FootnoteData(data2.num, map2(data2.blocks, (_capture) => {
    return parse_block_inlines(ctx, _capture);
  }));
}
function process_inlines(ctx) {
  let blocks = map2(ctx.doc.blocks, (_capture) => {
    return parse_block_inlines(ctx, _capture);
  });
  let _block;
  let $ = ctx.doc.options.footnotes;
  if ($) {
    _block = map(ctx.doc.footnotes, (_, v) => {
      return parse_footnote_blocks(ctx, v);
    });
  } else {
    _block = ctx.doc.footnotes;
  }
  let footnotes = _block;
  let _record = ctx.doc;
  return new Document(_record.options, blocks, _record.links, footnotes);
}
function handle_und_emoji(acc, und, r, ctx, inlines) {
  let sp = new$6(toList([":"]));
  let rhead = split_after(sp, reverse3(acc));
  let head = reverse3(rhead[0]);
  let $ = split_after(sp, r);
  let butt;
  let r2;
  butt = $[0];
  r2 = $[1];
  let $1 = from_string("^:[A-Za-z_]{1,24}:$");
  let re;
  if ($1 instanceof Ok) {
    re = $1[0];
  } else {
    throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 213, "handle_und_emoji", "Pattern match failed, no pattern matched the value.", {
      value: $1,
      start: 7073,
      end: 7134,
      pattern_start: 7084,
      pattern_end: 7090
    });
  }
  let $2 = check2(re, head + und + butt);
  if ($2) {
    return do_parse_inlines(with_state(ctx, r2), acc + und + butt, inlines);
  } else {
    let $3 = take_unds_run(r, 1);
    let run2;
    let rest;
    run2 = $3[0];
    rest = $3[1];
    return parse_delim(with_state(ctx, rest), "_", run2, acc, inlines);
  }
}
function parse_delim(ctx, style2, len, acc, inlines) {
  let _block;
  let $ = acc !== "";
  if ($) {
    _block = acc;
  } else {
    _block = last_char_of(inlines);
  }
  let before = _block;
  let rest = ctx.state.start;
  let before_is_ws = ctx.cache.ends_with_ws(before);
  let before_is_p = ctx.cache.ends_with_p(before);
  let after_is_ws = ctx.cache.starts_with_ws(rest);
  let after_is_p = ctx.cache.starts_with_p(rest);
  let left_flanking = !after_is_ws && (!after_is_p || before_is_ws || before_is_p);
  let right_flanking = !before_is_ws && (!before_is_p || after_is_ws || after_is_p);
  let _block$1;
  if (style2 === "_") {
    _block$1 = [
      left_flanking && (!right_flanking || before_is_p),
      right_flanking && (!left_flanking || after_is_p)
    ];
  } else {
    _block$1 = [left_flanking, right_flanking];
  }
  let $1 = _block$1;
  let can_open;
  let can_close;
  can_open = $1[0];
  can_close = $1[1];
  let inlines$1 = push_text(acc, inlines);
  return do_parse_inlines(ctx, "", prepend(new Delim(style2, len, can_open, can_close), inlines$1));
}
function do_parse_inlines(loop$ctx, loop$acc, loop$inlines) {
  while (true) {
    let ctx = loop$ctx;
    let acc = loop$acc;
    let inlines = loop$inlines;
    let $ = split4(ctx.cache.sp_inline, ctx.state.start);
    let l;
    let sep;
    let r;
    l = $[0];
    sep = $[1];
    r = $[2];
    let acc$1 = acc + l;
    if (sep === "") {
      return new InlineState(ctx, push_text(acc$1, inlines));
    } else if (sep === ">") {
      let ch = sep;
      loop$ctx = with_state(ctx, r);
      loop$acc = acc$1 + ch;
      loop$inlines = inlines;
    } else if (sep === "&") {
      let ch = sep;
      loop$ctx = with_state(ctx, r);
      loop$acc = acc$1 + ch;
      loop$inlines = inlines;
    } else if (sep === '"') {
      let ch = sep;
      loop$ctx = with_state(ctx, r);
      loop$acc = acc$1 + ch;
      loop$inlines = inlines;
    } else if (sep === "\\") {
      return do_inline_escape(with_state(ctx, r), acc$1, inlines);
    } else if (sep === "<") {
      return do_parse_inline_html(with_state(ctx, r), acc$1, inlines);
    } else if (sep === "![") {
      return do_parse_image(with_state(ctx, r), acc$1, inlines);
    } else if (sep === "[^") {
      return do_parse_footnote(with_state(ctx, r), acc$1, inlines);
    } else if (sep === "[") {
      return do_parse_linkref(with_state(ctx, r), acc$1, inlines);
    } else if (sep === "`") {
      let $1 = take_quot_run(r, 1);
      let run2;
      let rest;
      run2 = $1[0];
      rest = $1[1];
      return do_parse_codespan(with_state(ctx, rest), run2, acc$1, inlines);
    } else if (sep === "*") {
      let $1 = take_star_run(r, 1);
      let run2;
      let rest;
      run2 = $1[0];
      rest = $1[1];
      return parse_delim(with_state(ctx, rest), "*", run2, acc$1, inlines);
    } else if (sep === "_") {
      let $1 = ctx.doc.options.emojis && contains_string(acc$1, ":");
      if ($1) {
        return handle_und_emoji(acc$1, "_", r, ctx, inlines);
      } else {
        let $2 = take_unds_run(r, 1);
        let run2;
        let rest;
        run2 = $2[0];
        rest = $2[1];
        return parse_delim(with_state(ctx, rest), "_", run2, acc$1, inlines);
      }
    } else if (sep === "~~") {
      let $1 = ends_with(l, "~") || starts_with(r, "~");
      if ($1) {
        loop$ctx = with_state(ctx, r);
        loop$acc = acc$1 + "~~";
        loop$inlines = inlines;
      } else {
        return parse_delim(with_state(ctx, r), "~", 2, acc$1, inlines);
      }
    } else if (sep === "==") {
      let $1 = ends_with(l, "=") || starts_with(r, "=");
      if ($1) {
        loop$ctx = with_state(ctx, r);
        loop$acc = acc$1 + "==";
        loop$inlines = inlines;
      } else {
        return parse_delim(with_state(ctx, r), "=", 2, acc$1, inlines);
      }
    } else if (sep === `
`) {
      loop$ctx = with_state(ctx, r);
      loop$acc = "";
      loop$inlines = make_break(acc$1, inlines);
    } else if (sep === "]") {
      let $1 = ctx.stack;
      if ($1 instanceof Empty) {
        loop$ctx = with_state(ctx, r);
        loop$acc = acc$1 + "]";
        loop$inlines = inlines;
      } else {
        let $2 = $1.head;
        if ($2 === "]") {
          let stack = $1.tail;
          let ctx$1 = new Context(ctx.cache, new_state(r, ctx.cache.sp_line), stack, ctx.doc, ctx.nest);
          return new InlineState(ctx$1, push_text(acc$1, inlines));
        } else {
          throw makeError("panic", FILEPATH5, "mork/internal/inlines", 186, "do_parse_inlines", "non-bracket on the stack", {});
        }
      }
    } else if (sep === "https://") {
      let $1 = ctx.doc.options.autolinks;
      if ($1) {
        return do_parse_autolink(ctx, sep, r, acc$1, inlines);
      } else {
        loop$ctx = with_state(ctx, r);
        loop$acc = acc$1 + sep;
        loop$inlines = inlines;
      }
    } else if (sep === "http://") {
      let $1 = ctx.doc.options.autolinks;
      if ($1) {
        return do_parse_autolink(ctx, sep, r, acc$1, inlines);
      } else {
        loop$ctx = with_state(ctx, r);
        loop$acc = acc$1 + sep;
        loop$inlines = inlines;
      }
    } else if (sep === "www.") {
      let $1 = ctx.doc.options.autolinks;
      if ($1) {
        return do_parse_autolink(ctx, sep, r, acc$1, inlines);
      } else {
        loop$ctx = with_state(ctx, r);
        loop$acc = acc$1 + sep;
        loop$inlines = inlines;
      }
    } else {
      throw makeError("panic", FILEPATH5, "mork/internal/inlines", 194, "do_parse_inlines", "unimplemented inline: " + sep, {});
    }
  }
}
function link_handle_reference(ctx, start5, rest, acc, text4, inner_inlines, inlines, ref2) {
  let fail = () => {
    let inlines$1 = flatten(toList([
      toList([new Text2("]")]),
      inner_inlines,
      toList([new Text2(start5)]),
      inlines
    ]));
    return do_parse_inlines(ctx, "", inlines$1);
  };
  let _block;
  if (acc === "[") {
    _block = gobble_link_label(ctx.cache.sp_link_label, rest);
  } else if (acc === "[]") {
    _block = [text4, rest];
  } else if (acc === "") {
    _block = [text4, rest];
  } else {
    throw makeError("panic", FILEPATH5, "mork/internal/inlines", 639, "link_handle_reference", "unreachable label case, acc=" + acc, {});
  }
  let $ = _block;
  let raw_label;
  let rest$1;
  raw_label = $[0];
  rest$1 = $[1];
  return lazy_guard(raw_label === "", fail, () => {
    let _block$1;
    let _pipe = raw_label;
    _block$1 = casefold(_pipe);
    let raw_label$1 = _block$1;
    let link = get(ctx.doc.links, raw_label$1);
    if (link instanceof Ok) {
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(ref2((() => {
        let _pipe$1 = inner_inlines;
        return reverse(_pipe$1);
      })(), raw_label$1), inlines));
    } else {
      return fail();
    }
  });
}
function link_handle_parens(ctx, start5, rest, text4, inner_inlines, inlines, ref2, full) {
  let $ = parse_link_paren(ctx, rest);
  if ($ instanceof Ok) {
    let data2 = $[0][0];
    let rest$1 = $[0][1];
    return do_parse_inlines(with_state(ctx, rest$1), "", prepend(full((() => {
      let _pipe = inner_inlines;
      return reverse(_pipe);
    })(), data2), inlines));
  } else {
    return link_handle_reference(ctx, start5, "(" + rest, "", text4, inner_inlines, inlines, ref2);
  }
}
function do_parse_autolink(ctx, scheme, rest, acc, inlines) {
  let _block;
  let $ = acc !== "";
  if ($) {
    _block = slice(acc, string_length(acc) - 1, 1);
  } else {
    _block = last_char_of(inlines);
  }
  let before = _block;
  if (before === "") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === " ") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === `
`) {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "\t") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "\r") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "*") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "_") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "~") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else if (before === "(") {
    let $1 = parse_autolink_tail(ctx, rest);
    let link_tail;
    let rest$1;
    link_tail = $1[0];
    rest$1 = $1[1];
    if (link_tail === "") {
      return do_parse_inlines(with_state(ctx, rest$1), acc + scheme, inlines);
    } else {
      let html = (() => {
        if (scheme === "www.") {
          return "http://www.";
        } else {
          return scheme;
        }
      })() + link_tail;
      let text4 = scheme + link_tail;
      return do_parse_inlines(with_state(ctx, rest$1), "", prepend(new Autolink(html, new Some(text4)), push_text(acc, inlines)));
    }
  } else {
    return do_parse_inlines(with_state(ctx, rest), acc + scheme, inlines);
  }
}
function do_parse_inline_html(ctx, acc, inlines) {
  let $ = split_at_tag(ctx, ctx.state.start);
  let html;
  let gt;
  let tail;
  html = $[0];
  gt = $[1];
  tail = $[2];
  return lazy_guard(gt === "", () => {
    return do_parse_inlines(ctx, acc + "<", inlines);
  }, () => {
    return lazy_guard(check2(ctx.cache.autolink, html), () => {
      return do_parse_inlines(with_state(ctx, tail), "", prepend(new Autolink(html, new None), push_text(acc, inlines)));
    }, () => {
      return lazy_guard(check2(ctx.cache.email_autolink, html), () => {
        return do_parse_inlines(with_state(ctx, tail), "", prepend(new EmailAutolink(html), prepend(new Text2(acc), inlines)));
      }, () => {
        return lazy_guard(ctx.cache.is_a_html_tag("<" + html + ">", false, false), () => {
          return do_parse_inlines(with_state(ctx, tail), "", prepend(new RawHtml("<" + html + ">"), prepend(new Text2(acc), inlines)));
        }, () => {
          if (html === "![CDATA[") {
            let $1 = split_once(tail, "]]>");
            if ($1 instanceof Ok) {
              let bod = $1[0][0];
              let tail$1 = $1[0][1];
              return do_parse_inlines(with_state(ctx, tail$1), "", prepend(new RawHtml("<" + html + ">" + bod + "]]>"), prepend(new Text2(acc), inlines)));
            } else {
              return do_parse_inlines(ctx, acc + "<", inlines);
            }
          } else if (html.startsWith("!")) {
            return do_parse_inlines(with_state(ctx, tail), "", prepend(new RawHtml("<" + html + ">"), prepend(new Text2(acc), inlines)));
          } else if (html.startsWith("?")) {
            return do_parse_inlines(with_state(ctx, tail), "", prepend(new RawHtml("<" + html + ">"), prepend(new Text2(acc), inlines)));
          } else {
            return do_parse_inlines(ctx, acc + "<", inlines);
          }
        });
      });
    });
  });
}
function do_parse_codespan_end(loop$ctx, loop$runsplit, loop$run, loop$acc, loop$inlines) {
  while (true) {
    let ctx = loop$ctx;
    let runsplit = loop$runsplit;
    let run2 = loop$run;
    let acc = loop$acc;
    let inlines = loop$inlines;
    let $ = split4(runsplit, ctx.state.start);
    let pre2;
    let runend;
    let post2;
    pre2 = $[0];
    runend = $[1];
    post2 = $[2];
    let $1 = runend === "";
    if ($1) {
      return do_parse_inlines(with_state(ctx, acc + ctx.state.start), run2, inlines);
    } else {
      let $2 = post2 === "";
      if ($2) {
        return new InlineState(ctx, prepend((() => {
          let _pipe = acc + pre2;
          return make_codespan(_pipe);
        })(), inlines));
      } else {
        let body = acc + pre2;
        let marker = lazy_unwrap(first2(run2), () => {
          throw makeError("panic", FILEPATH5, "mork/internal/inlines", 969, "do_parse_codespan_end", "`panic` expression evaluated.", {});
        });
        let $3 = starts_with(post2, marker);
        if ($3) {
          let $4 = take_while(post2, marker);
          let runrest;
          let post$1;
          runrest = $4[0];
          post$1 = $4[1];
          let acc$1 = body + runend + runrest;
          loop$ctx = with_state(ctx, post$1);
          loop$runsplit = runsplit;
          loop$run = run2;
          loop$acc = acc$1;
          loop$inlines = inlines;
        } else {
          let $4 = "";
          if (!(body !== $4)) {
            throw makeError("assert", FILEPATH5, "mork/internal/inlines", 984, "do_parse_codespan_end", "Unreachable = empty code", {
              kind: "binary_operator",
              operator: "!=",
              left: {
                kind: "expression",
                value: body,
                start: 28388,
                end: 28392
              },
              right: { kind: "literal", value: $4, start: 28396, end: 28398 },
              start: 28381,
              end: 28398,
              expression_start: 28388
            });
          }
          return do_parse_inlines(with_state(ctx, post2), "", prepend((() => {
            let _pipe = body;
            return make_codespan(_pipe);
          })(), inlines));
        }
      }
    }
  }
}
function do_parse_codespan(ctx, run2, acc, inlines) {
  let _block;
  let $1 = run2 === 1;
  if ($1) {
    _block = ["`", ctx.cache.sp_1backquote];
  } else {
    let runs2 = repeat("`", run2);
    _block = [runs2, new$6(toList([runs2]))];
  }
  let $ = _block;
  let runs;
  let runsplit;
  runs = $[0];
  runsplit = $[1];
  let rest = ctx.state.start;
  return lazy_guard(rest === "", () => {
    return new InlineState(ctx, push_text(acc + runs, inlines));
  }, () => {
    return do_parse_codespan_end(ctx, runsplit, runs, "", push_text(acc, inlines));
  });
}
function do_inline_escape(ctx, acc, inlines) {
  let $ = ctx.state.start;
  if ($ === "") {
    return new InlineState(ctx, prepend(new Text2(acc + "\\"), inlines));
  } else if ($.startsWith('"')) {
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + "\\\"", inlines);
  } else if ($.startsWith("&")) {
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + "\\&", inlines);
  } else if ($.startsWith("<")) {
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + "\\<", inlines);
  } else if ($.startsWith(">")) {
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + "\\>", inlines);
  } else if ($.startsWith("\\")) {
    let ch = "\\";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("!")) {
    let ch = "!";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("#")) {
    let ch = "#";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("$")) {
    let ch = "$";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("%")) {
    let ch = "%";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("'")) {
    let ch = "'";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("(")) {
    let ch = "(";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith(")")) {
    let ch = ")";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("*")) {
    let ch = "*";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("+")) {
    let ch = "+";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith(",")) {
    let ch = ",";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("-")) {
    let ch = "-";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith(".")) {
    let ch = ".";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("/")) {
    let ch = "/";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith(":")) {
    let ch = ":";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith(";")) {
    let ch = ";";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("=")) {
    let ch = "=";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("?")) {
    let ch = "?";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("@")) {
    let ch = "@";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("[")) {
    let ch = "[";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("]")) {
    let ch = "]";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("^")) {
    let ch = "^";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("_")) {
    let ch = "_";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("`")) {
    let ch = "`";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("{")) {
    let ch = "{";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("|")) {
    let ch = "|";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("}")) {
    let ch = "}";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith("~")) {
    let ch = "~";
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), acc + ch, inlines);
  } else if ($.startsWith(`
`)) {
    let rest = $.slice(1);
    return do_parse_inlines(with_state(ctx, rest), "", prepend(new HardBreak, push_text(acc, inlines)));
  } else {
    return do_parse_inlines(ctx, acc + "\\", inlines);
  }
}
function consume_delims(ctx, style2, pre_len, post_len, inner) {
  return lazy_guard(pre_len === 0, () => {
    if (post_len === 0) {
      return inner;
    } else {
      return append(inner, toList([new Delim(style2, post_len, false, true)]));
    }
  }, () => {
    return lazy_guard(post_len === 0, () => {
      if (pre_len === 0) {
        return inner;
      } else {
        return prepend(new Delim(style2, pre_len, true, false), inner);
      }
    }, () => {
      let _block;
      let _pipe = new InlineState(ctx, inner);
      _block = resolve_delims(_pipe);
      let state = _block;
      let inner$1 = state.inlines;
      if (style2 === "~") {
        return consume_delims(ctx, style2, pre_len - 2, post_len - 2, toList([new Strikethrough(inner$1)]));
      } else if (style2 === "=") {
        return consume_delims(ctx, style2, pre_len - 2, post_len - 2, toList([new Highlight(inner$1)]));
      } else if (pre_len > 1 && post_len > 1) {
        return consume_delims(ctx, style2, pre_len - 2, post_len - 2, toList([new Strong(inner$1)]));
      } else {
        return consume_delims(ctx, style2, pre_len - 1, post_len - 1, toList([new Emphasis(inner$1)]));
      }
    });
  });
}
function resolve_delims(state) {
  return rec_resolve_delims(state, 0);
}
function rec_resolve_delims(loop$state, loop$depth) {
  while (true) {
    let state = loop$state;
    let depth = loop$depth;
    let $ = do_resolve_delims(state.ctx, state.inlines, toList([]), false);
    let inlines;
    let resolves;
    inlines = $[0];
    resolves = $[1];
    if (resolves && depth < 14) {
      loop$state = new InlineState(state.ctx, inlines);
      loop$depth = depth + 1;
    } else {
      return new InlineState(state.ctx, inlines);
    }
  }
}
function do_resolve_delims(loop$ctx, loop$inlines, loop$acc, loop$resolves) {
  while (true) {
    let ctx = loop$ctx;
    let inlines = loop$inlines;
    let acc = loop$acc;
    let resolves = loop$resolves;
    if (inlines instanceof Empty) {
      return [
        (() => {
          let _pipe = acc;
          return reverse(_pipe);
        })(),
        resolves
      ];
    } else {
      let $ = inlines.head;
      if ($ instanceof Delim) {
        let $1 = $.can_close;
        if ($1) {
          let rest = inlines.tail;
          let style2 = $.style;
          let len = $.len;
          let can_open = $.can_open;
          let $2 = matching_opener(ctx, style2, len, toList([]), rest, true, resolves);
          let inner;
          let opener;
          let tail;
          let resolves$1;
          inner = $2[0];
          opener = $2[1];
          tail = $2[2];
          resolves$1 = $2[3];
          if (opener instanceof Some) {
            let opener$1 = opener[0];
            if (!(opener$1 instanceof Delim)) {
              throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 325, "do_resolve_delims", "Pattern match failed, no pattern matched the value.", {
                value: opener$1,
                start: 10275,
                end: 10304,
                pattern_start: 10286,
                pattern_end: 10295
              });
            }
            loop$ctx = ctx;
            loop$inlines = tail;
            loop$acc = flatten(toList([consume_delims(ctx, style2, opener$1.len, len, inner), acc]));
            loop$resolves = true;
          } else {
            let $3 = matching_opener(ctx, style2, len, toList([]), rest, false, resolves$1);
            let inner$1;
            let opener$1;
            let tail$1;
            let resolves$2;
            inner$1 = $3[0];
            opener$1 = $3[1];
            tail$1 = $3[2];
            resolves$2 = $3[3];
            if (opener$1 instanceof Some) {
              let opener$2 = opener$1[0];
              if (!(opener$2 instanceof Delim)) {
                throw makeError("let_assert", FILEPATH5, "mork/internal/inlines", 341, "do_resolve_delims", "Pattern match failed, no pattern matched the value.", {
                  value: opener$2,
                  start: 10744,
                  end: 10773,
                  pattern_start: 10755,
                  pattern_end: 10764
                });
              }
              loop$ctx = ctx;
              loop$inlines = tail$1;
              loop$acc = flatten(toList([
                consume_delims(ctx, style2, opener$2.len, len, inner$1),
                acc
              ]));
              loop$resolves = true;
            } else {
              loop$ctx = ctx;
              loop$inlines = rest;
              loop$acc = prepend(new Delim(style2, len, can_open, true), acc);
              loop$resolves = resolves$2;
            }
          }
        } else {
          let any2 = $;
          let rest = inlines.tail;
          loop$ctx = ctx;
          loop$inlines = rest;
          loop$acc = prepend(any2, acc);
          loop$resolves = resolves;
        }
      } else {
        let any2 = $;
        let rest = inlines.tail;
        loop$ctx = ctx;
        loop$inlines = rest;
        loop$acc = prepend(any2, acc);
        loop$resolves = resolves;
      }
    }
  }
}
function do_inlines(ctx, text4) {
  let _pipe = do_parse_inlines(with_state(ctx, text4), "", toList([]));
  let _pipe$1 = resolve_delims(_pipe);
  let _pipe$2 = ((state) => {
    return state.inlines;
  })(_pipe$1);
  return reverse(_pipe$2);
}
function do_checkbox_inlines(ctx, raw) {
  let $ = try_parse_checkbox(raw);
  if ($ instanceof Ok) {
    let checkbox = $[0][0];
    let raw$1 = $[0][1];
    return prepend(checkbox, do_inlines(ctx, raw$1));
  } else {
    return do_inlines(ctx, raw);
  }
}
function matching_opener(loop$ctx, loop$style, loop$len, loop$acc, loop$rest, loop$strict, loop$resolves) {
  while (true) {
    let ctx = loop$ctx;
    let style2 = loop$style;
    let len = loop$len;
    let acc = loop$acc;
    let rest = loop$rest;
    let strict = loop$strict;
    let resolves = loop$resolves;
    if (rest instanceof Empty) {
      return [toList([]), new None, acc, resolves];
    } else {
      let $ = rest.head;
      if ($ instanceof Delim) {
        let $1 = $.can_open;
        if ($1) {
          let match_style = $.style;
          let match_len = $.len;
          if (match_style === style2 && (!strict || match_len === len)) {
            let tail = rest.tail;
            let can_close = $.can_close;
            return [
              acc,
              new Some(new Delim(style2, match_len, true, can_close)),
              tail,
              true
            ];
          } else {
            let inline = $;
            let tail = rest.tail;
            loop$ctx = ctx;
            loop$style = style2;
            loop$len = len;
            loop$acc = prepend(inline, acc);
            loop$rest = tail;
            loop$strict = strict;
            loop$resolves = resolves;
          }
        } else {
          let $2 = $.can_close;
          if ($2) {
            let $3 = do_resolve_delims(ctx, rest, toList([]), resolves);
            let new_rest;
            let resolves$1;
            new_rest = $3[0];
            resolves$1 = $3[1];
            if (new_rest instanceof Empty) {
              loop$ctx = ctx;
              loop$style = style2;
              loop$len = len;
              loop$acc = acc;
              loop$rest = new_rest;
              loop$strict = strict;
              loop$resolves = resolves$1;
            } else {
              let $4 = new_rest.head;
              if ($4 instanceof Delim) {
                let $5 = $4.can_open;
                if (!$5) {
                  let $6 = $4.can_close;
                  if ($6) {
                    let new_rest$1 = new_rest.tail;
                    let style$1 = $4.style;
                    let len$1 = $4.len;
                    loop$ctx = ctx;
                    loop$style = style$1;
                    loop$len = len$1;
                    loop$acc = prepend(new Delim(style$1, len$1, false, true), acc);
                    loop$rest = new_rest$1;
                    loop$strict = strict;
                    loop$resolves = resolves$1;
                  } else {
                    loop$ctx = ctx;
                    loop$style = style2;
                    loop$len = len;
                    loop$acc = acc;
                    loop$rest = new_rest;
                    loop$strict = strict;
                    loop$resolves = resolves$1;
                  }
                } else {
                  loop$ctx = ctx;
                  loop$style = style2;
                  loop$len = len;
                  loop$acc = acc;
                  loop$rest = new_rest;
                  loop$strict = strict;
                  loop$resolves = resolves$1;
                }
              } else {
                loop$ctx = ctx;
                loop$style = style2;
                loop$len = len;
                loop$acc = acc;
                loop$rest = new_rest;
                loop$strict = strict;
                loop$resolves = resolves$1;
              }
            }
          } else {
            let inline = $;
            let tail = rest.tail;
            loop$ctx = ctx;
            loop$style = style2;
            loop$len = len;
            loop$acc = prepend(inline, acc);
            loop$rest = tail;
            loop$strict = strict;
            loop$resolves = resolves;
          }
        }
      } else {
        let inline = $;
        let tail = rest.tail;
        loop$ctx = ctx;
        loop$style = style2;
        loop$len = len;
        loop$acc = prepend(inline, acc);
        loop$rest = tail;
        loop$strict = strict;
        loop$resolves = resolves;
      }
    }
  }
}
function do_parse_footnote(ctx, acc, inlines) {
  let start5 = "[^";
  let stackpos = length(ctx.stack);
  let inlines$1 = push_text(acc, inlines);
  return lazy_guard(!ctx.doc.options.footnotes, () => {
    return do_parse_inlines(ctx, start5, inlines$1);
  }, () => {
    let _block;
    let _pipe = do_parse_inlines(new Context(ctx.cache, ctx.state, prepend("]", ctx.stack), ctx.doc, ctx.nest), "", toList([]));
    _block = resolve_delims(_pipe);
    let inner = _block;
    let $ = gobble_link_label(ctx.cache.sp_link_label, ctx.state.start);
    let text4;
    text4 = $[0];
    return lazy_guard(length(inner.ctx.stack) !== stackpos, () => {
      return do_parse_inlines(ctx, start5, inlines$1);
    }, () => {
      return lazy_guard((() => {
        let $1 = inner.inlines;
        if ($1 instanceof Empty) {
          return true;
        } else {
          let $2 = $1.tail;
          if ($2 instanceof Empty) {
            let $3 = $1.head;
            if ($3 instanceof Text2) {
              return false;
            } else {
              return true;
            }
          } else {
            return true;
          }
        }
      })(), () => {
        let inlines$2 = flatten(toList([
          toList([new Text2("]")]),
          inner.inlines,
          toList([new Text2(start5)]),
          inlines$1
        ]));
        return do_parse_inlines(inner.ctx, "", inlines$2);
      }, () => {
        let rest = inner.ctx.state.start;
        let ctx$1 = inner.ctx;
        let fail = () => {
          let inlines$2 = flatten(toList([
            toList([new Text2("]")]),
            inner.inlines,
            toList([new Text2(start5)]),
            inlines$1
          ]));
          return do_parse_inlines(ctx$1, "", inlines$2);
        };
        let raw_label = text4;
        return lazy_guard(raw_label === "", fail, () => {
          let _block$1;
          let _pipe$1 = raw_label;
          _block$1 = casefold(_pipe$1);
          let raw_label$1 = _block$1;
          let footnote = get(ctx$1.doc.footnotes, raw_label$1);
          if (footnote instanceof Ok) {
            let num = footnote[0].num;
            return do_parse_inlines(with_state(ctx$1, rest), "", prepend(new Footnote(num, to_string(num)), inlines$1));
          } else {
            return fail();
          }
        });
      });
    });
  });
}
function parse_common_linkref(ctx, acc, inlines, start5, full, ref2) {
  let stackpos = length(ctx.stack);
  let inlines$1 = push_text(acc, inlines);
  let _block;
  let _pipe = do_parse_inlines(new Context(ctx.cache, ctx.state, prepend("]", ctx.stack), ctx.doc, ctx.nest), "", toList([]));
  _block = resolve_delims(_pipe);
  let inner = _block;
  let $ = gobble_link_label(ctx.cache.sp_link_label, ctx.state.start);
  let text4;
  text4 = $[0];
  return lazy_guard(length(inner.ctx.stack) !== stackpos, () => {
    return do_parse_inlines(ctx, start5, inlines$1);
  }, () => {
    return lazy_guard(start5 !== "![" && contains_a_link(inner.inlines), () => {
      let inlines$2 = flatten(toList([
        toList([new Text2("]")]),
        inner.inlines,
        toList([new Text2(start5)]),
        inlines$1
      ]));
      return do_parse_inlines(inner.ctx, "", inlines$2);
    }, () => {
      let rest = inner.ctx.state.start;
      if (rest.startsWith("(")) {
        let rest$1 = rest.slice(1);
        return link_handle_parens(inner.ctx, start5, rest$1, text4, inner.inlines, inlines$1, ref2, full);
      } else if (rest.startsWith("[]")) {
        let post2 = "[]";
        let rest$1 = rest.slice(2);
        return link_handle_reference(inner.ctx, start5, rest$1, post2, text4, inner.inlines, inlines$1, ref2);
      } else if (rest.startsWith("[")) {
        let post2 = "[";
        let rest$1 = rest.slice(1);
        return link_handle_reference(inner.ctx, start5, rest$1, post2, text4, inner.inlines, inlines$1, ref2);
      } else {
        return link_handle_reference(inner.ctx, start5, rest, "", text4, inner.inlines, inlines$1, ref2);
      }
    });
  });
}
function do_parse_image(ctx, acc, inlines) {
  return parse_common_linkref(ctx, acc, inlines, "![", (var0, var1) => {
    return new FullImage(var0, var1);
  }, (var0, var1) => {
    return new RefImage(var0, var1);
  });
}
function do_parse_linkref(ctx, acc, inlines) {
  return parse_common_linkref(ctx, acc, inlines, "[", (var0, var1) => {
    return new FullLink(var0, var1);
  }, (var0, var1) => {
    return new RefLink(var0, var1);
  });
}

// build/dev/javascript/mork/mork.mjs
function configure2() {
  return new Options3(false, true, false, false, false, false, false);
}
function split_frontmatter_from_input(input2) {
  let fms = new$6(toList([`---
`, `---\r
`]));
  let $ = split4(fms, input2);
  let nothing;
  let start5;
  let rest;
  nothing = $[0];
  start5 = $[1];
  rest = $[2];
  let $1 = nothing !== "" || start5 === "";
  if ($1) {
    return ["", input2];
  } else {
    let $2 = split4(fms, rest);
    let frontmatter;
    let end;
    let rest$1;
    frontmatter = $2[0];
    end = $2[1];
    rest$1 = $2[2];
    if (end === "") {
      return ["", input2];
    } else {
      return [frontmatter, rest$1];
    }
  }
}
function parse_with_options(options, input2) {
  let _block;
  let $ = options.strip_frontmatter;
  if ($) {
    _block = split_frontmatter_from_input(input2)[1];
  } else {
    _block = input2;
  }
  let input$1 = _block;
  let _pipe = options;
  let _pipe$1 = from_string2(_pipe, input$1);
  let _pipe$2 = parse_blocks(_pipe$1);
  return process_inlines(_pipe$2);
}
// build/dev/javascript/maud/maud/components.mjs
class Left2 extends CustomType {
}
class Center2 extends CustomType {
}
class Right2 extends CustomType {
}
class Components extends CustomType {
  constructor(a2, blockquote2, checkbox, code2, del2, em2, footnote, h12, h22, h32, h42, h52, h62, hr2, img2, li2, mark2, ol2, p2, pre2, strong2, table2, tbody2, td2, th2, thead2, tr2, ul2) {
    super();
    this.a = a2;
    this.blockquote = blockquote2;
    this.checkbox = checkbox;
    this.code = code2;
    this.del = del2;
    this.em = em2;
    this.footnote = footnote;
    this.h1 = h12;
    this.h2 = h22;
    this.h3 = h32;
    this.h4 = h42;
    this.h5 = h52;
    this.h6 = h62;
    this.hr = hr2;
    this.img = img2;
    this.li = li2;
    this.mark = mark2;
    this.ol = ol2;
    this.p = p2;
    this.pre = pre2;
    this.strong = strong2;
    this.table = table2;
    this.tbody = tbody2;
    this.td = td2;
    this.th = th2;
    this.thead = thead2;
    this.tr = tr2;
    this.ul = ul2;
  }
}
function img2(components, img3) {
  return new Components(components.a, components.blockquote, components.checkbox, components.code, components.del, components.em, components.footnote, components.h1, components.h2, components.h3, components.h4, components.h5, components.h6, components.hr, img3, components.li, components.mark, components.ol, components.p, components.pre, components.strong, components.table, components.tbody, components.td, components.th, components.thead, components.tr, components.ul);
}
function default_view(view3) {
  return (children) => {
    return view3(toList([]), children);
  };
}
function heading_view(view3) {
  return (id2, children) => {
    if (id2 === "") {
      return view3(toList([]), children);
    } else {
      return view3(toList([id(id2)]), children);
    }
  };
}
function aligned_cell_view(view3) {
  return (alignment, children) => {
    let _block;
    if (alignment instanceof Left2) {
      _block = "left";
    } else if (alignment instanceof Center2) {
      _block = "center";
    } else {
      _block = "right";
    }
    let align_value = _block;
    return view3(toList([style("text-align", align_value)]), children);
  };
}
function default$() {
  return new Components((href2, title2, children) => {
    let _block;
    if (title2 instanceof Some) {
      let t = title2[0];
      _block = toList([title(t)]);
    } else {
      _block = toList([]);
    }
    let title_attr = _block;
    return a(prepend(href(href2), title_attr), children);
  }, default_view(blockquote), (checked2) => {
    let _block;
    if (checked2) {
      _block = toList([
        type_("checkbox"),
        checked(true),
        disabled(true)
      ]);
    } else {
      _block = toList([
        type_("checkbox"),
        disabled(true)
      ]);
    }
    let attrs = _block;
    return input(attrs);
  }, (language, children) => {
    if (language instanceof Some) {
      let lang = language[0];
      return code(toList([class$("language-" + lang)]), children);
    } else {
      return code(toList([]), children);
    }
  }, default_view(del), default_view(em), (num, children) => {
    return sup(toList([]), toList([
      a(toList([id("fnref-" + to_string(num))]), children)
    ]));
  }, heading_view(h1), heading_view(h2), heading_view(h3), heading_view(h4), heading_view(h5), heading_view(h6), () => {
    return hr(toList([]));
  }, (uri, alt2, title2) => {
    let _block;
    if (alt2 === "") {
      _block = toList([]);
    } else {
      _block = toList([alt(alt2)]);
    }
    let alt_attr = _block;
    let _block$1;
    if (title2 instanceof Some) {
      let t = title2[0];
      _block$1 = toList([title(t)]);
    } else {
      _block$1 = toList([]);
    }
    let title_attr = _block$1;
    return img(flatten(toList([toList([src(uri)]), alt_attr, title_attr])));
  }, default_view(li), default_view(mark), (start5, children) => {
    if (start5 instanceof Some) {
      let s = start5[0];
      return ol(toList([attribute2("start", to_string(s))]), children);
    } else {
      return ol(toList([]), children);
    }
  }, default_view(p), default_view(pre), default_view(strong), default_view(table), default_view(tbody), aligned_cell_view(td), aligned_cell_view(th), default_view(thead), default_view(tr), default_view(ul));
}

// build/dev/javascript/maud/maud/internal/render.mjs
function render_autolink(uri, text4, components) {
  return components.a(uri, new None, toList([text2(unwrap(text4, uri))]));
}
function render_checkbox(checked2, components) {
  return components.checkbox(checked2);
}
function render_footnote(num, children, components) {
  return components.footnote(num, children);
}
function render_pre(language, text4, components) {
  return components.pre(toList([components.code(language, toList([text2(text4)]))]));
}
function render_thematic_break(components) {
  return components.hr();
}
function src2(destination) {
  if (destination instanceof Absolute) {
    let uri = destination.uri;
    return uri;
  } else if (destination instanceof Relative) {
    let uri = destination.uri;
    return uri;
  } else {
    let anchor = destination.id;
    return "#" + percent_encode(anchor);
  }
}
function html_attributes(attributes) {
  let _pipe = attributes;
  let _pipe$1 = to_list(_pipe);
  return map2(_pipe$1, (pair) => {
    return attribute2(pair[0], pair[1]);
  });
}
function inlines_to_text(inlines) {
  let _pipe = inlines;
  let _pipe$1 = map2(_pipe, (inline) => {
    if (inline instanceof CodeSpan) {
      let text4 = inline[0];
      return text4;
    } else if (inline instanceof Emphasis) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof HardBreak) {
      return " ";
    } else if (inline instanceof Highlight) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof SoftBreak) {
      return " ";
    } else if (inline instanceof Strikethrough) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof Strong) {
      let inner = inline[0];
      return inlines_to_text(inner);
    } else if (inline instanceof Text2) {
      let text4 = inline[0];
      return text4;
    } else {
      return "";
    }
  });
  return concat2(_pipe$1);
}
function render_img(inlines, link_data, _, components) {
  let uri = src2(link_data.dest);
  let alt2 = inlines_to_text(inlines);
  return components.img(uri, alt2, link_data.title);
}
function mork_alignment_to_alignment(alignment) {
  if (alignment instanceof Left) {
    return new Left2;
  } else if (alignment instanceof Right) {
    return new Right2;
  } else {
    return new Center2;
  }
}
function render_blockquote(blocks, document2, components) {
  let _pipe = blocks;
  let _pipe$1 = render_blocks(_pipe, document2, components);
  return components.blockquote(_pipe$1);
}
function render_blocks(blocks, document2, components) {
  return map2(blocks, (block) => {
    return render_block(block, document2, components, new Loose);
  });
}
function render_block(block, document2, components, pack) {
  if (block instanceof BlockQuote) {
    let blocks = block.blocks;
    return render_blockquote(blocks, document2, components);
  } else if (block instanceof BulletList) {
    let pack$1 = block.pack;
    let items = block.items;
    return render_ul(pack$1, items, document2, components);
  } else if (block instanceof Code) {
    let lang = block.lang;
    let text4 = block.text;
    return render_pre(lang, text4, components);
  } else if (block instanceof Empty2) {
    return none2();
  } else if (block instanceof Heading) {
    let level = block.level;
    let id2 = block.id;
    let inlines = block.inlines;
    return render_heading(level, id2, inlines, document2, components);
  } else if (block instanceof HtmlBlock) {
    let raw = block.raw;
    return unsafe_raw_html("", "div", toList([]), raw);
  } else if (block instanceof Newline) {
    return none2();
  } else if (block instanceof OrderedList) {
    let pack$1 = block.pack;
    let items = block.items;
    let start5 = block.start;
    return render_ol(start5, pack$1, items, document2, components);
  } else if (block instanceof Paragraph) {
    let inlines = block.inlines;
    return render_paragraph(pack, inlines, document2, components);
  } else if (block instanceof Table) {
    let header = block.header;
    let rows = block.rows;
    return render_table(header, rows, document2, components);
  } else {
    return render_thematic_break(components);
  }
}
function footnote(acc, document2, components) {
  let _pipe = document2.footnotes;
  let _pipe$1 = to_list(_pipe);
  let _pipe$2 = sort(_pipe$1, (a2, b) => {
    return compare3(a2[0], b[0]);
  });
  let _pipe$3 = map2(_pipe$2, (tup) => {
    return tup[1];
  });
  let _pipe$4 = flat_map(_pipe$3, (doc) => {
    return render_blocks(doc.blocks, document2, components);
  });
  return ((footnotes) => {
    return append(acc, footnotes);
  })(_pipe$4);
}
function render_inline(document2, inline, components) {
  if (inline instanceof Autolink) {
    let uri = inline.uri;
    let text4 = inline.text;
    return render_autolink(uri, text4, components);
  } else if (inline instanceof CodeSpan) {
    let text4 = inline[0];
    return components.code(new None, toList([text2(text4)]));
  } else if (inline instanceof EmailAutolink) {
    let email = inline.mail;
    return render_autolink("mailto:" + email, new Some(email), components);
  } else if (inline instanceof Emphasis) {
    let inlines = inline[0];
    return render_emphasis(inlines, document2, components);
  } else if (inline instanceof Footnote) {
    let num = inline.num;
    let label2 = inline.label;
    return render_footnote(num, toList([text2(label2)]), components);
  } else if (inline instanceof FullImage) {
    let inlines = inline.text;
    let image = inline.data;
    return render_img(inlines, image, document2, components);
  } else if (inline instanceof FullLink) {
    let inlines = inline.text;
    let link_data = inline.data;
    return render_a(inlines, link_data, document2, components);
  } else if (inline instanceof HardBreak) {
    return br(toList([]));
  } else if (inline instanceof Highlight) {
    let inlines = inline[0];
    return render_highlight(inlines, document2, components);
  } else if (inline instanceof InlineFootnote) {
    let num = inline.num;
    let inlines = inline.text;
    return render_footnote(num, render_inlines(inlines, document2, components), components);
  } else if (inline instanceof InlineHtml) {
    let tag = inline.tag;
    let attributes = inline.attrs;
    let inlines = inline.children;
    return render_inline_html(tag, attributes, inlines, document2, components);
  } else if (inline instanceof RawHtml) {
    return none2();
  } else if (inline instanceof RefImage) {
    let inlines = inline.text;
    let label2 = inline.label;
    let $ = get(document2.links, label2);
    if ($ instanceof Ok) {
      let link_data = $[0];
      return render_img(inlines, link_data, document2, components);
    } else {
      return render_img(inlines, new LinkData(new Absolute(""), new None), document2, components);
    }
  } else if (inline instanceof RefLink) {
    let inlines = inline.text;
    let label2 = inline.label;
    let $ = get(document2.links, label2);
    if ($ instanceof Ok) {
      let link_data = $[0];
      return render_a(inlines, link_data, document2, components);
    } else {
      return render_a(inlines, new LinkData(new Absolute(""), new None), document2, components);
    }
  } else if (inline instanceof SoftBreak) {
    return text2(`
`);
  } else if (inline instanceof Strikethrough) {
    let inlines = inline[0];
    return render_strikethrough(inlines, document2, components);
  } else if (inline instanceof Strong) {
    let inlines = inline[0];
    return render_strong(inlines, document2, components);
  } else if (inline instanceof Text2) {
    let text4 = inline[0];
    return text2(text4);
  } else if (inline instanceof Checkbox) {
    let checked2 = inline.checked;
    return render_checkbox(checked2, components);
  } else {
    let style2 = inline.style;
    let len = inline.len;
    return text2(repeat(style2, len));
  }
}
function render_strong(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.strong(_pipe$1);
}
function render_inlines(inlines, document2, components) {
  return map2(inlines, (inline) => {
    return render_inline(document2, inline, components);
  });
}
function render_a(inlines, link_data, document2, components) {
  let href2 = src2(link_data.dest);
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return ((children) => {
    return components.a(href2, link_data.title, children);
  })(_pipe$1);
}
function render_emphasis(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.em(_pipe$1);
}
function render_heading(level, id2, inlines, document2, components) {
  let children = render_inlines(inlines, document2, components);
  if (level === 1) {
    return components.h1(id2, children);
  } else if (level === 2) {
    return components.h2(id2, children);
  } else if (level === 3) {
    return components.h3(id2, children);
  } else if (level === 4) {
    return components.h4(id2, children);
  } else if (level === 5) {
    return components.h5(id2, children);
  } else {
    return components.h6(id2, children);
  }
}
function render_highlight(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.mark(_pipe$1);
}
function render_inline_html(tag, attributes, children, document2, components) {
  return element2(tag, html_attributes(attributes), render_inlines(children, document2, components));
}
function render_paragraph(pack, inlines, document2, components) {
  let text4 = render_inlines(inlines, document2, components);
  if (pack instanceof Loose) {
    return components.p(text4);
  } else {
    return fragment2(text4);
  }
}
function render_strikethrough(inlines, document2, components) {
  let _pipe = inlines;
  let _pipe$1 = render_inlines(_pipe, document2, components);
  return components.del(_pipe$1);
}
function render_td(alignment, items, document2, components) {
  let align = mork_alignment_to_alignment(alignment);
  let children = render_inlines(items, document2, components);
  return components.td(align, children);
}
function render_tr(cells, aligns, document2, components) {
  let _pipe = cells;
  let _pipe$1 = zip(_pipe, aligns);
  let _pipe$2 = map2(_pipe$1, (pair) => {
    let cell = pair[0];
    let align = pair[1];
    return render_td(align, cell.inlines, document2, components);
  });
  return components.tr(_pipe$2);
}
function render_tbody(rows, aligns, document2, components) {
  let _pipe = rows;
  let _pipe$1 = map2(_pipe, (cells) => {
    return render_tr(cells, aligns, document2, components);
  });
  return components.tbody(_pipe$1);
}
function render_th(alignment, items, document2, components) {
  let align = mork_alignment_to_alignment(alignment);
  let children = render_inlines(items, document2, components);
  return components.th(align, children);
}
function render_thead(headers, document2, components) {
  let _pipe = headers;
  let _pipe$1 = map2(_pipe, (header) => {
    return render_th(header.align, header.inlines, document2, components);
  });
  let _pipe$2 = components.tr(_pipe$1);
  return ((row) => {
    return components.thead(toList([row]));
  })(_pipe$2);
}
function render_table(header, rows, document2, components) {
  let thead2 = render_thead(header, document2, components);
  let aligns = map2(header, (head) => {
    return head.align;
  });
  let tbody2 = render_tbody(rows, aligns, document2, components);
  return components.table(toList([thead2, tbody2]));
}
function render_list_item(list_item, pack, document2, components) {
  let _pipe = list_item.blocks;
  let _pipe$1 = flat_map(_pipe, (block) => {
    if (pack instanceof Tight && block instanceof Paragraph) {
      let inlines = block.inlines;
      return render_inlines(inlines, document2, components);
    } else {
      return toList([render_block(block, document2, components, pack)]);
    }
  });
  return components.li(_pipe$1);
}
function render_ol(start5, pack, items, document2, components) {
  let _block;
  let _pipe = items;
  _block = map2(_pipe, (item) => {
    return render_list_item(item, pack, document2, components);
  });
  let children = _block;
  return components.ol(start5, children);
}
function render_ul(pack, items, document2, components) {
  let _pipe = items;
  let _pipe$1 = map2(_pipe, (item) => {
    return render_list_item(item, pack, document2, components);
  });
  return components.ul(_pipe$1);
}

// build/dev/javascript/maud/maud.mjs
function render_document(document2, components) {
  let _pipe = render_blocks(document2.blocks, document2, components);
  return footnote(_pipe, document2, components);
}
function render_markdown(markdown, render_options, components) {
  let _pipe = render_options;
  let _pipe$1 = parse_with_options(_pipe, markdown);
  return render_document(_pipe$1, components);
}

// build/dev/javascript/client/client/markdown.mjs
var FILEPATH6 = "src/client/markdown.gleam";
function convert_html_images(text4) {
  let $ = compile2('<img[^>]*?\\bsrc="([^"]*?)"[^>]*/?>', new Options2(true, false));
  let img_re;
  if ($ instanceof Ok) {
    img_re = $[0];
  } else {
    throw makeError("let_assert", FILEPATH6, "client/markdown", 35, "convert_html_images", "Pattern match failed, no pattern matched the value.", { value: $, start: 995, end: 1157, pattern_start: 1006, pattern_end: 1016 });
  }
  let $1 = compile2('\\balt="([^"]*?)"', new Options2(true, false));
  let alt_re;
  if ($1 instanceof Ok) {
    alt_re = $1[0];
  } else {
    throw makeError("let_assert", FILEPATH6, "client/markdown", 40, "convert_html_images", "Pattern match failed, no pattern matched the value.", {
      value: $1,
      start: 1160,
      end: 1304,
      pattern_start: 1171,
      pattern_end: 1181
    });
  }
  let matches2 = scan2(img_re, text4);
  return fold2(matches2, text4, (acc, m) => {
    let _block;
    let $2 = scan2(alt_re, m.content);
    if ($2 instanceof Empty) {
      _block = "image";
    } else {
      let alt_match = $2.head;
      let $32 = alt_match.submatches;
      if ($32 instanceof Empty) {
        _block = "image";
      } else {
        let $4 = $32.head;
        if ($4 instanceof Some) {
          let a2 = $4[0];
          _block = a2;
        } else {
          _block = "image";
        }
      }
    }
    let alt2 = _block;
    let _block$1;
    let $3 = m.submatches;
    if ($3 instanceof Empty) {
      _block$1 = "";
    } else {
      let $4 = $3.head;
      if ($4 instanceof Some) {
        let s = $4[0];
        _block$1 = s;
      } else {
        _block$1 = "";
      }
    }
    let src3 = _block$1;
    let replacement = "![" + alt2 + "](" + src3 + ")";
    return replace(acc, m.content, replacement);
  });
}
function render(text4) {
  let processed = convert_html_images(text4);
  let _block;
  let _pipe = default$();
  _block = img2(_pipe, (src3, alt2, _) => {
    return img(toList([
      src(src3),
      alt(alt2),
      styles(toList([
        ["max-width", "100%"],
        ["height", "auto"],
        ["border-radius", "8px"],
        ["margin", "0.5rem 0"]
      ]))
    ]));
  });
  let img_components = _block;
  return render_markdown(processed, configure2(), img_components);
}

// build/dev/javascript/client/client/views/pr_review.mjs
class DiffLineEntry extends CustomType {
  constructor(display_line, file_line, text4) {
    super();
    this.display_line = display_line;
    this.file_line = file_line;
    this.text = text4;
  }
}
function description_accordion(body, is_open) {
  let $ = trim(body);
  if ($ === "") {
    return text3("");
  } else {
    let _block;
    if (is_open) {
      _block = "▾";
    } else {
      _block = "▸";
    }
    let chevron = _block;
    return div(toList([
      styles(toList([
        ["background", "#ffffff"],
        ["border", "1px solid #e2e8f0"],
        ["border-radius", "12px"],
        ["margin-bottom", "1.25rem"],
        ["overflow", "hidden"]
      ]))
    ]), toList([
      div(toList([
        on_click(new ToggleDescription),
        styles(toList([
          ["padding", "0.875rem 1.25rem"],
          ["cursor", "pointer"],
          ["display", "flex"],
          ["align-items", "center"],
          ["gap", "0.5rem"],
          ["user-select", "none"],
          ["transition", "background 0.15s"]
        ]))
      ]), toList([
        span(toList([
          styles(toList([
            ["font-size", "0.875rem"],
            ["color", "#6b7280"],
            ["width", "1rem"]
          ]))
        ]), toList([text3(chevron)])),
        span(toList([
          styles(toList([
            ["font-size", "0.9375rem"],
            ["font-weight", "600"],
            ["color", "#374151"]
          ]))
        ]), toList([text3("PR Description")]))
      ])),
      (() => {
        if (is_open) {
          return div(toList([
            styles(toList([
              ["padding", "0 1.25rem 1.25rem 1.25rem"],
              ["border-top", "1px solid #e2e8f0"]
            ]))
          ]), toList([
            div(toList([
              styles(toList([
                ["margin-top", "1rem"],
                ["font-size", "0.875rem"],
                ["line-height", "1.6"],
                ["color", "#374151"],
                ["word-break", "break-word"]
              ]))
            ]), render(body))
          ]));
        } else {
          return text3("");
        }
      })()
    ]));
  }
}
function back_button() {
  return button(toList([
    on_click(new BackToDashboard),
    styles(toList([
      ["padding", "0.5rem 1rem"],
      ["background", "#6c757d"],
      ["color", "white"],
      ["border", "none"],
      ["border-radius", "6px"],
      ["cursor", "pointer"],
      ["font-size", "0.875rem"],
      ["font-weight", "500"],
      ["transition", "background 0.15s"]
    ]))
  ]), toList([text3("Back to Dashboard")]));
}
function analyze_button() {
  return button(toList([
    on_click(new AnalyzePr),
    styles(toList([
      ["padding", "0.5rem 1.25rem"],
      ["background", "#4f46e5"],
      ["color", "white"],
      ["border", "none"],
      ["border-radius", "6px"],
      ["cursor", "pointer"],
      ["font-size", "0.875rem"],
      ["font-weight", "500"],
      ["transition", "background 0.15s"]
    ]))
  ]), toList([text3("Analyze PR")]));
}
function header_area(title2, number, url, head_branch, model) {
  return div(toList([
    styles(toList([
      ["display", "flex"],
      ["align-items", "flex-start"],
      ["justify-content", "space-between"],
      ["margin-bottom", "1.5rem"],
      ["flex-wrap", "wrap"],
      ["gap", "0.75rem"]
    ]))
  ]), toList([
    div(toList([styles(toList([["flex", "1"], ["min-width", "0"]]))]), toList([
      h1(toList([
        styles(toList([
          ["margin", "0"],
          ["font-size", "1.5rem"],
          ["font-weight", "600"],
          ["color", "#1a1a2e"],
          ["display", "flex"],
          ["align-items", "center"],
          ["gap", "0.5rem"]
        ]))
      ]), toList([
        a(toList([
          href(url),
          target("_blank"),
          title(url),
          styles(toList([
            ["color", "#6c757d"],
            ["font-weight", "400"],
            ["text-decoration", "none"]
          ]))
        ]), toList([text3("#" + to_string(number))])),
        text3(title2),
        a(toList([
          href(url),
          target("_blank"),
          title(url),
          styles(toList([
            ["color", "#9ca3af"],
            ["text-decoration", "none"],
            ["font-size", "1.125rem"],
            ["display", "inline-flex"],
            ["align-items", "center"]
          ]))
        ]), toList([
          span(toList([class$("material-symbols-outlined")]), toList([text3("open_in_new")]))
        ]))
      ])),
      div(toList([
        styles(toList([
          ["display", "inline-flex"],
          ["align-items", "center"],
          ["gap", "0.375rem"],
          ["margin-top", "0.5rem"],
          ["padding", "0.25rem 0.625rem"],
          ["background", "#ede9fe"],
          ["border-radius", "999px"],
          [
            "font-family",
            '"SF Mono", "Fira Code", "Consolas", monospace'
          ],
          ["font-size", "0.75rem"],
          ["color", "#6d28d9"],
          ["line-height", "1.4"]
        ]))
      ]), toList([
        span(toList([
          class$("material-symbols-outlined"),
          styles(toList([["font-size", "0.875rem"]]))
        ]), toList([text3("account_tree")])),
        text3(head_branch)
      ]))
    ])),
    div(toList([
      styles(toList([["display", "flex"], ["gap", "0.5rem"]]))
    ]), toList([
      back_button(),
      (() => {
        let $ = model.analysis_state;
        if ($ instanceof NotAnalyzed) {
          return analyze_button();
        } else if ($ instanceof Analyzing) {
          return text3("");
        } else {
          return analyze_button();
        }
      })()
    ]))
  ]));
}
function analyze_prompt() {
  return div(toList([
    styles(toList([
      ["text-align", "center"],
      ["padding", "4rem 2rem"],
      ["background", "#f8f9fa"],
      ["border-radius", "12px"],
      ["border", "1px solid #e9ecef"]
    ]))
  ]), toList([
    p(toList([
      styles(toList([
        ["color", "#6c757d"],
        ["font-size", "1.1rem"],
        ["margin-bottom", "1rem"]
      ]))
    ]), toList([
      text3('Analysis not started. Click "Analyze PR" to begin.')
    ]))
  ]));
}
function error_banner2(message2) {
  return div(toList([
    styles(toList([
      ["padding", "0.75rem 1rem"],
      ["margin-bottom", "1rem"],
      ["background", "#fee2e2"],
      ["border", "1px solid #fca5a5"],
      ["border-radius", "6px"],
      ["color", "#991b1b"],
      ["font-size", "0.9rem"],
      ["white-space", "pre-wrap"],
      ["word-break", "break-word"]
    ]))
  ]), toList([text3(message2)]));
}
function loading_indicator2(heartbeats) {
  let elapsed_seconds = heartbeats * 3;
  let _block;
  if (heartbeats === 0) {
    _block = "Connecting to AI analysis...";
  } else {
    _block = "Analyzing PR with AI... (" + to_string(elapsed_seconds) + "s elapsed)";
  }
  let progress_text = _block;
  return div(toList([
    styles(toList([
      ["text-align", "center"],
      ["padding", "4rem 2rem"],
      ["background", "#f8f9fa"],
      ["border-radius", "12px"],
      ["border", "1px solid #e9ecef"]
    ]))
  ]), toList([
    div(toList([
      styles(toList([
        ["display", "inline-block"],
        ["width", "2rem"],
        ["height", "2rem"],
        ["border", "3px solid #e9ecef"],
        ["border-top-color", "#4f46e5"],
        ["border-radius", "50%"],
        ["animation", "spin 0.8s linear infinite"],
        ["margin-bottom", "1rem"]
      ]))
    ]), toList([])),
    p(toList([
      styles(toList([["color", "#6c757d"], ["font-size", "1rem"]]))
    ]), toList([text3(progress_text)]))
  ]));
}
function chunk_pill(index5, current, comments) {
  let is_active = index5 === current;
  let has_comments = any(comments, (c) => {
    return c.chunk_index === index5;
  });
  let _block;
  if (is_active) {
    _block = "#4f46e5";
  } else {
    _block = "#e5e7eb";
  }
  let bg = _block;
  return button(toList([
    on_click(new GoToChunk(index5)),
    styles(toList([
      ["width", "1.25rem"],
      ["height", "1.25rem"],
      ["border-radius", "50%"],
      ["border", "none"],
      ["background", bg],
      ["cursor", "pointer"],
      ["position", "relative"],
      ["padding", "0"],
      ["transition", "background 0.15s"]
    ]))
  ]), (() => {
    if (has_comments) {
      return toList([
        span(toList([
          styles(toList([
            ["position", "absolute"],
            ["top", "-2px"],
            ["right", "-2px"],
            ["width", "8px"],
            ["height", "8px"],
            ["border-radius", "50%"],
            ["background", "#f59e0b"],
            ["border", "1.5px solid white"]
          ]))
        ]), toList([]))
      ]);
    } else {
      return toList([]);
    }
  })());
}
function nav_button(label2, msg, enabled) {
  return button(toList([
    on_click(msg),
    disabled(!enabled),
    styles(toList([
      ["padding", "0.375rem 0.875rem"],
      [
        "background",
        (() => {
          if (enabled) {
            return "#4f46e5";
          } else {
            return "#d1d5db";
          }
        })()
      ],
      [
        "color",
        (() => {
          if (enabled) {
            return "white";
          } else {
            return "#9ca3af";
          }
        })()
      ],
      ["border", "none"],
      ["border-radius", "6px"],
      [
        "cursor",
        (() => {
          if (enabled) {
            return "pointer";
          } else {
            return "not-allowed";
          }
        })()
      ],
      ["font-size", "0.8125rem"],
      ["font-weight", "500"],
      ["transition", "background 0.15s"]
    ]))
  ]), toList([text3(label2)]));
}
function parse_hunk_new_start(header) {
  let $ = split2(header, "+");
  if ($ instanceof Empty) {
    return 1;
  } else {
    let $1 = $.tail;
    if ($1 instanceof Empty) {
      return 1;
    } else {
      let after_plus = $1.head;
      let $2 = split2(after_plus, ",");
      if ($2 instanceof Empty) {
        return 1;
      } else {
        let num_str = $2.head;
        let $3 = parse_int(num_str);
        if ($3 instanceof Ok) {
          let n = $3[0];
          return n;
        } else {
          return 1;
        }
      }
    }
  }
}
function index_file_lines_acc(loop$lines, loop$display_idx, loop$current_file_line, loop$acc) {
  while (true) {
    let lines = loop$lines;
    let display_idx = loop$display_idx;
    let current_file_line = loop$current_file_line;
    let acc = loop$acc;
    if (lines instanceof Empty) {
      return acc;
    } else {
      let line = lines.head;
      let rest = lines.tail;
      let $ = starts_with(line, "@@");
      if ($) {
        let new_line = parse_hunk_new_start(line);
        let entry = new DiffLineEntry(display_idx, 0, line);
        loop$lines = rest;
        loop$display_idx = display_idx + 1;
        loop$current_file_line = new_line;
        loop$acc = prepend(entry, acc);
      } else {
        let $1 = starts_with(line, "-");
        if ($1) {
          let entry = new DiffLineEntry(display_idx, current_file_line, line);
          loop$lines = rest;
          loop$display_idx = display_idx + 1;
          loop$current_file_line = current_file_line;
          loop$acc = prepend(entry, acc);
        } else {
          let entry = new DiffLineEntry(display_idx, current_file_line, line);
          loop$lines = rest;
          loop$display_idx = display_idx + 1;
          loop$current_file_line = current_file_line + 1;
          loop$acc = prepend(entry, acc);
        }
      }
    }
  }
}
function index_with_file_lines(lines) {
  let _pipe = index_file_lines_acc(lines, 1, 0, toList([]));
  return reverse(_pipe);
}
function make_range(from3, to) {
  let $ = from3 > to;
  if ($) {
    return toList([]);
  } else {
    return prepend(from3, make_range(from3 + 1, to));
  }
}
function chunk_navigator(current, total, comments) {
  return div(toList([
    styles(toList([
      ["display", "flex"],
      ["align-items", "center"],
      ["gap", "0.75rem"],
      ["flex-wrap", "wrap"]
    ]))
  ]), toList([
    nav_button("Prev", new PrevChunk, current > 0),
    span(toList([
      styles(toList([
        ["font-size", "0.875rem"],
        ["color", "#6b7280"],
        ["font-weight", "500"],
        ["min-width", "6rem"],
        ["text-align", "center"]
      ]))
    ]), toList([
      text3("Chunk " + to_string(current + 1) + " of " + to_string(total))
    ])),
    nav_button("Next", new NextChunk, current < total - 1),
    div(toList([
      styles(toList([
        ["display", "flex"],
        ["gap", "0.375rem"],
        ["margin-left", "0.5rem"],
        ["flex-wrap", "wrap"]
      ]))
    ]), (() => {
      let _pipe = make_range(0, total - 1);
      return map2(_pipe, (i) => {
        return chunk_pill(i, current, comments);
      });
    })())
  ]));
}
function summary_panel(summary, current, total, comments) {
  return div(toList([
    styles(toList([
      ["background", "#ffffff"],
      ["border", "1px solid #e2e8f0"],
      ["border-radius", "12px"],
      ["padding", "1.25rem 1.5rem"],
      ["margin-bottom", "1.25rem"]
    ]))
  ]), toList([
    h2(toList([
      styles(toList([
        ["margin", "0 0 0.75rem 0"],
        ["font-size", "1rem"],
        ["font-weight", "600"],
        ["color", "#374151"]
      ]))
    ]), toList([text3("AI Summary")])),
    p(toList([
      styles(toList([
        ["margin", "0 0 1rem 0"],
        ["color", "#4b5563"],
        ["line-height", "1.6"],
        ["font-size", "0.925rem"]
      ]))
    ]), toList([text3(summary)])),
    chunk_navigator(current, total, comments)
  ]));
}
function line_colors(line) {
  if (line.startsWith("+")) {
    return ["#dcfce7", "#22c55e"];
  } else if (line.startsWith("-")) {
    return ["#fee2e2", "#ef4444"];
  } else if (line.startsWith("@@")) {
    return ["#ede9fe", "#8b5cf6"];
  } else {
    return ["transparent", "transparent"];
  }
}
function diff_line_row(display_line, file_line, line, language) {
  let $ = line_colors(line);
  let bg;
  let border_color;
  bg = $[0];
  border_color = $[1];
  let _block;
  if (file_line === 0) {
    _block = "";
  } else {
    let n = file_line;
    _block = to_string(n);
  }
  let gutter_text = _block;
  let _block$1;
  let $2 = starts_with(line, "@@");
  if ($2) {
    _block$1 = ["", ""];
  } else {
    let $3 = first2(line);
    if ($3 instanceof Ok) {
      let $4 = $3[0];
      if ($4 === "+") {
        _block$1 = ["+", drop_start(line, 1)];
      } else if ($4 === "-") {
        _block$1 = ["-", drop_start(line, 1)];
      } else if ($4 === " ") {
        _block$1 = [" ", drop_start(line, 1)];
      } else {
        _block$1 = ["", line];
      }
    } else {
      _block$1 = ["", line];
    }
  }
  let $1 = _block$1;
  let marker;
  let code2;
  marker = $1[0];
  code2 = $1[1];
  let is_hunk_header = starts_with(line, "@@");
  return div(toList([
    on_click(new StartComment(display_line, file_line)),
    styles(toList([
      ["display", "flex"],
      ["background", bg],
      ["border-left", "3px solid " + border_color],
      ["cursor", "pointer"],
      ["transition", "filter 0.1s"]
    ]))
  ]), toList([
    span(toList([
      styles(toList([
        ["display", "inline-block"],
        ["min-width", "3.5rem"],
        ["padding", "0 0.5rem"],
        ["text-align", "right"],
        ["color", "#9ca3af"],
        ["user-select", "none"],
        [
          "background",
          (() => {
            if (bg === "transparent") {
              return "#fafafa";
            } else {
              return "rgba(0,0,0,0.03)";
            }
          })()
        ],
        ["border-right", "1px solid #e5e7eb"],
        ["flex-shrink", "0"]
      ]))
    ]), toList([text3(gutter_text)])),
    (() => {
      if (is_hunk_header) {
        return span(toList([
          styles(toList([
            ["padding", "0 0.75rem"],
            ["white-space", "pre"],
            ["flex", "1"]
          ]))
        ]), toList([text3(line)]));
      } else {
        let highlighted_html = highlight_line(code2, language);
        return span(toList([
          styles(toList([
            ["padding", "0 0.75rem"],
            ["white-space", "pre"],
            ["flex", "1"],
            ["display", "flex"]
          ]))
        ]), toList([
          span(toList([]), toList([text3(marker)])),
          unsafe_raw_html("", "span", toList([]), highlighted_html)
        ]));
      }
    })()
  ]));
}
function comment_display(comment) {
  return div(toList([
    styles(toList([
      ["background", "#fef9c3"],
      ["border-left", "3px solid #f59e0b"],
      ["padding", "0.5rem 0.75rem 0.5rem 4.25rem"],
      ["font-family", "system-ui, -apple-system, sans-serif"],
      ["font-size", "0.8125rem"],
      ["color", "#92400e"],
      ["line-height", "1.4"]
    ]))
  ]), toList([text3(comment.body)]));
}
function comment_input(text4, posting_comment) {
  let _block;
  if (posting_comment) {
    _block = "Posting...";
  } else {
    _block = "Comment";
  }
  let button_text = _block;
  return div(toList([
    styles(toList([
      ["padding", "0.75rem 0.75rem 0.75rem 4.25rem"],
      ["background", "#fffbeb"],
      ["border-left", "3px solid #fbbf24"],
      ["display", "flex"],
      ["gap", "0.5rem"],
      ["align-items", "flex-start"]
    ]))
  ]), toList([
    textarea(toList([
      styles(toList([
        ["flex", "1"],
        ["min-height", "3rem"],
        ["padding", "0.5rem"],
        ["border", "1px solid #d1d5db"],
        ["border-radius", "6px"],
        ["font-family", "system-ui, -apple-system, sans-serif"],
        ["font-size", "0.8125rem"],
        ["resize", "vertical"],
        ["outline", "none"]
      ])),
      placeholder("Add a comment..."),
      value(text4),
      on_input((var0) => {
        return new UpdateCommentText(var0);
      })
    ]), ""),
    div(toList([
      styles(toList([
        ["display", "flex"],
        ["flex-direction", "column"],
        ["gap", "0.375rem"]
      ]))
    ]), toList([
      button(toList([
        on_click(new SubmitComment),
        disabled(posting_comment),
        styles(toList([
          ["padding", "0.375rem 0.75rem"],
          [
            "background",
            (() => {
              if (posting_comment) {
                return "#9ca3af";
              } else {
                return "#4f46e5";
              }
            })()
          ],
          ["color", "white"],
          ["border", "none"],
          ["border-radius", "5px"],
          [
            "cursor",
            (() => {
              if (posting_comment) {
                return "not-allowed";
              } else {
                return "pointer";
              }
            })()
          ],
          ["font-size", "0.75rem"],
          ["font-weight", "500"]
        ]))
      ]), toList([text3(button_text)])),
      button(toList([
        on_click(new CancelComment),
        styles(toList([
          ["padding", "0.375rem 0.75rem"],
          ["background", "#e5e7eb"],
          ["color", "#374151"],
          ["border", "none"],
          ["border-radius", "5px"],
          ["cursor", "pointer"],
          ["font-size", "0.75rem"],
          ["font-weight", "500"]
        ]))
      ]), toList([text3("Cancel")]))
    ]))
  ]));
}
function github_comment_display(comment) {
  return div(toList([
    styles(toList([
      ["background", "#dbeafe"],
      ["border-left", "3px solid #3b82f6"],
      ["padding", "0.5rem 0.75rem 0.5rem 4.25rem"],
      ["font-family", "system-ui, -apple-system, sans-serif"],
      ["font-size", "0.8125rem"],
      ["color", "#1e40af"],
      ["line-height", "1.4"]
    ]))
  ]), toList([
    div(toList([
      styles(toList([
        ["display", "flex"],
        ["justify-content", "space-between"],
        ["margin-bottom", "0.25rem"],
        ["font-size", "0.75rem"],
        ["color", "#6b7280"]
      ]))
    ]), toList([
      span(toList([styles(toList([["font-weight", "600"]]))]), toList([text3(comment.author)])),
      span(toList([]), toList([text3(comment.created_at)]))
    ])),
    div(toList([]), render(comment.body))
  ]));
}
function diff_view(chunk, commenting, chunk_comments, chunk_github_comments) {
  let lines = split2(chunk.diff_content, `
`);
  let file_indexed_lines = index_with_file_lines(lines);
  let language = detect_language(chunk.file_path);
  let _block;
  if (commenting instanceof NotCommenting) {
    _block = new None;
  } else if (commenting instanceof Commenting) {
    let dl = commenting.display_line;
    _block = new Some(dl);
  } else {
    let dl = commenting.display_line;
    _block = new Some(dl);
  }
  let commenting_display_line = _block;
  let _block$1;
  if (commenting instanceof NotCommenting) {
    _block$1 = "";
  } else if (commenting instanceof Commenting) {
    let text4 = commenting.text;
    _block$1 = text4;
  } else {
    let text4 = commenting.text;
    _block$1 = text4;
  }
  let comment_text = _block$1;
  let _block$2;
  if (commenting instanceof NotCommenting) {
    _block$2 = false;
  } else if (commenting instanceof Commenting) {
    _block$2 = false;
  } else {
    _block$2 = true;
  }
  let is_posting = _block$2;
  return div(toList([
    styles(toList([
      ["overflow-x", "auto"],
      ["font-family", '"SF Mono", "Fira Code", "Consolas", monospace'],
      ["font-size", "0.8125rem"],
      ["line-height", "1.5"]
    ]))
  ]), flat_map(file_indexed_lines, (entry) => {
    let line_comments = filter(chunk_comments, (c) => {
      return c.line_number === entry.display_line;
    });
    let line_github_comments = filter(chunk_github_comments, (c) => {
      return c.line === entry.file_line;
    });
    let is_commenting = isEqual(commenting_display_line, new Some(entry.display_line));
    return flatten(toList([
      toList([
        diff_line_row(entry.display_line, entry.file_line, entry.text, language)
      ]),
      map2(line_github_comments, (c) => {
        return github_comment_display(c);
      }),
      map2(line_comments, (c) => {
        return comment_display(c);
      }),
      (() => {
        if (is_commenting) {
          return toList([comment_input(comment_text, is_posting)]);
        } else {
          return toList([]);
        }
      })()
    ]));
  }));
}
function chunk_panel(chunk, pr_url, commenting, comments, github_comments) {
  let chunk_comments = filter(comments, (c) => {
    return c.chunk_index === chunk.index;
  });
  let chunk_github_comments = filter(github_comments, (c) => {
    return contains_string(chunk.file_path, c.path) && c.path !== "";
  });
  return div(toList([
    styles(toList([
      ["background", "#ffffff"],
      ["border", "1px solid #e2e8f0"],
      ["border-radius", "12px"],
      ["margin-bottom", "1.25rem"],
      ["overflow", "hidden"]
    ]))
  ]), toList([
    div(toList([
      styles(toList([
        ["padding", "1rem 1.5rem"],
        ["border-bottom", "1px solid #e2e8f0"]
      ]))
    ]), toList([
      h3(toList([
        styles(toList([
          ["margin", "0 0 0.375rem 0"],
          ["font-size", "1.05rem"],
          ["font-weight", "600"],
          ["color", "#1e293b"]
        ]))
      ]), toList([text3(chunk.title)])),
      div(toList([
        styles(toList([
          ["background", "#eff6ff"],
          ["border", "1px solid #bfdbfe"],
          ["border-radius", "8px"],
          ["padding", "0.75rem 1rem"],
          ["margin-top", "0.5rem"],
          ["font-size", "0.875rem"],
          ["line-height", "1.5"],
          ["color", "#374151"]
        ]))
      ]), toList([text3(chunk.description)]))
    ])),
    div(toList([
      styles(toList([
        ["padding", "0.625rem 1.5rem"],
        ["background", "#f8fafc"],
        ["border-bottom", "1px solid #e2e8f0"],
        [
          "font-family",
          '"SF Mono", "Fira Code", "Consolas", monospace'
        ],
        ["font-size", "0.8125rem"],
        ["color", "#6b7280"],
        ["display", "flex"],
        ["align-items", "center"],
        ["gap", "0.5rem"]
      ]))
    ]), toList([
      text3(chunk.file_path),
      a(toList([
        href(pr_url + "/files"),
        target("_blank"),
        title("View files on GitHub"),
        styles(toList([
          ["color", "#9ca3af"],
          ["text-decoration", "none"],
          ["font-size", "0.875rem"],
          ["display", "inline-flex"],
          ["align-items", "center"],
          ["line-height", "1"]
        ]))
      ]), toList([
        span(toList([class$("material-symbols-outlined")]), toList([text3("open_in_new")]))
      ]))
    ])),
    diff_view(chunk, commenting, chunk_comments, chunk_github_comments)
  ]));
}
function general_comments_section(github_comments) {
  let general_comments = filter(github_comments, (c) => {
    return c.path === "";
  });
  if (general_comments instanceof Empty) {
    return text3("");
  } else {
    return div(toList([
      styles(toList([
        ["background", "#ffffff"],
        ["border", "1px solid #e2e8f0"],
        ["border-radius", "12px"],
        ["padding", "1.25rem 1.5rem"],
        ["margin-top", "1.25rem"]
      ]))
    ]), toList([
      h2(toList([
        styles(toList([
          ["margin", "0 0 0.75rem 0"],
          ["font-size", "1rem"],
          ["font-weight", "600"],
          ["color", "#374151"]
        ]))
      ]), toList([text3("Comments")])),
      div(toList([]), map2(general_comments, (comment) => {
        return div(toList([
          styles(toList([
            ["background", "#dbeafe"],
            ["border-left", "3px solid #3b82f6"],
            ["padding", "0.75rem 1rem"],
            ["margin-bottom", "0.5rem"],
            ["border-radius", "0 8px 8px 0"],
            ["font-size", "0.875rem"],
            ["color", "#1e40af"],
            ["line-height", "1.5"]
          ]))
        ]), toList([
          div(toList([
            styles(toList([
              ["display", "flex"],
              ["justify-content", "space-between"],
              ["margin-bottom", "0.375rem"],
              ["font-size", "0.75rem"],
              ["color", "#6b7280"]
            ]))
          ]), toList([
            span(toList([
              styles(toList([["font-weight", "600"]]))
            ]), toList([text3(comment.author)])),
            span(toList([]), toList([text3(comment.created_at)]))
          ])),
          div(toList([]), render(comment.body))
        ]));
      }))
    ]));
  }
}
function bottom_navigation(current, total) {
  return div(toList([
    styles(toList([
      ["display", "flex"],
      ["justify-content", "center"],
      ["align-items", "center"],
      ["gap", "1rem"],
      ["padding", "1rem 0"]
    ]))
  ]), toList([
    nav_button("Previous Chunk", new PrevChunk, current > 0),
    span(toList([
      styles(toList([["font-size", "0.875rem"], ["color", "#6b7280"]]))
    ]), toList([
      text3(to_string(current + 1) + " / " + to_string(total))
    ])),
    nav_button("Next Chunk", new NextChunk, current < total - 1)
  ]));
}
function review_action_button(label2, event_type, bg_color, _, submitting) {
  return button(toList([
    on_click(new SubmitReview(event_type)),
    disabled(submitting),
    styles(toList([
      ["padding", "0.5rem 1.25rem"],
      [
        "background",
        (() => {
          if (submitting) {
            return "#9ca3af";
          } else {
            return bg_color;
          }
        })()
      ],
      ["color", "white"],
      ["border", "none"],
      ["border-radius", "6px"],
      [
        "cursor",
        (() => {
          if (submitting) {
            return "not-allowed";
          } else {
            return "pointer";
          }
        })()
      ],
      ["font-size", "0.875rem"],
      ["font-weight", "500"],
      ["transition", "background 0.15s"]
    ]))
  ]), toList([
    text3((() => {
      if (submitting) {
        return "Submitting...";
      } else {
        return label2;
      }
    })())
  ]));
}
function review_submission_section(review) {
  let _block;
  if (review instanceof ReviewIdle) {
    let body = review.body;
    _block = body;
  } else {
    let body = review.body;
    _block = body;
  }
  let review_body = _block;
  let _block$1;
  if (review instanceof ReviewIdle) {
    _block$1 = false;
  } else {
    _block$1 = true;
  }
  let submitting = _block$1;
  return div(toList([
    styles(toList([
      ["background", "#ffffff"],
      ["border", "1px solid #e2e8f0"],
      ["border-radius", "12px"],
      ["padding", "1.25rem 1.5rem"],
      ["margin-top", "1.5rem"]
    ]))
  ]), toList([
    h2(toList([
      styles(toList([
        ["margin", "0 0 0.75rem 0"],
        ["font-size", "1rem"],
        ["font-weight", "600"],
        ["color", "#374151"]
      ]))
    ]), toList([text3("Submit Review")])),
    textarea(toList([
      styles(toList([
        ["width", "100%"],
        ["min-height", "4rem"],
        ["padding", "0.625rem"],
        ["border", "1px solid #d1d5db"],
        ["border-radius", "8px"],
        ["font-family", "system-ui, -apple-system, sans-serif"],
        ["font-size", "0.875rem"],
        ["resize", "vertical"],
        ["outline", "none"],
        ["box-sizing", "border-box"],
        ["margin-bottom", "0.75rem"]
      ])),
      placeholder("Leave a comment with your review (optional for approvals)..."),
      value(review_body),
      on_input((var0) => {
        return new SetReviewBody(var0);
      })
    ]), ""),
    div(toList([
      styles(toList([
        ["display", "flex"],
        ["gap", "0.5rem"],
        ["flex-wrap", "wrap"]
      ]))
    ]), toList([
      review_action_button("Approve", "APPROVE", "#16a34a", "#15803d", submitting),
      review_action_button("Request Changes", "REQUEST_CHANGES", "#ea580c", "#c2410c", submitting),
      review_action_button("Comment", "COMMENT", "#4f46e5", "#4338ca", submitting)
    ]))
  ]));
}
function analysis_view(analysis, pr_url, model) {
  let chunk_count = length(analysis.chunks);
  let current = model.current_chunk;
  let _block;
  let _pipe = drop(analysis.chunks, current);
  _block = first(_pipe);
  let maybe_chunk = _block;
  return div(toList([]), toList([
    summary_panel(analysis.summary, current, chunk_count, model.comments),
    (() => {
      if (maybe_chunk instanceof Ok) {
        let chunk = maybe_chunk[0];
        return chunk_panel(chunk, pr_url, model.commenting, model.comments, model.github_comments);
      } else {
        return p(toList([]), toList([text3("No chunks available.")]));
      }
    })(),
    bottom_navigation(current, chunk_count),
    review_submission_section(model.review)
  ]));
}
function view3(model) {
  let $ = model.selected_pr;
  if ($ instanceof Some) {
    let detail = $[0];
    return div(toList([
      styles(toList([
        ["max-width", "1100px"],
        ["margin", "0 auto"],
        ["padding", "2rem"],
        ["font-family", "system-ui, -apple-system, sans-serif"],
        ["color", "#1a1a2e"]
      ]))
    ]), toList([
      header_area(detail.title, detail.number, detail.url, detail.head_branch, model),
      description_accordion(detail.body, model.description_open),
      (() => {
        let $1 = model.error;
        if ($1 instanceof Some) {
          let err = $1[0];
          return error_banner2(err);
        } else {
          return text3("");
        }
      })(),
      general_comments_section(model.github_comments),
      (() => {
        let $1 = model.analysis_state;
        if ($1 instanceof NotAnalyzed) {
          let $2 = model.loading;
          if ($2) {
            return loading_indicator2(0);
          } else {
            return analyze_prompt();
          }
        } else if ($1 instanceof Analyzing) {
          let heartbeats = $1.heartbeats;
          return loading_indicator2(heartbeats);
        } else {
          let analysis = $1.result;
          return analysis_view(analysis, detail.url, model);
        }
      })()
    ]));
  } else {
    let $1 = model.loading;
    if ($1) {
      return div(toList([
        styles(toList([
          ["max-width", "1100px"],
          ["margin", "0 auto"],
          ["padding", "2rem"],
          ["font-family", "system-ui, -apple-system, sans-serif"]
        ]))
      ]), toList([loading_indicator2(0)]));
    } else {
      return div(toList([]), toList([text3("No PR selected."), back_button()]));
    }
  }
}

// build/dev/javascript/client/client.mjs
var FILEPATH7 = "src/client.gleam";

class DashboardRoute extends CustomType {
}

class PrRoute extends CustomType {
  constructor($0) {
    super();
    this[0] = $0;
  }
}
function format_error(err) {
  if (err instanceof BadBody) {
    return "Bad response body";
  } else if (err instanceof BadUrl) {
    let url = err[0];
    return "Bad URL: " + url;
  } else if (err instanceof HttpError) {
    let response = err[0];
    return "Server error (" + to_string(response.status) + "): " + response.body;
  } else if (err instanceof JsonError) {
    return "Failed to parse server response";
  } else if (err instanceof NetworkError2) {
    return "Network error — is the server running?";
  } else {
    let response = err[0];
    return "Unexpected response (" + to_string(response.status) + ")";
  }
}
function reset_pr_state(model) {
  return new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, new NotAnalyzed, 0, toList([]), new NotCommenting, toList([]), model.description_open, new ReviewIdle(""));
}
function parse_route(uri) {
  let path = uri.path;
  let _block;
  let _pipe = path;
  let _pipe$1 = split2(_pipe, "/");
  _block = filter(_pipe$1, (s) => {
    return s !== "";
  });
  let segments = _block;
  if (segments instanceof Empty) {
    return new DashboardRoute;
  } else {
    let $ = segments.tail;
    if ($ instanceof Empty) {
      return new DashboardRoute;
    } else {
      let $1 = $.tail;
      if ($1 instanceof Empty) {
        let $2 = segments.head;
        if ($2 === "pr") {
          let number_str = $.head;
          let $3 = parse_int(number_str);
          if ($3 instanceof Ok) {
            let number = $3[0];
            return new PrRoute(number);
          } else {
            return new DashboardRoute;
          }
        } else {
          return new DashboardRoute;
        }
      } else {
        return new DashboardRoute;
      }
    }
  }
}
function init2(_) {
  let default_repo = "GC-AI-Inc/app-gc-ai";
  let _block;
  let $1 = do_initial_uri();
  if ($1 instanceof Ok) {
    let uri = $1[0];
    let $2 = parse_route(uri);
    if ($2 instanceof DashboardRoute) {
      _block = [new Dashboard, true, fetch_prs(default_repo)];
    } else {
      let number = $2[0];
      _block = [
        new PrReview,
        true,
        batch(toList([
          fetch_prs(default_repo),
          fetch_pr_detail(default_repo, number)
        ]))
      ];
    }
  } else {
    _block = [new Dashboard, true, fetch_prs(default_repo)];
  }
  let $ = _block;
  let initial_view;
  let initial_loading;
  let initial_effect;
  initial_view = $[0];
  initial_loading = $[1];
  initial_effect = $[2];
  return [
    new Model(toList([default_repo]), default_repo, new None, new None, initial_loading, initial_view, new None, new NotAnalyzed, 0, toList([]), new NotCommenting, toList([]), false, new ReviewIdle("")),
    batch(toList([
      init((var0) => {
        return new UrlChanged(var0);
      }),
      initial_effect,
      start_auto_refresh()
    ]))
  ];
}
function update2(model, msg) {
  if (msg instanceof GotPrs) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let groups = $[0];
      return [
        new Model(model.repos, model.active_repo, new Some(groups), model.selected_pr, false, model.view, new None, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    } else {
      let err = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new Some(format_error(err)), model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof GotPrDetail) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let detail = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, new Some(detail), true, model.view, new None, new Analyzing(0), model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        batch(toList([
          fetch_github_comments(model.active_repo, detail.number),
          analyze_pr_stream(model.active_repo, detail.number)
        ]))
      ];
    } else {
      let err = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new Some(format_error(err)), model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof SelectPr) {
    let number = msg[0];
    let new_model = reset_pr_state(model);
    return [
      new Model(new_model.repos, new_model.active_repo, new_model.pr_groups, new_model.selected_pr, true, new PrReview, new None, new_model.analysis_state, new_model.current_chunk, new_model.comments, new_model.commenting, new_model.github_comments, new_model.description_open, new_model.review),
      batch(toList([
        push_url("/pr/" + to_string(number)),
        fetch_pr_detail(model.active_repo, number)
      ]))
    ];
  } else if (msg instanceof SetRepo) {
    let repo = msg[0];
    return [
      new Model(model.repos, repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof BackToDashboard) {
    let new_model = reset_pr_state(model);
    return [
      new Model(new_model.repos, new_model.active_repo, new_model.pr_groups, new None, new_model.loading, new Dashboard, new None, new_model.analysis_state, new_model.current_chunk, new_model.comments, new_model.commenting, new_model.github_comments, new_model.description_open, new_model.review),
      push_url("/")
    ];
  } else if (msg instanceof FetchPrs) {
    return [
      new Model(model.repos, model.active_repo, new None, model.selected_pr, true, model.view, new None, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
      fetch_prs(model.active_repo)
    ];
  } else if (msg instanceof AnalyzePr) {
    let $ = model.selected_pr;
    if ($ instanceof Some) {
      let detail = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, true, model.view, new None, new Analyzing(0), model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        analyze_pr_stream(model.active_repo, detail.number)
      ];
    } else {
      return [model, none()];
    }
  } else if (msg instanceof GotAnalysis) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let analysis = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new None, new Analyzed(analysis), 0, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    } else {
      let err = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new Some(format_error(err)), model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof SseAnalysisComplete) {
    let data2 = msg[0];
    let $ = parse(data2, analysis_result_decoder());
    if ($ instanceof Ok) {
      let analysis = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new None, new Analyzed(analysis), 0, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    } else {
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new Some("Failed to parse analysis response"), new NotAnalyzed, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof SseAnalysisError) {
    let data2 = msg[0];
    let _block;
    let $ = parse(data2, field("error", string2, (error) => {
      return success(error);
    }));
    if ($ instanceof Ok) {
      let msg$1 = $[0];
      _block = msg$1;
    } else {
      _block = data2;
    }
    let error_msg = _block;
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new Some("Analysis failed: " + error_msg), new NotAnalyzed, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof SseHeartbeat) {
    let $ = model.analysis_state;
    if ($ instanceof Analyzing) {
      let n = $.heartbeats;
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, new Analyzing(n + 1), model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    } else {
      return [model, none()];
    }
  } else if (msg instanceof SseConnectionError) {
    let msg$1 = msg[0];
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, false, model.view, new Some("Connection error: " + msg$1), new NotAnalyzed, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof NextChunk) {
    let _block;
    let $ = model.analysis_state;
    if ($ instanceof NotAnalyzed) {
      _block = 0;
    } else if ($ instanceof Analyzing) {
      _block = 0;
    } else {
      let analysis = $.result;
      _block = length(analysis.chunks) - 1;
    }
    let max2 = _block;
    let _block$1;
    let $1 = model.current_chunk < max2;
    if ($1) {
      _block$1 = model.current_chunk + 1;
    } else {
      _block$1 = model.current_chunk;
    }
    let next = _block$1;
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, next, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof PrevChunk) {
    let _block;
    let $ = model.current_chunk > 0;
    if ($) {
      _block = model.current_chunk - 1;
    } else {
      _block = 0;
    }
    let prev = _block;
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, prev, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof GoToChunk) {
    let n = msg[0];
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, n, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof StartComment) {
    let display_line = msg[0];
    let file_line = msg[1];
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, new Commenting(display_line, file_line, ""), model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof CancelComment) {
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof UpdateCommentText) {
    let text4 = msg[0];
    let $ = model.commenting;
    if ($ instanceof NotCommenting) {
      return [model, none()];
    } else if ($ instanceof Commenting) {
      let dl = $.display_line;
      let fl = $.file_line;
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, new Commenting(dl, fl, text4), model.github_comments, model.description_open, model.review),
        none()
      ];
    } else {
      let dl = $.display_line;
      let fl = $.file_line;
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, new PostingComment(dl, fl, text4), model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof SubmitComment) {
    let $ = model.commenting;
    let $1 = model.selected_pr;
    let $2 = model.analysis_state;
    if ($1 instanceof Some && $ instanceof Commenting) {
      if ($2 instanceof Analyzed) {
        let detail = $1[0];
        let display_line = $.display_line;
        let file_line = $.file_line;
        let text4 = $.text;
        let analysis = $2.result;
        let comment = new LineComment(model.current_chunk, display_line, text4);
        let _block;
        let $3 = (() => {
          let _pipe = drop(analysis.chunks, model.current_chunk);
          return first(_pipe);
        })();
        if ($3 instanceof Ok) {
          let chunk = $3[0];
          let $4 = split_once(chunk.file_path, " (+");
          if ($4 instanceof Ok) {
            let path = $4[0][0];
            _block = path;
          } else {
            _block = chunk.file_path;
          }
        } else {
          _block = "";
        }
        let file_path = _block;
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, prepend(comment, model.comments), new PostingComment(display_line, file_line, text4), model.github_comments, model.description_open, model.review),
          post_github_comment(model.active_repo, detail.number, text4, file_path, file_line)
        ];
      } else {
        let display_line = $.display_line;
        let text4 = $.text;
        let comment = new LineComment(model.current_chunk, display_line, text4);
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, prepend(comment, model.comments), new NotCommenting, model.github_comments, model.description_open, model.review),
          none()
        ];
      }
    } else {
      return [model, none()];
    }
  } else if (msg instanceof GotGithubComments) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let comments = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, model.commenting, comments, model.description_open, model.review),
        none()
      ];
    } else {
      let err = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, new Some(format_error(err)), model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof CommentPosted) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let $1 = model.selected_pr;
      if ($1 instanceof Some) {
        let detail = $1[0];
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
          fetch_github_comments(model.active_repo, detail.number)
        ];
      } else {
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
          none()
        ];
      }
    } else {
      let err = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, new Some(format_error(err)), model.analysis_state, model.current_chunk, model.comments, new NotCommenting, model.github_comments, model.description_open, model.review),
        none()
      ];
    }
  } else if (msg instanceof UrlChanged) {
    let uri = msg[0];
    let $ = parse_route(uri);
    if ($ instanceof DashboardRoute) {
      let $1 = model.view;
      if ($1 instanceof Dashboard) {
        return [model, none()];
      } else {
        let new_model = reset_pr_state(model);
        return [
          new Model(new_model.repos, new_model.active_repo, new_model.pr_groups, new None, new_model.loading, new Dashboard, new None, new_model.analysis_state, new_model.current_chunk, new_model.comments, new_model.commenting, new_model.github_comments, new_model.description_open, new_model.review),
          none()
        ];
      }
    } else {
      let number = $[0];
      let $1 = model.view;
      if ($1 instanceof Dashboard) {
        let new_model = reset_pr_state(model);
        return [
          new Model(new_model.repos, new_model.active_repo, new_model.pr_groups, new_model.selected_pr, true, new PrReview, new None, new_model.analysis_state, new_model.current_chunk, new_model.comments, new_model.commenting, new_model.github_comments, new_model.description_open, new_model.review),
          fetch_pr_detail(model.active_repo, number)
        ];
      } else {
        let $2 = model.selected_pr;
        if ($2 instanceof Some) {
          let detail = $2[0];
          if (detail.number === number) {
            return [model, none()];
          } else {
            let new_model = reset_pr_state(model);
            return [
              new Model(new_model.repos, new_model.active_repo, new_model.pr_groups, new_model.selected_pr, true, new PrReview, new None, new_model.analysis_state, new_model.current_chunk, new_model.comments, new_model.commenting, new_model.github_comments, new_model.description_open, new_model.review),
              fetch_pr_detail(model.active_repo, number)
            ];
          }
        } else {
          let new_model = reset_pr_state(model);
          return [
            new Model(new_model.repos, new_model.active_repo, new_model.pr_groups, new_model.selected_pr, true, new PrReview, new None, new_model.analysis_state, new_model.current_chunk, new_model.comments, new_model.commenting, new_model.github_comments, new_model.description_open, new_model.review),
            fetch_pr_detail(model.active_repo, number)
          ];
        }
      }
    }
  } else if (msg instanceof ToggleDescription) {
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, !model.description_open, model.review),
      none()
    ];
  } else if (msg instanceof SubmitReview) {
    let event4 = msg[0];
    let $ = model.selected_pr;
    let $1 = model.review;
    if ($ instanceof Some) {
      if ($1 instanceof ReviewIdle) {
        let detail = $[0];
        let body = $1.body;
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, new None, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, new SubmittingReview(body)),
          submit_review(model.active_repo, detail.number, event4, body)
        ];
      } else {
        let detail = $[0];
        let body = $1.body;
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, new None, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, new SubmittingReview(body)),
          submit_review(model.active_repo, detail.number, event4, body)
        ];
      }
    } else {
      return [model, none()];
    }
  } else if (msg instanceof SetReviewBody) {
    let text4 = msg[0];
    return [
      new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, new ReviewIdle(text4)),
      none()
    ];
  } else if (msg instanceof ReviewSubmitted) {
    let $ = msg[0];
    if ($ instanceof Ok) {
      let $1 = model.selected_pr;
      if ($1 instanceof Some) {
        let detail = $1[0];
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, new None, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, new ReviewIdle("")),
          fetch_github_comments(model.active_repo, detail.number)
        ];
      } else {
        return [
          new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, model.error, model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, new ReviewIdle("")),
          none()
        ];
      }
    } else {
      let err = $[0];
      return [
        new Model(model.repos, model.active_repo, model.pr_groups, model.selected_pr, model.loading, model.view, new Some(format_error(err)), model.analysis_state, model.current_chunk, model.comments, model.commenting, model.github_comments, model.description_open, new ReviewIdle((() => {
          let $1 = model.review;
          if ($1 instanceof ReviewIdle) {
            let body = $1.body;
            return body;
          } else {
            let body = $1.body;
            return body;
          }
        })())),
        none()
      ];
    }
  } else {
    return [model, fetch_prs(model.active_repo)];
  }
}
function view4(model) {
  let $ = model.view;
  if ($ instanceof Dashboard) {
    return view2(model);
  } else {
    return view3(model);
  }
}
function main() {
  let app = application(init2, update2, view4);
  let $ = start4(app, "#app", undefined);
  if (!($ instanceof Ok)) {
    throw makeError("let_assert", FILEPATH7, "client", 30, "main", "Pattern match failed, no pattern matched the value.", { value: $, start: 984, end: 1033, pattern_start: 995, pattern_end: 1000 });
  }
  return;
}

// .lustre/build/client.mjs
main();
