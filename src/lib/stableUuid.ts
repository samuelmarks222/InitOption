const UUID_V5_NAMESPACE = new Uint8Array([0x8f, 0x2d, 0x1a, 0x0e]);

const rotateLeft = (value: number, amount: number) =>
  ((value << amount) | (value >>> (32 - amount))) >>> 0;

const sha1 = (input: Uint8Array) => {
  const bitLength = input.length * 8;
  const paddedLength = (((input.length + 9 + 63) >> 6) << 6);
  const message = new Uint8Array(paddedLength);
  message.set(input);
  message[input.length] = 0x80;

  const view = new DataView(message.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < message.length; offset += 64) {
    const words = new Uint32Array(80);
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotateLeft(
        words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16],
        1,
      );
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let index = 0; index < 80; index += 1) {
      let functionValue: number;
      let constant: number;
      if (index < 20) {
        functionValue = (b & c) | (~b & d);
        constant = 0x5a827999;
      } else if (index < 40) {
        functionValue = b ^ c ^ d;
        constant = 0x6ed9eba1;
      } else if (index < 60) {
        functionValue = (b & c) | (b & d) | (c & d);
        constant = 0x8f1bbcdc;
      } else {
        functionValue = b ^ c ^ d;
        constant = 0xca62c1d6;
      }

      const next = (rotateLeft(a, 5) + functionValue + e + constant + words[index]) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = next;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4].flatMap((word) => [
    (word >>> 24) & 0xff,
    (word >>> 16) & 0xff,
    (word >>> 8) & 0xff,
    word & 0xff,
  ]);
};

export const stableUuidFromString = (value: string) => {
  const encodedValue = new TextEncoder().encode(value);
  const input = new Uint8Array(UUID_V5_NAMESPACE.length + encodedValue.length);
  input.set(UUID_V5_NAMESPACE);
  input.set(encodedValue, UUID_V5_NAMESPACE.length);

  const bytes = sha1(input).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};
