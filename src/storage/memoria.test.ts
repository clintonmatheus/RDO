import { criarArmazenamentoMemoria } from './memoria';
import {
  testarFilaECursores, testarRepositorioAnotacoes, testarRepositorioFotos, testarRepositorioFotosSync, testarRepositorioRegistros,
} from './contrato.test-suite';

const novo = async () => criarArmazenamentoMemoria();
testarRepositorioRegistros('memória', async () => (await novo()).registros);
testarRepositorioFotos('memória', async () => (await novo()).fotos);
testarRepositorioFotosSync('memória', async () => (await novo()).fotos);
testarRepositorioAnotacoes('memória', async () => (await novo()).anotacoes);
testarFilaECursores('memória', novo);
