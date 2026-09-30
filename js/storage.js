/*
 * storage.js — Salvamento em localStorage: partida em andamento, estatísticas e preferências.
 *
 * Tudo passa por try/catch: se o localStorage estiver indisponível (modo privado, bloqueado,
 * cheio) o jogo segue normalmente, só não salva. Dados corrompidos ou inválidos são
 * descartados e trocados pelos valores padrão.
 */
(function () {
  'use strict';
  const TD = window.TD;

  const PREFIXO = 'defesaDoReino.v1.'; // mude a versão se o formato dos dados mudar
  const CHAVES = { partida: 'partida', estatisticas: 'estatisticas', preferencias: 'preferencias' };

  // Testa uma vez se dá para gravar e ler.
  const disponivel = (function () {
    try {
      const k = PREFIXO + '__teste';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      console.warn('[storage] localStorage indisponível; o progresso não será salvo.');
      return false;
    }
  })();

  function ler(chave) {
    if (!disponivel) return null;
    try {
      const texto = window.localStorage.getItem(PREFIXO + chave);
      return texto === null ? null : JSON.parse(texto);
    } catch (e) {
      console.warn('[storage] Dados corrompidos em', chave, '- descartados.');
      remover(chave);
      return null;
    }
  }

  function gravar(chave, valor) {
    if (!disponivel) return false;
    try {
      window.localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
      return true;
    } catch (e) {
      console.warn('[storage] Não foi possível salvar', chave, e);
      return false;
    }
  }

  function remover(chave) {
    if (!disponivel) return;
    try { window.localStorage.removeItem(PREFIXO + chave); } catch (e) { /* ignora */ }
  }

  const ehInteiro = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  // Valida uma partida salva. Retorna a partida limpa ou null se algo estiver errado.
  function validarPartida(p) {
    const cfg = TD.config;
    if (!ehObjeto(p)) return null;
    if (!ehInteiro(p.onda, 1, cfg.jogo.totalOndas - 1)) return null; // ondas concluídas
    if (!ehInteiro(p.ouro, 0, 1e7)) return null;
    if (!ehInteiro(p.vidas, 1, 1e4)) return null;
    if (!Array.isArray(p.torres)) return null;
    const ocupadas = {};
    const torres = [];
    for (const t of p.torres) {
      if (!ehObjeto(t)) return null;
      const def = cfg.torres[t.tipo];
      if (!def || !Object.prototype.hasOwnProperty.call(cfg.torres, t.tipo)) return null;
      if (!ehInteiro(t.nivel, 0, def.niveis.length - 1)) return null;
      if (!ehInteiro(t.coluna, 0, cfg.tela.colunas - 1) || !ehInteiro(t.linha, 0, cfg.tela.linhas - 1)) return null;
      if (!TD.mapa.ehConstruivel(t.coluna, t.linha)) return null;
      const chave = t.coluna + ',' + t.linha;
      if (ocupadas[chave]) return null;
      ocupadas[chave] = true;
      torres.push({ tipo: t.tipo, nivel: t.nivel, coluna: t.coluna, linha: t.linha });
    }
    return { onda: p.onda, ouro: p.ouro, vidas: p.vidas, torres };
  }

  TD.storage = {
    disponivel,

    // ---------- Partida em andamento ----------
    carregarPartida() {
      const bruto = ler(CHAVES.partida);
      if (bruto === null) return null;
      const partida = validarPartida(bruto);
      if (!partida) {
        console.warn('[storage] Partida salva inválida - descartada.');
        remover(CHAVES.partida);
      }
      return partida;
    },
    salvarPartida(partida) { return gravar(CHAVES.partida, partida); },
    apagarPartida() { remover(CHAVES.partida); },

    // ---------- Estatísticas ----------
    carregarEstatisticas() {
      const padrao = { melhorOnda: 0, vitorias: 0, inimigosDerrotados: 0 };
      const s = ler(CHAVES.estatisticas);
      if (!ehObjeto(s)) return padrao;
      return {
        melhorOnda: ehInteiro(s.melhorOnda, 0, 1e4) ? s.melhorOnda : 0,
        vitorias: ehInteiro(s.vitorias, 0, 1e9) ? s.vitorias : 0,
        inimigosDerrotados: ehInteiro(s.inimigosDerrotados, 0, 1e12) ? s.inimigosDerrotados : 0,
      };
    },
    salvarEstatisticas(s) { return gravar(CHAVES.estatisticas, s); },

    // ---------- Preferências ----------
    carregarPreferencias() {
      const p = ler(CHAVES.preferencias);
      const velocidades = TD.config.loop.velocidades;
      return {
        mudo: ehObjeto(p) && p.mudo === true,
        velocidade: ehObjeto(p) && velocidades.indexOf(p.velocidade) >= 0 ? p.velocidade : velocidades[0],
      };
    },
    salvarPreferencias(p) { return gravar(CHAVES.preferencias, { mudo: !!p.mudo, velocidade: p.velocidade }); },
  };
})();
