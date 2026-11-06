import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';
import type { Lote, Remoto } from './remoto';

type ComSeq<T> = { item: T; seq: number };

/** Servidor em memória para testes: vários "aparelhos" podem compartilhar a mesma instância. */
export class RemotoFalso implements Remoto {
  falharEnvios = false;
  falharDownloads = false;
  /** Simula a sobreposição do cursor do servidor real (devolve tudo de novo). */
  ignorarCursor = false;
  totalEnvios = 0;
  /** Ids que o servidor recusa (simula regra de permissão). */
  recusar = new Set<string>();
  arquivosEnviados: string[] = [];
  private seq = 0;
  private registros = new Map<string, ComSeq<RegistroDiario>>();
  private anotacoes = new Map<string, ComSeq<Anotacao>>();
  private fotos = new Map<string, ComSeq<Foto>>();
  private ouvintes = new Set<() => void>();

  private guardar<T>(mapa: Map<string, ComSeq<T>>, chave: string, item: T) {
    if (this.falharEnvios) throw new Error('Sem conexão');
    if (this.recusar.has(chave)) throw new Error('Sem permissão no servidor');
    this.totalEnvios += 1;
    mapa.set(chave, { item: JSON.parse(JSON.stringify(item)), seq: ++this.seq });
    this.ouvintes.forEach((o) => o());
  }

  private lote<T>(mapa: Map<string, ComSeq<T>>, cursor?: string): Lote<T> {
    const desde = cursor && !this.ignorarCursor ? Number(cursor) : 0;
    const novos = [...mapa.values()].filter((x) => x.seq > desde).sort((a, b) => a.seq - b.seq);
    return {
      itens: novos.map((x) => JSON.parse(JSON.stringify(x.item))),
      cursor: novos.length ? String(novos[novos.length - 1].seq) : cursor,
    };
  }

  async enviarRegistro(r: RegistroDiario) { this.guardar(this.registros, r.id, r); }
  async enviarAnotacao(a: Anotacao) { this.guardar(this.anotacoes, a.id, a); }
  async enviarFoto(f: Foto) { this.guardar(this.fotos, f.id, { ...f, uri: '' }); }

  async enviarArquivoFoto(f: Foto) {
    if (this.falharEnvios) throw new Error('Sem conexão');
    this.arquivosEnviados.push(f.id);
    return `${f.obraId}/${f.id}.jpg`;
  }

  async baixarArquivoFoto(f: Foto) {
    if (this.falharDownloads) throw new Error('Sem conexão');
    return `file://baixadas/${f.id}.jpg`;
  }

  async baixarRegistros(cursor?: string) { return this.lote(this.registros, cursor); }
  async baixarAnotacoes(cursor?: string) { return this.lote(this.anotacoes, cursor); }
  async baixarFotos(cursor?: string) { return this.lote(this.fotos, cursor); }

  aoMudar(callback: () => void) {
    this.ouvintes.add(callback);
    return () => { this.ouvintes.delete(callback); };
  }
}
