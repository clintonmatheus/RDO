import type { Usuario } from '../domain/usuario';

export interface Autenticacao {
  /** Usuário da sessão guardada no aparelho (funciona sem internet), se houver. */
  usuarioAtual(): Promise<Usuario | undefined>;
  /** Lança 'E-mail ou senha incorretos' ou 'Sem conexão'. */
  entrar(email: string, senha: string): Promise<Usuario>;
  sair(): Promise<void>;
  /** Relê nome e papel (administrador) no servidor; undefined se offline. */
  atualizarPerfil(): Promise<Usuario | undefined>;
}
