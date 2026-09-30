/*
 * map.js — Mapa: caminho dos inimigos, grade de construção e desenho do cenário.
 *
 * O caminho é uma sequência de pontos (config.mapa.caminho). Cada inimigo guarda só a
 * "distância percorrida"; posicaoNaDistancia() converte isso em (x, y, ângulo).
 * O cenário (gramado, estrada, árvores, castelo) é desenhado uma vez num canvas de cache.
 */
(function () {
  'use strict';
  const TD = window.TD;

  // Tipos de casa na grade
  const TIPO = { GRAMA: 0, ESTRADA: 1, CONSTRUCAO: 2, CASTELO: 3 };

  TD.mapa = {
    TIPO,
    pontos: [],        // pontos do caminho em px lógicos: [{x, y}]
    segmentos: [],     // [{ax, ay, bx, by, comprimento, inicio, angulo}]
    comprimento: 0,    // comprimento total do caminho em px
    grade: [],         // grade[linha][coluna] = TIPO
    decoracoes: [],    // [{nome, x, y, escala, opcoes}]
    cache: null,       // canvas com o cenário pré-desenhado
    escalaCache: 0,    // escala (px físicos por px lógico) em que o cache foi desenhado

    iniciar() {
      const cfg = TD.config;
      const t = cfg.tela.tamanhoCasa;
      const colunas = cfg.tela.colunas, linhas = cfg.tela.linhas;

      // 1) Caminho em px (centro das casas)
      this.pontos = cfg.mapa.caminho.map((p) => ({ x: p[0] * t + t / 2, y: p[1] * t + t / 2 }));
      this.segmentos = [];
      let acumulado = 0;
      for (let i = 1; i < this.pontos.length; i++) {
        const a = this.pontos[i - 1], b = this.pontos[i];
        const comprimento = Math.hypot(b.x - a.x, b.y - a.y);
        this.segmentos.push({
          ax: a.x, ay: a.y, bx: b.x, by: b.y,
          comprimento, inicio: acumulado,
          angulo: Math.atan2(b.y - a.y, b.x - a.x),
        });
        acumulado += comprimento;
      }
      this.comprimento = acumulado;

      // 2) Grade: castelo nas últimas linhas, estrada onde o caminho passa
      this.grade = [];
      for (let l = 0; l < linhas; l++) {
        const linha = [];
        for (let c = 0; c < colunas; c++) {
          linha.push(l >= linhas - cfg.mapa.linhasCastelo ? TIPO.CASTELO : TIPO.GRAMA);
        }
        this.grade.push(linha);
      }
      // Amostra o caminho a cada 4 px e marca as casas por onde ele passa
      for (let d = 0; d <= this.comprimento; d += 4) {
        const p = this.posicaoNaDistancia(d);
        const c = Math.floor(p.x / t), l = Math.floor(p.y / t);
        if (this.dentro(c, l) && this.grade[l][c] === TIPO.GRAMA) this.grade[l][c] = TIPO.ESTRADA;
      }
      // Casas de grama vizinhas (em cruz) da estrada viram casas de construção
      for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
          if (this.grade[l][c] !== TIPO.GRAMA) continue;
          const vizinhas = [[c + 1, l], [c - 1, l], [c, l + 1], [c, l - 1]];
          if (vizinhas.some(([vc, vl]) => this.dentro(vc, vl) && this.grade[vl][vc] === TIPO.ESTRADA)) {
            this.grade[l][c] = TIPO.CONSTRUCAO;
          }
        }
      }

      // 3) Decoração nas casas de grama que sobraram
      const rnd = TD.util.aleatorioComSemente(cfg.mapa.sementeDecoracao);
      this.decoracoes = [];
      for (let l = 0; l < linhas; l++) {
        for (let c = 0; c < colunas; c++) {
          if (this.grade[l][c] !== TIPO.GRAMA || rnd() > cfg.mapa.densidadeDecoracao) continue;
          const centro = this.centroCasa(c, l);
          this.decoracoes.push({
            nome: rnd() < 0.8 ? 'arvore' : 'rocha',
            x: centro.x + (rnd() - 0.5) * 12,
            y: centro.y + (rnd() - 0.5) * 12,
            escala: 0.8 + rnd() * 0.3,
            opcoes: { variacao: rnd() },
          });
        }
      }
      this.decoracoes.sort((a, b) => a.y - b.y); // de cima para baixo, para sobrepor certo
      this.cache = null;
    },

    dentro(c, l) {
      return c >= 0 && l >= 0 && c < TD.config.tela.colunas && l < TD.config.tela.linhas;
    },

    // Converte uma distância percorrida no caminho em posição e direção.
    posicaoNaDistancia(d) {
      const segs = this.segmentos;
      if (d <= 0) return { x: segs[0].ax, y: segs[0].ay, angulo: segs[0].angulo };
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (d <= s.inicio + s.comprimento) {
          const t = (d - s.inicio) / s.comprimento;
          return { x: s.ax + (s.bx - s.ax) * t, y: s.ay + (s.by - s.ay) * t, angulo: s.angulo };
        }
      }
      const ultimo = segs[segs.length - 1];
      return { x: ultimo.bx, y: ultimo.by, angulo: ultimo.angulo };
    },

    // Casa (coluna, linha) que contém o ponto (x, y) em px lógicos.
    casaEm(x, y) {
      const t = TD.config.tela.tamanhoCasa;
      return { coluna: Math.floor(x / t), linha: Math.floor(y / t) };
    },

    centroCasa(c, l) {
      const t = TD.config.tela.tamanhoCasa;
      return { x: c * t + t / 2, y: l * t + t / 2 };
    },

    tipoCasa(c, l) {
      return this.dentro(c, l) ? this.grade[l][c] : -1;
    },

    // É uma casa de construção? (a ocupação por torres é verificada em towers.js)
    ehConstruivel(c, l) {
      return this.tipoCasa(c, l) === TIPO.CONSTRUCAO;
    },

    // Desenha o cenário no cache, na resolução física atual (nítido em telas de alta densidade).
    renderizarCache(escalaPixels) {
      const cfg = TD.config;
      const W = cfg.tela.largura, H = cfg.tela.altura;
      const cache = document.createElement('canvas');
      cache.width = Math.round(W * escalaPixels);
      cache.height = Math.round(H * escalaPixels);
      const c = cache.getContext('2d');
      c.setTransform(escalaPixels, 0, 0, escalaPixels, 0, 0);

      TD.assets.draw('chao', c, 0, 0, 0, 1, { largura: W, altura: H, semente: cfg.mapa.sementeDecoracao });
      TD.assets.draw('estrada', c, 0, 0, 0, 1, {
        pontos: this.pontos,
        largura: cfg.mapa.larguraEstrada * cfg.tela.tamanhoCasa,
        semente: cfg.mapa.sementeDecoracao + 1,
      });
      for (let l = 0; l < cfg.tela.linhas; l++) {
        for (let col = 0; col < cfg.tela.colunas; col++) {
          if (this.grade[l][col] === TIPO.CONSTRUCAO) {
            const p = this.centroCasa(col, l);
            TD.assets.draw('marcador_construcao', c, p.x, p.y);
          }
        }
      }
      this.decoracoes.forEach((d) => TD.assets.draw(d.nome, c, d.x, d.y, 0, d.escala, d.opcoes));
      // Névoa no primeiro ponto visível do caminho (entrada dos mortos-vivos)
      const entrada = this.pontos[0];
      TD.assets.draw('nevoa_entrada', c, entrada.x, Math.max(entrada.y, 0));
      // Castelo ocupando as últimas linhas
      const alturaCastelo = cfg.mapa.linhasCastelo * cfg.tela.tamanhoCasa;
      const portao = this.pontos[this.pontos.length - 1];
      TD.assets.draw('castelo', c, W / 2, H - alturaCastelo / 2, 0, 1, {
        largura: W, altura: alturaCastelo, portaoX: portao.x - W / 2,
      });

      this.cache = cache;
      this.escalaCache = escalaPixels;
    },

    desenhar(ctx, escalaPixels) {
      if (!this.cache || this.escalaCache !== escalaPixels) this.renderizarCache(escalaPixels);
      ctx.drawImage(this.cache, 0, 0, TD.config.tela.largura, TD.config.tela.altura);
    },
  };
})();
