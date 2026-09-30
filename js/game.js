/*
 * game.js — Núcleo do jogo: estado, game loop, ciclo da partida e entrada por toque.
 * É o último script carregado e dá a partida no jogo.
 */
(function () {
  'use strict';
  const TD = window.TD;
  const cfg = TD.config;

  // ---------------------------------------------------------------------------
  // Utilitários usados pelos outros módulos
  // ---------------------------------------------------------------------------
  TD.util = {
    limitar: (v, min, max) => (v < min ? min : v > max ? max : v),
    // Gerador pseudoaleatório com semente (mulberry32): mesma semente = mesma sequência.
    aleatorioComSemente(semente) {
      let a = semente >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
  };

  // ---------------------------------------------------------------------------
  // Estado da partida (tudo que muda durante o jogo fica aqui)
  // ---------------------------------------------------------------------------
  TD.estado = {
    fase: 'menu',      // 'menu' | 'preparo' (entre ondas) | 'onda' | 'vitoria' | 'derrota'
    pausado: false,
    velocidade: 1,     // multiplicador de tempo (1x ou 2x)
    tempo: 0,          // tempo de jogo acumulado (s), respeita pausa e velocidade
    ouro: 0,
    vidas: 0,
    onda: 0,           // última onda iniciada (0 = nenhuma)
    abates: 0,         // inimigos derrotados nesta partida
    inimigos: [],
    torres: [],
    projeteis: [],
    efeitos: [],
    fila: [],          // inimigos a surgir: [{tempo, tipo, multiplicadorVida}]
    relogioOndas: 0,   // relógio usado pela fila de surgimento
    bonusPendente: 0,  // bônus das ondas em andamento, pago quando o mapa esvaziar
    selecao: null,     // casa selecionada: {coluna, linha}
  };

  // Estatísticas e preferências persistentes (carregadas do localStorage)
  TD.estatisticas = null;
  TD.preferencias = null;

  let canvas, ctx, palco;
  let escalaPixels = 1;  // px físicos do canvas por px lógico
  let ultimoTempo = 0;   // timestamp do quadro anterior (ms)
  const fps = { quadros: 0, acumulado: 0, valor: 0 };

  const emJogo = () => TD.estado.fase === 'preparo' || TD.estado.fase === 'onda';

  TD.game = {
    iniciar() {
      canvas = document.getElementById('tela');
      ctx = canvas.getContext('2d');
      palco = document.getElementById('palco');

      TD.estatisticas = TD.storage.carregarEstatisticas();
      TD.preferencias = TD.storage.carregarPreferencias();
      TD.estado.velocidade = TD.preferencias.velocidade;

      this.bloquearGestos();
      TD.mapa.iniciar();
      TD.audio.iniciar(TD.preferencias.mudo);
      TD.ui.iniciar();

      // Áudio só pode começar depois de um toque (exigência dos navegadores móveis)
      const desbloquear = () => TD.audio.desbloquear();
      ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, desbloquear, true));

      // Redimensiona sempre que a área disponível mudar (rotação, barra do navegador etc.)
      this.redimensionar();
      if (window.ResizeObserver) new ResizeObserver(() => this.redimensionar()).observe(palco);
      window.addEventListener('resize', () => this.redimensionar());

      // Pausa automática quando o app vai para segundo plano
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pausar();
          this.salvarEstatisticas();
          TD.audio.suspender();
        }
      });

      canvas.addEventListener('pointerdown', (e) => this.aoTocarCanvas(e));
      // Toque nas faixas fora do mapa fecha o menu
      palco.addEventListener('pointerdown', (e) => { if (e.target === palco) TD.ui.fecharMenu(); });
      document.addEventListener('keydown', (e) => this.aoTeclar(e));

      this.voltarAoMenu();

      this.quadro = this.quadro.bind(this);
      TD.assets.carregar(() => {
        ultimoTempo = performance.now();
        requestAnimationFrame(this.quadro);
      });
    },

    // Evita zoom por pinça/duplo toque, rolagem e menu de contexto no celular.
    bloquearGestos() {
      const impedir = (ev) => ev.preventDefault();
      document.addEventListener('gesturestart', impedir);            // pinça no iOS
      document.addEventListener('dblclick', impedir);
      document.addEventListener('contextmenu', impedir);
      document.addEventListener('touchmove', impedir, { passive: false });
    },

    // Ajusta o canvas à área disponível mantendo a proporção e usando o devicePixelRatio.
    redimensionar() {
      const largura = palco.clientWidth, altura = palco.clientHeight;
      if (!largura || !altura) return;
      const W = cfg.tela.largura, H = cfg.tela.altura;
      const escalaCss = Math.min(largura / W, altura / H);
      const dpr = Math.min(window.devicePixelRatio || 1, cfg.tela.dprMaximo);
      const cssW = Math.floor(W * escalaCss), cssH = Math.floor(H * escalaCss);
      const pixW = Math.round(cssW * dpr), pixH = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      if (canvas.width !== pixW || canvas.height !== pixH) {
        canvas.width = pixW;
        canvas.height = pixH;
      }
      escalaPixels = pixW / W;
      TD.ui.posicionarMenu();
    },

    // Converte coordenadas lógicas do mapa em px CSS dentro do #palco (para posicionar menus).
    paraPalco(x, y) {
      const escala = canvas.clientWidth / cfg.tela.largura;
      return { x: canvas.offsetLeft + x * escala, y: canvas.offsetTop + y * escala, escala };
    },

    // ---------------------------------------------------------------------------
    // Game loop
    // ---------------------------------------------------------------------------
    quadro(agora) {
      requestAnimationFrame(this.quadro);
      let dt = (agora - ultimoTempo) / 1000;
      ultimoTempo = agora;
      if (!(dt > 0)) dt = 0;

      // FPS real (antes de limitar o delta)
      fps.quadros++;
      fps.acumulado += dt;
      if (fps.acumulado >= 0.5) {
        fps.valor = Math.round(fps.quadros / fps.acumulado);
        fps.quadros = 0;
        fps.acumulado = 0;
      }

      // Limita o delta: depois de uma travada o jogo não "pula" para frente
      if (dt > cfg.loop.dtMaximo) dt = cfg.loop.dtMaximo;

      // Em 2x fazemos duas atualizações com o mesmo dt (simulação igual em qualquer velocidade)
      if (!TD.estado.pausado) {
        for (let i = 0; i < TD.estado.velocidade; i++) this.atualizar(dt);
      }
      this.desenhar(agora / 1000);
      TD.ui.atualizarQuadro();
    },

    atualizar(dt) {
      const e = TD.estado;
      if (!emJogo()) {
        TD.efeitos.atualizar(dt); // deixa as últimas explosões terminarem
        return;
      }
      e.tempo += dt;
      TD.ondas.atualizar(dt);
      TD.inimigos.atualizar(dt);
      TD.torres.atualizar(dt);
      TD.projeteis.atualizar(dt);
      TD.efeitos.atualizar(dt);
      if (e.vidas <= 0) { this.derrota(); return; }
      TD.ondas.verificarFim();
    },

    desenhar(tempoReal) {
      const e = TD.estado;
      ctx.setTransform(escalaPixels, 0, 0, escalaPixels, 0, 0);
      TD.mapa.desenhar(ctx, escalaPixels);

      // Seleção: alcance da torre selecionada ou destaque da casa livre
      if (e.selecao) {
        const torre = TD.torres.naCasa(e.selecao.coluna, e.selecao.linha);
        if (torre) TD.torres.desenharAlcance(ctx, torre);
        const p = TD.mapa.centroCasa(e.selecao.coluna, e.selecao.linha);
        TD.assets.draw('selecao_casa', ctx, p.x, p.y, 0, 1, { pulso: 0.5 + 0.5 * Math.sin(tempoReal * 6) });
      }

      TD.torres.desenhar(ctx);
      TD.inimigos.desenhar(ctx);
      TD.projeteis.desenhar(ctx);
      TD.efeitos.desenhar(ctx);
      TD.inimigos.desenharBarras(ctx);

      if (cfg.debug.mostrarFps) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(cfg.tela.largura - 54, 4, 50, 16);
        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(fps.valor + ' FPS', cfg.tela.largura - 8, 12);
      }
    },

    // ---------------------------------------------------------------------------
    // Ciclo da partida
    // ---------------------------------------------------------------------------

    // Limpa tudo que é da partida (não mexe em estatísticas/preferências).
    limparPartida() {
      const e = TD.estado;
      e.pausado = false;
      e.tempo = 0;
      e.ouro = cfg.jogo.ouroInicial;
      e.vidas = cfg.jogo.vidasIniciais;
      e.onda = 0;
      e.abates = 0;
      e.inimigos = [];
      e.torres = [];
      e.projeteis = [];
      e.efeitos = [];
      e.fila = [];
      e.relogioOndas = 0;
      e.bonusPendente = 0;
      e.selecao = null;
      TD.ui.fecharMenu();
    },

    voltarAoMenu() {
      this.salvarEstatisticas();
      this.limparPartida();
      TD.estado.fase = 'menu';
      TD.ui.mostrarInicio(TD.storage.carregarPartida());
    },

    novoJogo() {
      TD.storage.apagarPartida();
      this.limparPartida();
      TD.estado.fase = 'preparo';
      TD.ui.esconderTelas();
      TD.ui.mostrarAviso('Toque na grama ao lado da estrada para construir', 2500);
    },

    continuarPartida() {
      const p = TD.storage.carregarPartida();
      if (!p) { this.novoJogo(); return; }
      this.limparPartida();
      const e = TD.estado;
      e.ouro = p.ouro;
      e.vidas = p.vidas;
      e.onda = p.onda;
      p.torres.forEach((t) => TD.torres.adicionar(t.tipo, t.coluna, t.linha, t.nivel));
      e.fase = 'preparo';
      TD.ui.esconderTelas();
      TD.ui.mostrarAviso('Partida carregada: próxima é a onda ' + (p.onda + 1));
    },

    aoIniciarOnda(numero) {
      const s = TD.estatisticas;
      if (numero > s.melhorOnda) s.melhorOnda = numero;
      this.salvarEstatisticas();
    },

    aoTerminarOnda(numero, bonus) {
      if (numero >= cfg.jogo.totalOndas) { this.vitoria(); return; }
      TD.estado.fase = 'preparo';
      this.salvarPartida();
      this.salvarEstatisticas();
      TD.audio.play('onda_fim');
      TD.ui.mostrarAviso('Onda ' + numero + ' vencida!' + (bonus > 0 ? ' +' + bonus + ' de ouro' : ''), 2200);
    },

    vitoria() {
      const e = TD.estado;
      e.fase = 'vitoria';
      TD.estatisticas.vitorias++;
      this.salvarEstatisticas();
      TD.storage.apagarPartida();
      TD.ui.fecharMenu();
      TD.audio.play('vitoria');
      TD.ui.mostrarResultado(true);
    },

    derrota() {
      const e = TD.estado;
      e.fase = 'derrota';
      this.salvarEstatisticas();
      TD.storage.apagarPartida();
      TD.ui.fecharMenu();
      TD.audio.play('derrota');
      TD.ui.mostrarResultado(false);
    },

    // Salva a partida (chamado no fim de cada onda).
    salvarPartida() {
      const e = TD.estado;
      TD.storage.salvarPartida({
        onda: e.onda,
        ouro: e.ouro,
        vidas: e.vidas,
        torres: e.torres.map((t) => ({ tipo: t.tipo, coluna: t.coluna, linha: t.linha, nivel: t.nivel })),
      });
    },

    salvarEstatisticas() {
      if (TD.estatisticas) TD.storage.salvarEstatisticas(TD.estatisticas);
    },

    // ---------------------------------------------------------------------------
    // Entrada
    // ---------------------------------------------------------------------------
    aoTocarCanvas(ev) {
      if (!ev.isPrimary) return;
      const r = canvas.getBoundingClientRect();
      const x = (ev.clientX - r.left) * cfg.tela.largura / r.width;
      const y = (ev.clientY - r.top) * cfg.tela.altura / r.height;
      this.aoTocar(x, y);
    },

    // Toque em coordenadas lógicas do mapa.
    aoTocar(x, y) {
      const e = TD.estado;
      if (!emJogo() || e.pausado) return;
      const casa = TD.mapa.casaEm(x, y);
      const temTorre = !!TD.torres.naCasa(casa.coluna, casa.linha);
      if (!temTorre && !TD.mapa.ehConstruivel(casa.coluna, casa.linha)) {
        TD.ui.fecharMenu();
        return;
      }
      // Tocar de novo na casa já selecionada fecha o menu
      if (e.selecao && e.selecao.coluna === casa.coluna && e.selecao.linha === casa.linha) {
        TD.ui.fecharMenu();
        return;
      }
      e.selecao = casa;
      TD.audio.play('clique');
      TD.ui.abrirMenu();
    },

    // Atalhos de teclado (úteis no computador)
    aoTeclar(ev) {
      if (ev.key === 'Escape') TD.ui.fecharMenu();
      else if (ev.key === 'p' || ev.key === 'P') this.alternarPausa();
    },

    // ---------------------------------------------------------------------------
    // Pausa, velocidade e som
    // ---------------------------------------------------------------------------
    pausar() {
      if (!emJogo()) return;
      TD.estado.pausado = true;
      TD.ui.fecharMenu();
    },

    retomar() {
      TD.estado.pausado = false;
      ultimoTempo = performance.now(); // não conta o tempo parado
      TD.audio.retomar();
    },

    alternarPausa() {
      if (TD.estado.pausado) this.retomar(); else this.pausar();
    },

    alternarVelocidade() {
      const opcoes = cfg.loop.velocidades;
      const i = opcoes.indexOf(TD.estado.velocidade);
      TD.estado.velocidade = opcoes[(i + 1) % opcoes.length];
      TD.preferencias.velocidade = TD.estado.velocidade;
      TD.storage.salvarPreferencias(TD.preferencias);
    },

    alternarMudo() {
      TD.preferencias.mudo = !TD.preferencias.mudo;
      TD.audio.definirMudo(TD.preferencias.mudo);
      TD.storage.salvarPreferencias(TD.preferencias);
    },
  };

  // Scripts ficam no fim do <body>, então o DOM já existe aqui.
  TD.game.iniciar();
})();
