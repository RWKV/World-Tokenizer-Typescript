import {readFileSync} from  'fs';
import { findPythonByteObjects } from './bytematch';

export class RWKVTokenizer {
    private table: Uint8Array[][][];
    private good: Set<number>[];
    private wlen: number[];

    private idx2token: { [index: number]: Uint8Array };
    private token2idx: { [k: string]: number };

    constructor(fileName: string) {
        this.idx2token = {};
        const sorted: Uint8Array[] = []; // must be already sorted
        const lines = readFileSync(fileName, 'utf-8').split('\n');
        for (const l of lines) {
            const idxSpace = l.indexOf(' ');
            const idx = parseInt(l.slice(0, idxSpace), 10);
            let x:Uint8Array|null = findPythonByteObjects(l.slice(idxSpace, l.lastIndexOf(' ')))
            
            if (!x) {
                x = Buffer.from(l.slice(idxSpace+2, l.lastIndexOf(' ')-1), 'utf-8');
                console.log(x)
            }
            if (!(x instanceof Uint8Array)) {
                throw new Error('Invalid type; expected a Uint8Array');
            }
            sorted.push(new Uint8Array(x));
            this.idx2token[idx] = new Uint8Array(x);
        }

        this.token2idx = {};
        for (const [k, v] of Object.entries(this.idx2token)) {
            this.token2idx[Buffer.from(v).toString()] = parseInt(k, 10);
        }

        // precompute some tables for fast matching
        this.table = Array.from({ length: 256 }, () => Array.from({ length: 256 }, () => []));
        this.good = Array.from({ length: 256 }, () => new Set<number>());
        this.wlen = Array.from({ length: 256 }, () => 0);

        for (let i = sorted.length - 1; i >= 0; i--) { // reverse order - match longer tokens first
            const s = sorted[i];
            if (s.length >= 2) {
                const s0 = s[0];
                const s1 = s[1];
                this.table[s0][s1].push(s);
                this.wlen[s0] = Math.max(this.wlen[s0], s.length);
                this.good[s0].add(s1);
            }
        }
    }

    public encodeBytes(src: Uint8Array): number[] {
        const srcLen: number = src.length;
        const tokens: number[] = [];
        let i: number = 0;
        while (i < srcLen) {
            let s: Uint8Array = src.subarray(i, i + 1);

            if (i < srcLen - 1) {
                const s1: number = src[i + 1];
                const s0: number = src[i];
                if (this.good[s0].has(s1)) {
                    const sss: Uint8Array = src.subarray(i, i + this.wlen[s0]);
                    const match = this.table[s0][s1].find(t => this.startsWith(sss, t));
                    if (match) {
                        s = match;
                    }
                }
            }
            tokens.push(this.token2idx[Buffer.from(s).toString()]);
            i += s.length;
        }
        return tokens;
    }

    private startsWith(target: Uint8Array, prefix: Uint8Array): boolean {
        if (prefix.length > target.length) {
            return false;
        }
        for (let i = 0; i < prefix.length; i++) {
            if (target[i] !== prefix[i]) {
                return false;
            }
        }
        return true;
    }

    public decodeBytes(tokens: number[]): Uint8Array {
        return Buffer.concat(tokens.map(i => this.idx2token[Math.max(i, 1)]));
    }

    public encode(src: string): number[] {
        return this.encodeBytes(Buffer.from(src, 'utf-8'));
    }

    public decode(tokens: number[]): string {
        return this.decodeBytes(tokens).toString();
    }

    public printTokens(tokens: number[]): void {
        tokens.forEach(i => {
            const s = this.idx2token[i];
            try {
                console.log(`${JSON.stringify(s.toString())}${i} `);
            } catch {
                console.log(`${JSON.stringify(s)}${i} `); // If the decode fails, keep it as Uint8Array
            }
        });
        console.log();
    }
}

const thisfile = __dirname
export const WorldTokenizer = new RWKVTokenizer(thisfile +'/rwkv_vocab_v20230424.txt');