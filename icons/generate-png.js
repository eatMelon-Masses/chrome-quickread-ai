// PNG icon generator for QuickRead AI.
// Uses a small built-in rasterizer so the repository does not need image tools.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const AA = 4;
const BASE = 128;

const colors = {
    blue: [26, 115, 232, 255],
    blueMid: [43, 125, 233, 255],
    teal: [20, 184, 166, 255],
    white: [255, 255, 255, 245],
    fold: [220, 235, 255, 255],
    yellow: [250, 204, 21, 255],
    shadow: [23, 78, 166, 54]
};

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function mixColor(a, b, t) {
    return [
        Math.round(lerp(a[0], b[0], t)),
        Math.round(lerp(a[1], b[1], t)),
        Math.round(lerp(a[2], b[2], t)),
        Math.round(lerp(a[3], b[3], t))
    ];
}

function backgroundColor(x, y) {
    const t = Math.max(0, Math.min(1, (x + y - 42) / 168));
    if (t < 0.58) {
        return mixColor(colors.blue, colors.blueMid, t / 0.58);
    }
    return mixColor(colors.blueMid, colors.teal, (t - 0.58) / 0.42);
}

function blend(data, index, color) {
    const sourceA = color[3] / 255;
    if (sourceA <= 0) {
        return;
    }

    const destA = data[index + 3] / 255;
    const outA = sourceA + destA * (1 - sourceA);
    if (outA <= 0) {
        return;
    }

    data[index] = Math.round((color[0] * sourceA + data[index] * destA * (1 - sourceA)) / outA);
    data[index + 1] = Math.round((color[1] * sourceA + data[index + 1] * destA * (1 - sourceA)) / outA);
    data[index + 2] = Math.round((color[2] * sourceA + data[index + 2] * destA * (1 - sourceA)) / outA);
    data[index + 3] = Math.round(outA * 255);
}

function pointInRoundedRect(x, y, rect) {
    const { left, top, right, bottom, radius } = rect;
    if (x < left || x > right || y < top || y > bottom) {
        return false;
    }

    const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x;
    const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y;
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= radius * radius;
}

function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const xi = points[i][0];
        const yi = points[i][1];
        const xj = points[j][0];
        const yj = points[j][1];
        const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
    const x = ax + t * dx;
    const y = ay + t * dy;
    return Math.hypot(px - x, py - y);
}

function createRenderer(size) {
    const hiSize = size * AA;
    const data = new Uint8ClampedArray(hiSize * hiSize * 4);

    function forEachPixel(draw) {
        for (let py = 0; py < hiSize; py += 1) {
            for (let px = 0; px < hiSize; px += 1) {
                const x = ((px + 0.5) / hiSize) * BASE;
                const y = ((py + 0.5) / hiSize) * BASE;
                const color = draw(x, y);
                if (color) {
                    blend(data, (py * hiSize + px) * 4, color);
                }
            }
        }
    }

    function roundedRect(rect, fill) {
        forEachPixel((x, y) => {
            if (!pointInRoundedRect(x, y, rect)) {
                return null;
            }
            return typeof fill === 'function' ? fill(x, y) : fill;
        });
    }

    function polygon(points, fill) {
        forEachPixel((x, y) => (pointInPolygon(x, y, points) ? fill : null));
    }

    function line(ax, ay, bx, by, width, fill) {
        forEachPixel((x, y) => (distanceToSegment(x, y, ax, ay, bx, by) <= width / 2 ? fill : null));
    }

    function downsample() {
        const out = Buffer.alloc(size * size * 4);
        const samples = AA * AA;

        for (let y = 0; y < size; y += 1) {
            for (let x = 0; x < size; x += 1) {
                const totals = [0, 0, 0, 0];
                for (let sy = 0; sy < AA; sy += 1) {
                    for (let sx = 0; sx < AA; sx += 1) {
                        const hiX = x * AA + sx;
                        const hiY = y * AA + sy;
                        const index = (hiY * hiSize + hiX) * 4;
                        totals[0] += data[index];
                        totals[1] += data[index + 1];
                        totals[2] += data[index + 2];
                        totals[3] += data[index + 3];
                    }
                }

                const outIndex = (y * size + x) * 4;
                out[outIndex] = Math.round(totals[0] / samples);
                out[outIndex + 1] = Math.round(totals[1] / samples);
                out[outIndex + 2] = Math.round(totals[2] / samples);
                out[outIndex + 3] = Math.round(totals[3] / samples);
            }
        }

        return out;
    }

    return {
        roundedRect,
        polygon,
        line,
        downsample
    };
}

function drawQuickReadIcon(size) {
    const renderer = createRenderer(size);

    renderer.roundedRect({ left: 18, top: 20, right: 110, bottom: 112, radius: 22 }, colors.shadow);
    renderer.roundedRect({ left: 16, top: 16, right: 112, bottom: 112, radius: 22 }, backgroundColor);

    renderer.polygon([
        [41, 29],
        [75, 29],
        [91, 45],
        [91, 91],
        [83, 99],
        [41, 99],
        [33, 91],
        [33, 37]
    ], colors.white);
    renderer.polygon([
        [75, 29],
        [75, 42],
        [83, 50],
        [91, 50]
    ], colors.fold);

    renderer.line(45, 56, 68, 56, 6, colors.blue);
    renderer.line(45, 70, 77, 70, 6, [26, 115, 232, 230]);
    renderer.line(45, 84, 62, 84, 6, colors.teal);

    renderer.polygon([
        [89, 68],
        [92.6, 78.4],
        [103, 82],
        [92.6, 85.6],
        [89, 96],
        [85.4, 85.6],
        [75, 82],
        [85.4, 78.4]
    ], colors.yellow);
    renderer.roundedRect({ left: 84.4, top: 77.4, right: 93.6, bottom: 86.6, radius: 4.6 }, [255, 255, 255, 255]);

    return renderer.downsample();
}

function crc32(buffer) {
    const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k += 1) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        return c >>> 0;
    }));

    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    const name = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([length, name, data, crc]);
}

function createPng(size, rgba, outputPath) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr.writeUInt8(8, 8);
    ihdr.writeUInt8(6, 9);
    ihdr.writeUInt8(0, 10);
    ihdr.writeUInt8(0, 11);
    ihdr.writeUInt8(0, 12);

    const scanlines = Buffer.alloc((size * 4 + 1) * size);
    for (let y = 0; y < size; y += 1) {
        const sourceStart = y * size * 4;
        const targetStart = y * (size * 4 + 1);
        scanlines[targetStart] = 0;
        rgba.copy(scanlines, targetStart + 1, sourceStart, sourceStart + size * 4);
    }

    const png = Buffer.concat([
        signature,
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ]);

    fs.writeFileSync(outputPath, png);
    console.log(`Created ${outputPath} (${png.length} bytes)`);
}

const iconsDir = __dirname;
for (const size of [16, 32, 48, 128]) {
    createPng(size, drawQuickReadIcon(size), path.join(iconsDir, `icon-${size}.png`));
}
