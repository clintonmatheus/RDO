import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Directory, File, Paths } from 'expo-file-system';
import type { Anotacao } from '../domain/anotacao';
import type { Foto } from '../domain/foto';
import type { RegistroDiario } from '../domain/registro';
import type { Usuario } from '../domain/usuario';
import type { Autenticacao } from '../auth/autenticacao';
import { SUPABASE_CHAVE_PUBLICA, SUPABASE_URL } from '../config';
import type { Lote, Remoto } from './remoto';

// Adaptadores reais (dependem de rede e do aparelho; a lógica testada fica no Sincronizador).

export function criarClienteSupabase(): SupabaseClient {
  const sb = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA, {
    auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') sb.auth.startAutoRefresh();
    else sb.auth.stopAutoRefresh();
  });
  return sb;
}

/** Margem para não perder gravações que o servidor confirmou fora de ordem. */
const SOBREPOSICAO_MS = 60_000;
const PAGINA = 500;

function erroDeRede(e: unknown): Error {
  const msg = (e as Error)?.message ?? '';
  return /fetch|network|timeout/i.test(msg) ? new Error('Sem conexão') : new Error(msg || 'Falha no servidor');
}

export class RemotoSupabase implements Remoto {
  constructor(private sb: SupabaseClient) {}

  private async upsert(tabela: string, linha: Record<string, unknown>, conflito: string) {
    const { error } = await this.sb.from(tabela).upsert(linha, { onConflict: conflito });
    if (error) throw erroDeRede(error);
  }

  async enviarRegistro(r: RegistroDiario) {
    const { data: s } = await this.sb.auth.getSession();
    await this.upsert('registros', {
      obra_id: r.obraId, data: r.data, atualizado_por: s.session?.user.id ?? r.atualizadoPor?.id, dados: r,
    }, 'obra_id,data');
  }

  async enviarAnotacao(a: Anotacao) {
    await this.upsert('anotacoes', { id: a.id, obra_id: a.obraId, data: a.data, autor_id: a.autorId, excluida: a.excluida, dados: a }, 'id');
  }

  async enviarFoto(f: Foto) {
    await this.upsert('fotos', {
      id: f.id, obra_id: f.obraId, data: f.data, autor_id: f.autorId, caminho: f.caminhoRemoto ?? null,
      excluida: !!f.excluida, dados: { ...f, uri: '' },
    }, 'id');
  }

  async enviarArquivoFoto(f: Foto) {
    const caminho = `${f.obraId}/${f.id}.jpg`;
    const bytes = await new File(f.uri).bytes();
    const { error } = await this.sb.storage.from('fotos').upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw erroDeRede(error);
    return caminho;
  }

  async baixarArquivoFoto(f: Foto) {
    if (!f.caminhoRemoto) throw new Error('Foto sem arquivo no servidor');
    const { data, error } = await this.sb.storage.from('fotos').createSignedUrl(f.caminhoRemoto, 300);
    if (error || !data) throw erroDeRede(error);
    const pasta = new Directory(Paths.document, 'fotos');
    if (!pasta.exists) pasta.create();
    const destino = new File(pasta, `${f.id}.jpg`);
    if (destino.exists) destino.delete();
    const baixado = await File.downloadFileAsync(data.signedUrl, destino);
    return baixado.uri;
  }

  private async baixar<T>(tabela: string, cursor?: string): Promise<Lote<T>> {
    const desde = cursor ? new Date(Date.parse(cursor) - SOBREPOSICAO_MS).toISOString() : '1970-01-01T00:00:00Z';
    const itens: T[] = [];
    let ultimo = cursor;
    for (let pagina = 0; ; pagina++) {
      const { data, error } = await this.sb.from(tabela).select('dados, servidor_em')
        .gt('servidor_em', desde).order('servidor_em', { ascending: true })
        .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1);
      if (error) throw erroDeRede(error);
      for (const l of data ?? []) {
        itens.push(l.dados as T);
        if (!ultimo || l.servidor_em > ultimo) ultimo = l.servidor_em;
      }
      if (!data || data.length < PAGINA) break;
    }
    return { itens, cursor: ultimo };
  }

  baixarRegistros(cursor?: string) { return this.baixar<RegistroDiario>('registros', cursor); }
  baixarAnotacoes(cursor?: string) { return this.baixar<Anotacao>('anotacoes', cursor); }
  baixarFotos(cursor?: string) { return this.baixar<Foto>('fotos', cursor); }

  aoMudar(callback: () => void) {
    const canal = this.sb.channel('rdo-mudancas');
    for (const table of ['registros', 'anotacoes', 'fotos']) {
      canal.on('postgres_changes', { event: '*', schema: 'public', table }, () => callback());
    }
    canal.subscribe();
    return () => { void this.sb.removeChannel(canal); };
  }
}

const CHAVE_PERFIL = 'rdo.perfil';

export class AutenticacaoSupabase implements Autenticacao {
  constructor(private sb: SupabaseClient) {}

  async usuarioAtual(): Promise<Usuario | undefined> {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return undefined;
    const guardado = localStorage.getItem(CHAVE_PERFIL);
    if (guardado) {
      const u = JSON.parse(guardado) as Usuario;
      if (u.id === data.session.user.id) return u;
    }
    try { return await this.carregarPerfil(data.session.user.id); } catch { return undefined; }
  }

  async entrar(email: string, senha: string): Promise<Usuario> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error || !data.user) {
      if (error && /invalid login|credentials/i.test(error.message)) throw new Error('E-mail ou senha incorretos');
      throw erroDeRede(error);
    }
    return this.carregarPerfil(data.user.id);
  }

  async sair() {
    localStorage.removeItem(CHAVE_PERFIL);
    await this.sb.auth.signOut();
  }

  private async carregarPerfil(id: string): Promise<Usuario> {
    const { data, error } = await this.sb.from('perfis').select('id, nome, admin').eq('id', id).single();
    if (error || !data) throw erroDeRede(error);
    const u: Usuario = { id: data.id, nome: data.nome, admin: data.admin };
    localStorage.setItem(CHAVE_PERFIL, JSON.stringify(u));
    return u;
  }
}
