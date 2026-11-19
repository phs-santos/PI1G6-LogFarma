// Gerador de QR code (modo byte, correção M, versões 1 a 10) para o controle pelo celular.
// Segue a norma ISO/IEC 18004; baseado no algoritmo de referência de Project Nayuki (MIT).
// Uso: LogFarmaQR.svg("https://...", { dark: "#14275e", light: "#fbfcff" }) → texto SVG.
(function (global) {
    "use strict";

    // Por versão: [codewords de correção por bloco, [blocos curtos, dados por bloco curto], [blocos longos, dados]]
    const TABLE_M = [
        null,
        [10, [1, 16]],
        [16, [1, 28]],
        [26, [1, 44]],
        [18, [2, 32]],
        [24, [2, 43]],
        [16, [4, 27]],
        [18, [4, 31]],
        [22, [2, 38], [2, 39]],
        [22, [3, 36], [2, 37]],
        [26, [4, 43], [1, 44]],
    ];
    const ALIGN = [
        null,
        [],
        [6, 18],
        [6, 22],
        [6, 26],
        [6, 30],
        [6, 34],
        [6, 22, 38],
        [6, 24, 42],
        [6, 26, 46],
        [6, 28, 50],
    ];

    function dataCapacity(v) {
        const t = TABLE_M[v];
        return t[1][0] * t[1][1] + (t[2] ? t[2][0] * t[2][1] : 0);
    }

    // Aritmética no corpo GF(256) com polinômio 0x11D.
    function mul(x, y) {
        let z = 0;
        for (let i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11d);
            z ^= ((y >>> i) & 1) * x;
        }
        return z & 0xff;
    }
    function rsDivisor(degree) {
        const r = new Array(degree).fill(0);
        r[degree - 1] = 1;
        let root = 1;
        for (let i = 0; i < degree; i++) {
            for (let j = 0; j < r.length; j++) {
                r[j] = mul(r[j], root);
                if (j + 1 < r.length) r[j] ^= r[j + 1];
            }
            root = mul(root, 0x02);
        }
        return r;
    }
    function rsRemainder(data, divisor) {
        const r = new Array(divisor.length).fill(0);
        for (const b of data) {
            const factor = b ^ r.shift();
            r.push(0);
            divisor.forEach((c, i) => (r[i] ^= mul(c, factor)));
        }
        return r;
    }

    function encode(text) {
        const bytes = Array.from(new TextEncoder().encode(text));
        let version = 0;
        for (let v = 1; v <= 10; v++) {
            const countBits = v <= 9 ? 8 : 16;
            if (4 + countBits + bytes.length * 8 <= dataCapacity(v) * 8) {
                version = v;
                break;
            }
        }
        if (!version) throw new Error("Texto longo demais para o QR.");
        const countBits = version <= 9 ? 8 : 16;
        const capacityBits = dataCapacity(version) * 8;

        // Bits: modo byte (0100), tamanho, dados, terminador e enchimento.
        const bits = [];
        const push = (val, len) => {
            for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
        };
        push(0b0100, 4);
        push(bytes.length, countBits);
        bytes.forEach((b) => push(b, 8));
        push(0, Math.min(4, capacityBits - bits.length));
        push(0, (8 - (bits.length % 8)) % 8);
        for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) push(pad, 8);
        const data = [];
        for (let i = 0; i < bits.length; i += 8)
            data.push(parseInt(bits.slice(i, i + 8).join(""), 2));

        // Divide em blocos, calcula a correção (Reed-Solomon) e intercala.
        const [ecLen, ...groups] = TABLE_M[version];
        const divisor = rsDivisor(ecLen);
        const blocks = [];
        let k = 0;
        for (const [count, size] of groups) {
            for (let b = 0; b < count; b++) {
                const d = data.slice(k, k + size);
                k += size;
                blocks.push({ d, e: rsRemainder(d, divisor) });
            }
        }
        const codewords = [];
        const maxData = Math.max(...blocks.map((b) => b.d.length));
        for (let i = 0; i < maxData; i++)
            blocks.forEach((b) => i < b.d.length && codewords.push(b.d[i]));
        for (let i = 0; i < ecLen; i++) blocks.forEach((b) => codewords.push(b.e[i]));
        return { version, codewords };
    }

    function build(version, codewords, mask) {
        const size = version * 4 + 17;
        const m = Array.from({ length: size }, () => new Array(size).fill(false));
        const fn = Array.from({ length: size }, () => new Array(size).fill(false));
        const set = (x, y, dark) => {
            m[y][x] = dark;
            fn[y][x] = true;
        };
        for (let i = 0; i < size; i++) {
            set(6, i, i % 2 === 0);
            set(i, 6, i % 2 === 0);
        }
        const finder = (cx, cy) => {
            for (let dy = -4; dy <= 4; dy++)
                for (let dx = -4; dx <= 4; dx++) {
                    const d = Math.max(Math.abs(dx), Math.abs(dy));
                    const x = cx + dx,
                        y = cy + dy;
                    if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
                }
        };
        finder(3, 3);
        finder(size - 4, 3);
        finder(3, size - 4);
        const pos = ALIGN[version];
        for (let i = 0; i < pos.length; i++)
            for (let j = 0; j < pos.length; j++) {
                const last = pos.length - 1;
                if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0))
                    continue;
                for (let dy = -2; dy <= 2; dy++)
                    for (let dx = -2; dx <= 2; dx++)
                        set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
            }
        const format = (msk) => {
            const dataBits = (0 << 3) | msk; // correção M = 00
            let rem = dataBits;
            for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            const b = ((dataBits << 10) | rem) ^ 0x5412;
            const bit = (i) => ((b >>> i) & 1) !== 0;
            for (let i = 0; i <= 5; i++) set(8, i, bit(i));
            set(8, 7, bit(6));
            set(8, 8, bit(7));
            set(7, 8, bit(8));
            for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
            for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
            for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
            set(8, size - 8, true);
        };
        format(0);
        if (version >= 7) {
            let rem = version;
            for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
            const b = (version << 12) | rem;
            for (let i = 0; i < 18; i++) {
                const dark = ((b >>> i) & 1) !== 0;
                const a = size - 11 + (i % 3),
                    c = Math.floor(i / 3);
                set(a, c, dark);
                set(c, a, dark);
            }
        }
        // Dados em zigue-zague, de baixo para cima e da direita para a esquerda.
        let i = 0;
        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) right = 5;
            for (let vert = 0; vert < size; vert++)
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const y = upward ? size - 1 - vert : vert;
                    if (!fn[y][x] && i < codewords.length * 8) {
                        m[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
                        i++;
                    }
                }
        }
        const cond = [
            (x, y) => (x + y) % 2 === 0,
            (x, y) => y % 2 === 0,
            (x) => x % 3 === 0,
            (x, y) => (x + y) % 3 === 0,
            (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
            (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
            (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
            (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
        ][mask];
        for (let y = 0; y < size; y++)
            for (let x = 0; x < size; x++) if (!fn[y][x] && cond(x, y)) m[y][x] = !m[y][x];
        format(mask);
        return m;
    }

    // Penalidade simplificada (sequências, blocos 2×2 e equilíbrio): escolhe a máscara mais legível.
    function penalty(m) {
        const n = m.length;
        let p = 0,
            dark = 0;
        for (let a = 0; a < n; a++) {
            let runRow = 1,
                runCol = 1;
            for (let b = 1; b < n; b++) {
                runRow = m[a][b] === m[a][b - 1] ? runRow + 1 : 1;
                runCol = m[b][a] === m[b - 1][a] ? runCol + 1 : 1;
                if (runRow === 5) p += 3;
                else if (runRow > 5) p += 1;
                if (runCol === 5) p += 3;
                else if (runCol > 5) p += 1;
            }
        }
        for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
                if (m[y][x]) dark++;
                if (
                    y < n - 1 &&
                    x < n - 1 &&
                    m[y][x] === m[y][x + 1] &&
                    m[y][x] === m[y + 1][x] &&
                    m[y][x] === m[y + 1][x + 1]
                )
                    p += 3;
            }
        return p + Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
    }

    function matrix(text) {
        const { version, codewords } = encode(text);
        let best = null,
            bestScore = Infinity;
        for (let mask = 0; mask < 8; mask++) {
            const m = build(version, codewords, mask);
            const s = penalty(m);
            if (s < bestScore) [best, bestScore] = [m, s];
        }
        return best;
    }

    function svg(text, opts) {
        const o = Object.assign({ dark: "#14275e", light: "#fbfcff", border: 3 }, opts || {});
        const m = matrix(text);
        const n = m.length + o.border * 2;
        let d = "";
        m.forEach((row, y) =>
            row.forEach(
                (dark, x) =>
                    dark && (d += "M" + (x + o.border) + " " + (y + o.border) + "h1v1h-1z"),
            ),
        );
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
            n +
            " " +
            n +
            '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="' +
            o.light +
            '"/><path fill="' +
            o.dark +
            '" d="' +
            d +
            '"/></svg>'
        );
    }

    global.LogFarmaQR = { svg: svg, matrix: matrix };
})(typeof window !== "undefined" ? window : globalThis);
