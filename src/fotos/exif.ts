/** Data do EXIF ("AAAA:MM:DD HH:MM:SS", sem fuso) → ISO UTC, assumindo horário de Natal (UTC-3). */
export function dataExif(exif?: Record<string, any> | null): string | undefined {
  const bruto: string | undefined = exif?.DateTimeOriginal ?? exif?.DateTimeDigitized;
  const m = bruto?.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return undefined;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5], +m[6])).toISOString();
}
