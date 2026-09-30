/*
 * towers.js — Torres: construção, melhoria, venda, mira e disparo.
 *
 * Cada torre mira no inimigo mais avançado dentro do alcance, gira suavemente até ele
 * e dispara quando estiver apontada e recarregada.
 */
(function () {
  'use strict';
  const TD = window.TD;
  const cfg = TD.config;
  const CASA = () => cfg.tela.tamanhoCasa;
  const TOLERANCIA_MIRA = 0.25; // rad: dispara se o ângulo até o alvo for menor que isso

  // Diferença entre dois ângulos no intervalo (-PI, PI]
  function diferencaAngulo(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  TD.torres = {
    // Atributos do nível atual da torre.
    atributos(torre) {
      return cfg.torres[torre.tipo].niveis[torre.nivel];
    },

    naCasa(coluna, linha) {
      return TD.estado.torres.find((t) => t.coluna === coluna && t.linha === linha) || null;
    },

    custoConstrucao(tipo) {
      return cfg.torres[tipo].niveis[0].custo;
    },

    // Custo da próxima melhoria, ou null se já está no nível máximo.
    custoMelhoria(torre) {
      const niveis = cfg.torres[torre.tipo].niveis;
      return torre.nivel + 1 < niveis.length ? niveis[torre.nivel + 1].custo : null;
    },

    valorVenda(torre) {
      return Math.floor(torre.investido * cfg.jogo.reembolsoVenda);
    },

    podeConstruir(tipo, coluna, linha) {
      return TD.mapa.ehConstruivel(coluna, linha) && !this.naCasa(coluna, linha) &&
        TD.estado.ouro >= this.custoConstrucao(tipo);
    },

    // Cria a torre sem cobrar (usado também para restaurar partida salva).
    adicionar(tipo, coluna, linha, nivel) {
      const niveis = cfg.torres[tipo].niveis;
      let investido = 0;
      for (let n = 0; n <= nivel; n++) investido += niveis[n].custo;
      const centro = TD.mapa.centroCasa(coluna, linha);
      const torre = {
        tipo, coluna, linha, nivel,
        x: centro.x, y: centro.y,
        angulo: -Math.PI / 2,   // começa apontando para cima
        recarga: 0,             // tempo até poder disparar de novo
        recuo: 0,               // 1 logo após disparar, cai para 0 (animação)
        investido,              // ouro total gasto (base do reembolso)
      };
      TD.estado.torres.push(torre);
      return torre;
    },

    construir(tipo, coluna, linha) {
      if (!this.podeConstruir(tipo, coluna, linha)) return null;
      TD.estado.ouro -= this.custoConstrucao(tipo);
      TD.audio.play('construir');
      return this.adicionar(tipo, coluna, linha, 0);
    },

    melhorar(torre) {
      const custo = this.custoMelhoria(torre);
      if (custo === null || TD.estado.ouro < custo) return false;
      TD.estado.ouro -= custo;
      torre.nivel++;
      torre.investido += custo;
      TD.audio.play('melhorar');
      return true;
    },

    vender(torre) {
      const valor = this.valorVenda(torre);
      TD.estado.ouro += valor;
      TD.estado.torres = TD.estado.torres.filter((t) => t !== torre);
      TD.efeitos.criar('texto_ouro', torre.x, torre.y - 10, 0.9, { valor });
      TD.audio.play('vender');
    },

    atualizar(dt) {
      for (const torre of TD.estado.torres) {
        const def = cfg.torres[torre.tipo];
        const at = def.niveis[torre.nivel];
        if (torre.recarga > 0) torre.recarga -= dt;
        if (torre.recuo > 0) torre.recuo = Math.max(0, torre.recuo - dt * 2.5);

        const alvo = TD.inimigos.maisAvancadoNoAlcance(torre.x, torre.y, at.alcance * CASA());
        if (!alvo) continue;

        // Gira em direção ao alvo, limitado pela velocidade de giro
        const desejado = Math.atan2(alvo.y - torre.y, alvo.x - torre.x);
        const diff = diferencaAngulo(torre.angulo, desejado);
        const passo = def.velocidadeGiro * dt;
        torre.angulo += Math.abs(diff) <= passo ? diff : Math.sign(diff) * passo;

        if (torre.recarga <= 0 && Math.abs(diferencaAngulo(torre.angulo, desejado)) < TOLERANCIA_MIRA) {
          torre.recarga = 1 / at.cadencia;
          torre.recuo = 1;
          TD.projeteis.disparar(torre, alvo, def, at);
        }
      }
    },

    // Bases (paradas) e partes giratórias. O recuo afasta a arma para trás ao disparar.
    desenhar(ctx) {
      for (const t of TD.estado.torres) {
        const n = t.nivel + 1;
        TD.assets.draw(t.tipo + '_nv' + n + '_base', ctx, t.x, t.y);
      }
      for (const t of TD.estado.torres) {
        const n = t.nivel + 1;
        TD.assets.draw(t.tipo + '_nv' + n, ctx, t.x, t.y, t.angulo, 1, { recuo: t.recuo });
      }
    },

    desenharAlcance(ctx, torre) {
      const at = this.atributos(torre);
      TD.assets.draw('alcance', ctx, torre.x, torre.y, 0, 1, { raio: at.alcance * CASA() });
    },
  };
})();
