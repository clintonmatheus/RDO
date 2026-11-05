import { dataExif } from './exif';

describe('dataExif', () => {
  it('converte horário local de Natal para UTC', () => {
    expect(dataExif({ DateTimeOriginal: '2026:11:05 15:30:00' })).toBe('2026-11-05T18:30:00.000Z');
  });
  it('vira o dia quando passa da meia-noite UTC', () => {
    expect(dataExif({ DateTimeOriginal: '2026:11:05 22:00:00' })).toBe('2026-11-06T01:00:00.000Z');
  });
  it('usa DateTimeDigitized quando falta o original', () => {
    expect(dataExif({ DateTimeDigitized: '2026:11:05 08:00:00' })).toBe('2026-11-05T11:00:00.000Z');
  });
  it('retorna undefined sem EXIF ou com formato inválido', () => {
    expect(dataExif(undefined)).toBeUndefined();
    expect(dataExif({ DateTimeOriginal: 'ontem' })).toBeUndefined();
  });
});
