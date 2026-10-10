// Detect image dimensions (width, height in pixels) from raw image bytes
// containing PNG, JPEG, or GIF data. Used by the SOW Word and PDF exports
// to preserve the natural aspect ratio of client logos instead of forcing
// them into a square box (which distorted wide logos like 221×74).
//
// No external dependencies — the headers are parsed directly.

export interface ImageDimensions {
  width: number
  height: number
}

export function getImageDimensions(
  data: ArrayBuffer | Buffer | Uint8Array
): ImageDimensions | null {
  const bytes =
    data instanceof Uint8Array
      ? data
      : data instanceof Buffer
        ? new Uint8Array(data)
        : new Uint8Array(data)

  if (bytes.length < 10) return null

  // PNG — signature 89 50 4E 47 0D 0A 1A 0A; width at bytes 16-19, height 20-23 (big-endian)
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 &&
    bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    if (bytes.length < 24) return null
    const width =
      (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
    const height =
      (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
    return { width, height }
  }

  // JPEG — starts with FF D8; scan for SOF0 (C0), SOF1 (C1), SOF2 (C2) markers
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++
        continue
      }
      const marker = bytes[i + 1]
      // SOF markers contain height (2 bytes BE) and width (2 bytes BE) after a 1-byte precision field
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3) {
        const height = (bytes[i + 5] << 8) | bytes[i + 6]
        const width = (bytes[i + 7] << 8) | bytes[i + 8]
        return { width, height }
      }
      // RSTn / SOI / EOI markers have no length field
      if (marker >= 0xd0 && marker <= 0xd9) {
        i += 2
        continue
      }
      // Other markers: skip the segment using its 2-byte length
      const segLen = (bytes[i + 2] << 8) | bytes[i + 3]
      if (segLen < 2) return null
      i += 2 + segLen
    }
    return null
  }

  // GIF — signature 47 49 46 38 (GIF8); width at bytes 6-7, height 8-9 (little-endian)
  if (
    bytes[0] === 0x47 && bytes[1] === 0x49 &&
    bytes[2] === 0x46 && bytes[3] === 0x38
  ) {
    const width = bytes[6] | (bytes[7] << 8)
    const height = bytes[8] | (bytes[9] << 8)
    return { width, height }
  }

  // WebP — RIFF....WEBP; VP8/VP8L/VP8X chunks carry dimensions differently
  if (
    bytes.length >= 30 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 &&
    bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 &&
    bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    // VP8 lossy
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
      const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff
      const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff
      return { width, height }
    }
    // VP8L lossless
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4c) {
      const b0 = bytes[21]
      const b1 = bytes[22]
      const b2 = bytes[23]
      const b3 = bytes[24]
      const width = 1 + (((b1 & 0x3f) << 8) | b0)
      const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6))
      return { width, height }
    }
    // VP8X extended
    if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) {
      const width = 1 + ((bytes[24] << 16) | (bytes[23] << 8) | bytes[22])
      const height = 1 + ((bytes[27] << 16) | (bytes[26] << 8) | bytes[25])
      return { width, height }
    }
  }

  return null
}

// Compute scaled dimensions that fit within maxW × maxH while preserving
// the image's natural aspect ratio. Returns the exact pixel dimensions
// to pass to PDFKit's `doc.image(buf, x, y, { width, height })` or to
// docx's `ImageRun({ transformation: { width, height } })`.
export function fitImage(
  natural: ImageDimensions | null,
  maxW: number,
  maxH: number,
): ImageDimensions {
  if (!natural || !natural.width || !natural.height) {
    return { width: maxW, height: maxH }
  }
  const aspect = natural.width / natural.height
  // Try fitting by width first
  let w = maxW
  let h = maxW / aspect
  if (h > maxH) {
    // Height is the limiting dimension
    h = maxH
    w = maxH * aspect
  }
  return { width: Math.round(w), height: Math.round(h) }
}
