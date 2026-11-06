import { MARGENS_PDF } from './pdf';

describe('MARGENS_PDF', () => {
  it('tem margem positiva nos quatro lados (a última linha não encosta no fim da página)', () => {
    for (const lado of ['top', 'bottom', 'left', 'right'] as const) expect(MARGENS_PDF[lado]).toBeGreaterThanOrEqual(24);
  });
});
