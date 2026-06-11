/** Pre-bundled song list. Files live in public/songs/ and are fetched on demand. */
export interface SongEntry {
  id: string;
  title: string;
  file: string; // path relative to site root
}

export const SONG_LIST: SongEntry[] = [
  { id: 'anytime-anywhere', title: 'Anytime Anywhere', file: '/songs/anytime-anywhere-cut.flac' },
  { id: 'yoasobi-gunjou', title: 'YOASOBI — 群青', file: '/songs/yoasobi-gunjou.mp3' },
];
