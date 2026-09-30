/*
 * projectiles.js — Projéteis (flechas, virotes, pedras) e efeitos visuais passageiros.
 *
 * Flechas e virotes perseguem o alvo. A pedra da catapulta faz um arco até o ponto onde
 * o alvo estará (previsão simples) e explode, causando dano em área.
 */
(function () {
  'use strict';
  const TD = window.TD;
  const cfg = TD.config;
  const CASA = () => cfg.tela.tamanhoCasa;
  const VIDA_MAXIMA = 4; // s: projétil perdido some depois disso

  TD.projeteis = {
    // Cria o projétil de uma torre contra um alvo.
    disparar(torre, alvo, def, at) {
      const velocidade = at.velocidadeProjetil * CASA();
      // Sai da ponta da arma, não do centro da torre
      const x = torre.x + Math.cos(torre.angulo) * 12;
      const y = torre.y + Math.sin(torre.angulo) * 12;
      const p = {
        tipo: def.projetil,
        x, y,
        angulo: torre.angulo,
        velocidade,
        dano: at.dano,
        alvo,
        destinoX: alvo.x, destinoY: alvo.y,
        idade: 0,
        ativo: true,
      };
      if (def.projetil === 'pedra') {
        // Prevê onde o alvo estará quando a pedra cair
        const tempo = Math.hypot(alvo.x - x, alvo.y - y) / velocidade;
        const futuro = TD.mapa.posicaoNaDistancia(Math.min(alvo.distancia + alvo.velocidade * tempo, TD.mapa.comprimento));
        p.origemX = x; p.origemY = y;
        p.destinoX = futuro.x; p.destinoY = futuro.y;
        p.duracao = Math.max(0.3, Math.hypot(futuro.x - x, futuro.y - y) / velocidade);
        p.raioExplosao = at.raioExplosao * CASA();
        p.alvo = null; // não persegue
      }
      TD.estado.projeteis.push(p);
      TD.audio.play('disparo_' + def.projetil);
    },

    atualizar(dt) {
      const e = TD.estado;
      for (const p of e.projeteis) {
        p.idade += dt;
        if (p.tipo === 'pedra') this.atualizarPedra(p);
        else this.atualizarTeleguiado(p, dt);
        if (p.idade > VIDA_MAXIMA) p.ativo = false;
      }
      e.projeteis = e.projeteis.filter((p) => p.ativo);
    },

    atualizarTeleguiado(p, dt) {
      // Segue o alvo enquanto ele estiver vivo; senão vai até a última posição conhecida
      if (p.alvo && p.alvo.vivo) { p.destinoX = p.alvo.x; p.destinoY = p.alvo.y; }
      const dx = p.destinoX - p.x, dy = p.destinoY - p.y;
      const dist = Math.hypot(dx, dy);
      const passo = p.velocidade * dt;
      p.angulo = Math.atan2(dy, dx);
      if (dist <= passo + 4) {
        p.ativo = false;
        if (p.alvo && p.alvo.vivo) {
          TD.inimigos.causarDano(p.alvo, p.dano);
          TD.efeitos.criar('impacto', p.destinoX, p.destinoY, 0.2);
          TD.audio.play('impacto');
        }
        return;
      }
      p.x += (dx / dist) * passo;
      p.y += (dy / dist) * passo;
    },

    atualizarPedra(p) {
      const t = Math.min(1, p.idade / p.duracao);
      p.progresso = t;
      p.x = p.origemX + (p.destinoX - p.origemX) * t;
      p.y = p.origemY + (p.destinoY - p.origemY) * t;
      if (t >= 1) {
        p.ativo = false;
        for (const inimigo of TD.inimigos.naArea(p.x, p.y, p.raioExplosao)) {
          TD.inimigos.causarDano(inimigo, p.dano);
        }
        TD.efeitos.criar('explosao', p.x, p.y, 0.45, { raio: p.raioExplosao });
        TD.audio.play('explosao');
      }
    },

    desenhar(ctx) {
      for (const p of TD.estado.projeteis) {
        if (p.tipo === 'pedra') {
          // Arco: a pedra sobe e desce; a sombra fica no chão
          const altura = Math.sin(Math.PI * p.progresso) * Math.min(60, 20 + p.duracao * 40);
          TD.assets.draw('sombra_projetil', ctx, p.x, p.y, 0, 1 - 0.4 * Math.sin(Math.PI * p.progresso));
          TD.assets.draw('pedra', ctx, p.x, p.y - altura, p.idade * 8, 1 + altura / 90);
        } else {
          TD.assets.draw(p.tipo, ctx, p.x, p.y, p.angulo);
        }
      }
    },
  };

  // ===========================================================================
  // Efeitos visuais (explosões, faíscas, textos de ouro...). Só visual, sem lógica de jogo.
  // ===========================================================================
  TD.efeitos = {
    criar(nome, x, y, duracao, opcoes) {
      TD.estado.efeitos.push({ nome, x, y, t: 0, duracao, opcoes: opcoes || {} });
    },

    atualizar(dt) {
      const e = TD.estado;
      for (const ef of e.efeitos) ef.t += dt;
      e.efeitos = e.efeitos.filter((ef) => ef.t < ef.duracao);
    },

    desenhar(ctx) {
      for (const ef of TD.estado.efeitos) {
        ef.opcoes.progresso = ef.t / ef.duracao;
        TD.assets.draw(ef.nome, ctx, ef.x, ef.y, 0, 1, ef.opcoes);
      }
    },
  };
})();
