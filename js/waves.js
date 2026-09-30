/*
 * waves.js — Ondas: monta a fila de surgimento a partir de config.ondas e detecta o fim.
 *
 * A fila guarda {tempo, tipo, multiplicadorVida} com tempos absolutos do relógio de ondas.
 * Chamar a próxima onda antes de a atual acabar só acrescenta eventos à fila.
 */
(function () {
  'use strict';
  const TD = window.TD;
  const cfg = TD.config;

  TD.ondas = {
    // Dá para iniciar/chamar a próxima onda agora?
    podeIniciar() {
      const e = TD.estado;
      if (e.onda >= cfg.jogo.totalOndas) return false;
      if (e.fase === 'preparo') return true;
      // Durante uma onda, só depois que todos os inimigos dela já surgiram
      return e.fase === 'onda' && e.fila.length === 0;
    },

    iniciarProxima() {
      const e = TD.estado;
      if (!this.podeIniciar()) return false;
      const chamadaCedo = e.fase === 'onda';
      const numero = e.onda + 1;
      const def = cfg.ondas[numero - 1];

      for (const grupo of def.grupos) {
        for (let i = 0; i < grupo.quantidade; i++) {
          e.fila.push({
            tempo: e.relogioOndas + grupo.atraso + i * grupo.intervalo,
            tipo: grupo.tipo,
            multiplicadorVida: def.vidaMultiplicador,
          });
        }
      }
      e.fila.sort((a, b) => a.tempo - b.tempo);
      e.onda = numero;
      e.bonusPendente += def.bonus;
      e.fase = 'onda';
      if (chamadaCedo && cfg.jogo.bonusChamarCedo > 0) {
        e.ouro += cfg.jogo.bonusChamarCedo;
        TD.ui.mostrarAviso('Onda chamada cedo: +' + cfg.jogo.bonusChamarCedo + ' de ouro');
      }
      TD.game.aoIniciarOnda(numero);
      TD.audio.play('onda_inicio');
      return true;
    },

    atualizar(dt) {
      const e = TD.estado;
      if (e.fase !== 'onda') return;
      e.relogioOndas += dt;
      // Faz surgir todos os inimigos cujo tempo já chegou
      while (e.fila.length && e.fila[0].tempo <= e.relogioOndas) {
        const ev = e.fila.shift();
        TD.inimigos.criar(ev.tipo, ev.multiplicadorVida);
        if (ev.tipo === 'necromante') TD.ui.mostrarAviso('O Necromante chegou!', 2500);
      }
    },

    // Chamado depois das atualizações: a onda acabou quando a fila e o mapa estão vazios.
    verificarFim() {
      const e = TD.estado;
      if (e.fase !== 'onda' || e.fila.length || e.inimigos.length || e.vidas <= 0) return;
      const bonus = e.bonusPendente;
      e.ouro += bonus;
      e.bonusPendente = 0;
      TD.game.aoTerminarOnda(e.onda, bonus);
    },
  };
})();
