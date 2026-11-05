import { RepositorioRegistrosMemoria, RepositorioFotosMemoria } from './memoria';
import { testarRepositorioFotos, testarRepositorioRegistros } from './contrato.test-suite';

testarRepositorioRegistros('memória', async () => new RepositorioRegistrosMemoria());
testarRepositorioFotos('memória', async () => new RepositorioFotosMemoria());
