/**
 * 出題用の五線譜画像（PNG）を public/notes/ に生成する。
 * 音符の一覧（src/notes.ts）を変えたときだけ実行する: npm run images
 *
 * VexFlow は DOM と canvas を前提にしているので、jsdom と @napi-rs/canvas で代用し、
 * 音楽記号のフォント（Bravura）は VexFlow 同梱の woff2 を展開して登録する。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { JSDOM } from 'jsdom';
// @ts-expect-error 型定義がない
import { decompress } from 'wawoff2';
import { ALL_NOTES, imagePath, type Note } from '../src/notes';

const WIDTH = 220;
const HEIGHT = 150;
/** Discord で見たときにぼやけないよう、3 倍の解像度で描く */
const SCALE = 3;

async function registerBravura(): Promise<void> {
  // フォントのファイルは package.json の exports に含まれないので、パッケージの場所から直接読む
  const require = createRequire(import.meta.url);
  const entry = require.resolve('vexflow');
  const root = entry.slice(0, entry.lastIndexOf('/node_modules/vexflow/') + '/node_modules/vexflow/'.length);
  const source = readFileSync(`${root}build/esm/src/fonts/bravura.js`, 'utf8');
  const base64 = source.slice(source.indexOf('base64,') + 'base64,'.length, source.lastIndexOf("'"));
  const ttf = await decompress(Buffer.from(base64, 'base64'));
  GlobalFonts.register(Buffer.from(ttf), 'Bravura');
}

function setupDom(): void {
  const dom = new JSDOM('<!DOCTYPE html>', { pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document });
}

/** "C4" → VexFlow のキー "c/4" */
function toVexKey(name: string): string {
  return `${name.slice(0, -1).toLowerCase()}/${name.slice(-1)}`;
}

async function main(): Promise<void> {
  await registerBravura();
  setupDom();
  const { Renderer, Stave, StaveNote, Voice, Formatter } = await import('vexflow/bravura');

  const render = (note: Note): Buffer => {
    const canvas = createCanvas(WIDTH * SCALE, HEIGHT * SCALE);
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#000000';

    const context = new Renderer(canvas as unknown as HTMLCanvasElement, Renderer.Backends.CANVAS).getContext();
    context.scale(SCALE, SCALE);

    // 加線が上下に 3 本ずつ入っても収まる位置に五線を置く
    const stave = new Stave(10, 15, WIDTH - 20);
    stave.addClef(note.clef).setContext(context).draw();

    const staveNote = new StaveNote({ keys: [toVexKey(note.name)], duration: 'w', clef: note.clef });
    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.setStrict(false);
    voice.addTickables([staveNote]);
    new Formatter().joinVoices([voice]).format([voice], 1);
    // 音部記号の右側の、空いているところの真ん中に置く
    staveNote.setXShift((WIDTH - 20 - stave.getNoteStartX()) / 2 - 20);
    voice.draw(context, stave);

    return canvas.toBuffer('image/png');
  };

  mkdirSync('public/notes', { recursive: true });
  for (const note of ALL_NOTES) {
    writeFileSync(`public${imagePath(note)}`, render(note));
  }
  console.log(`${ALL_NOTES.length} 枚の画像を public/notes/ に生成しました`);
}

await main();
