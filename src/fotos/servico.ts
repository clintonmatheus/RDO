export interface FotoCapturada {
  uri: string;
  /** Instante (ISO UTC). Galeria: data original do arquivo (EXIF) quando existir. */
  capturadaEm: string;
}

/** Acesso à câmera e à galeria; a implementação real fica em ./expo (depende do dispositivo). */
export interface ServicoFotos {
  tirarFoto(): Promise<FotoCapturada | undefined>;
  escolherDaGaleria(): Promise<FotoCapturada | undefined>;
}
