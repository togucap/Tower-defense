/*
 * enemies.js — Inimigos: criação, movimento pelo caminho, dano, morte e invocação.
 *
 * Cada inimigo guarda a distância percorrida no caminho (em px); a posição (x, y) é
 * calculada a partir dela. "Mais avançado" = maior distância, o que facilita a mira.
 */
(function () {
  'use strict';
  const TD = window.TD;
  const cfg = TD.config;
  const CASA = () => cfg.tela.tamanhoCasa;

  // Largura da barra de vida e altura do sprite (px) por tipo, só para o desenho.
  const VISUAL = {
    esqueleto: { barra: 20, altura: 26 },
    fantasma: { barra: 18, altura: 24 },
    zumbi: { barra: 28, altura: 34 },
    necromante: { barra: 40, altura: 42 },
  };

  let proximoId = 1;

  TD.inimigos = {
    // Cria um inimigo no início do caminho (ou na distância indicada, em px).
    criar(tipo, multiplicadorVida, distancia, recompensa) {
      const def = cfg.inimigos[tipo];
      const vida = Math.round(def.vida * (multiplicadorVida || 1));
      const inimigo = {
        id: proximoId++,
        tipo,
        def,
        vida,
        vidaMaxima: vida,
        velocidade: def.velocidade * CASA(), // px/s
        raio: def.raio * CASA(),             // px
        recompensa: recompensa !== undefined ? recompensa : def.recompensa,
        multiplicadorVida: multiplicadorVida || 1,
        distancia: distancia || 0,
        desvio: (Math.random() - 0.5) * 8,   // pequeno deslocamento lateral, para não andarem em fila perfeita
        fase: Math.random() * Math.PI * 2,   // fase da animação de caminhada
        flash: 0,                            // tempo restante do "piscar" ao levar dano
        vivo: true,
        x: 0, y: 0, angulo: 0,
        invocacaoTimer: def.invocacao ? def.invocacao.intervalo : 0,
        invocando: 0,                        // tempo restante da animação de invocação
      };
      this.posicionar(inimigo);
      TD.estado.inimigos.push(inimigo);
      return inimigo;
    },

    posicionar(inimigo) {
      const p = TD.mapa.posicaoNaDistancia(inimigo.distancia);
      inimigo.x = p.x - Math.sin(p.angulo) * inimigo.desvio;
      inimigo.y = p.y + Math.cos(p.angulo) * inimigo.desvio;
      inimigo.angulo = p.angulo;
    },

    atualizar(dt) {
      const e = TD.estado;
      const fim = TD.mapa.comprimento;
      for (const inimigo of e.inimigos) {
        if (!inimigo.vivo) continue;
        inimigo.distancia += inimigo.velocidade * dt;
        inimigo.fase += dt * (inimigo.velocidade / CASA()) * 6;
        if (inimigo.flash > 0) inimigo.flash -= dt;
        if (inimigo.invocando > 0) inimigo.invocando -= dt;

        // Chegou ao portão: tira vidas e some
        if (inimigo.distancia >= fim) {
          inimigo.vivo = false;
          e.vidas = Math.max(0, e.vidas - inimigo.def.danoAoCastelo);
          const portao = TD.mapa.pontos[TD.mapa.pontos.length - 1];
          TD.efeitos.criar('perda_vida', portao.x, portao.y, 0.6);
          TD.audio.play('perda_vida');
          continue;
        }
        this.posicionar(inimigo);

        // Necromante: invoca esqueletos de tempos em tempos
        const inv = inimigo.def.invocacao;
        if (inv) {
          inimigo.invocacaoTimer -= dt;
          if (inimigo.invocacaoTimer <= 0) {
            inimigo.invocacaoTimer += inv.intervalo;
            this.invocar(inimigo, inv);
          }
        }
      }
      // Remove os que morreram ou chegaram
      e.inimigos = e.inimigos.filter((i) => i.vivo);
    },

    invocar(chefe, inv) {
      chefe.invocando = 0.6;
      for (let i = 1; i <= inv.quantidade; i++) {
        const distancia = Math.max(0, chefe.distancia - i * inv.espacamento * CASA());
        const novo = this.criar(inv.tipo, chefe.multiplicadorVida, distancia, inv.recompensa);
        TD.efeitos.criar('invocacao', novo.x, novo.y, 0.6);
      }
      TD.audio.play('invocacao');
    },

    // Aplica dano. Retorna true se o inimigo morreu com este golpe.
    causarDano(inimigo, valor) {
      if (!inimigo.vivo) return false;
      inimigo.vida -= valor;
      inimigo.flash = 0.1;
      if (inimigo.vida > 0) return false;

      const e = TD.estado;
      inimigo.vivo = false;
      e.ouro += inimigo.recompensa;
      e.abates++;
      TD.estatisticas.inimigosDerrotados++;
      TD.efeitos.criar('morte', inimigo.x, inimigo.y, 0.5, { tipo: inimigo.tipo });
      TD.efeitos.criar('texto_ouro', inimigo.x, inimigo.y - 12, 0.9, { valor: inimigo.recompensa });
      TD.audio.play(inimigo.tipo === 'necromante' ? 'morte_chefe' : inimigo.tipo === 'fantasma' ? 'morte_fantasma' : 'morte');
      return true;
    },

    // Inimigo vivo mais avançado dentro do círculo (x, y, raio em px), ou null.
    maisAvancadoNoAlcance(x, y, raio) {
      let melhor = null;
      const r2 = raio * raio;
      for (const i of TD.estado.inimigos) {
        if (!i.vivo) continue;
        const dx = i.x - x, dy = i.y - y;
        if (dx * dx + dy * dy <= r2 && (!melhor || i.distancia > melhor.distancia)) melhor = i;
      }
      return melhor;
    },

    // Todos os inimigos vivos atingidos por uma área (considera o raio do corpo).
    naArea(x, y, raio) {
      return TD.estado.inimigos.filter((i) => {
        if (!i.vivo) return false;
        const alcance = raio + i.raio;
        const dx = i.x - x, dy = i.y - y;
        return dx * dx + dy * dy <= alcance * alcance;
      });
    },

    desenhar(ctx) {
      // Ordena por y para sobrepor corretamente (quem está mais abaixo aparece na frente)
      const lista = TD.estado.inimigos.slice().sort((a, b) => a.y - b.y);
      for (const i of lista) {
        TD.assets.draw(i.tipo, ctx, i.x, i.y, 0, 1, {
          fase: i.fase,
          flash: i.flash > 0,
          virado: Math.cos(i.angulo) < -0.1,
          invocando: i.invocando > 0 ? i.invocando / 0.6 : 0,
        });
      }
    },

    // Barras de vida (desenhadas por último, por cima de tudo).
    desenharBarras(ctx) {
      for (const i of TD.estado.inimigos) {
        const v = VISUAL[i.tipo] || { barra: 20, altura: 26 };
        TD.assets.draw('barra_vida', ctx, i.x, i.y - v.altura / 2 - 5, 0, 1, {
          fracao: i.vida / i.vidaMaxima,
          largura: v.barra,
        });
      }
    },
  };
})();
