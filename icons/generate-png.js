// Simple PNG icon generator for QuickRead AI
// This generates minimal PNG files without external dependencies

const fs = require('fs');
const path = require('path');

// Create a simple PNG file with a solid color and letter
function createPNG(size, outputPath) {
    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // Helper to create CRC table
    const crcTable = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[i] = c;
    }

    function crc32(data) {
        let crc = 0xffffffff;
        for (let i = 0; i < data.length; i++) {
            crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    function createChunk(type, data) {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length);
        const typeBuffer = Buffer.from(type);
        const crcData = Buffer.concat([typeBuffer, data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(crcData));
        return Buffer.concat([length, typeBuffer, data, crc]);
    }

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size);        // width
    ihdrData.writeUInt32BE(size);        // height
    ihdrData.writeUInt8(8);              // bit depth
    ihdrData.writeUInt8(6);              // color type (RGBA)
    ihdrData.writeUInt8(0);              // compression method
    ihdrData.writeUInt8(0);              // filter method
    ihdrData.writeUInt8(0);              // interlace method

    // Create image data (gradient purple with white Q)
    const rawData = [];
    for (let y = 0; y < size; y++) {
        rawData.push(0); // filter byte
        for (let x = 0; x < size; x++) {
            // Create gradient color
            const t = (x + y) / (2 * size);
            const r = Math.round(102 + t * (118 - 102));
            const g = Math.round(126 + t * (75 - 126));
            const b = Math.round(234 + t * (162 - 234));

            // Simple "Q" shape detection
            const cx = size / 2;
            const cy = size / 2 + size * 0.05;
            const rx = size * 0.28;
            const ry = size * 0.28;
            const dist = Math.sqrt(Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2));

            // Q tail
            const tailX = cx + size * 0.15;
            const tailY = cy + size * 0.25;
            const tailDist = Math.sqrt(Math.pow(x - tailX, 2) + Math.pow(y - tailY, 2));

            let pixel;
            if (dist < 0.5 && dist > 0.35) {
                // Outer ring of Q
                pixel = Buffer.from([255, 255, 255, 255]);
            } else if (dist < 0.35) {
                // Inner part - gradient
                pixel = Buffer.from([r, g, b, 255]);
            } else if (tailDist < size * 0.08 && x > cx) {
                // Q tail
                pixel = Buffer.from([255, 255, 255, 255]);
            } else {
                // Background - gradient
                pixel = Buffer.from([r, g, b, 255]);
            }
            rawData.push(...pixel);
        }
    }

    // Compress with zlib (deflate)
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });

    // Create chunks
    const ihdr = createChunk('IHDR', ihdrData);
    const idat = createChunk('IDAT', compressed);
    const iend = createChunk('IEND', Buffer.alloc(0));

    // Combine all parts
    const png = Buffer.concat([signature, ihdr, idat, iend]);

    // Write file
    fs.writeFileSync(outputPath, png);
    console.log(`Created: ${outputPath} (${png.length} bytes)`);
}

// Generate all icons
const iconsDir = path.dirname(__filename);
createPNG(16, path.join(iconsDir, 'icon-16.png'));
createPNG(48, path.join(iconsDir, 'icon-48.png'));
createPNG(128, path.join(iconsDir, 'icon-128.png'));

console.log('\nAll icons generated successfully!');
