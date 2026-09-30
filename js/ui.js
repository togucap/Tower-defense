/*
 * ui.js — Interface em HTML/CSS por cima do canvas: HUD, botões, menus de construção
 * e de torre, telas de início/pausa/resultado e avisos.
 */
(function () {
  'use strict';
  const TD = window.TD;
  const cfg = TD.config;
  const $ = (id) => document.getElementById(id);
  const numero = (v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  let el = {};
  let temporizadorAviso = 0;
  let ultimaChave = '';     // evita mexer no DOM quando nada mudou
  let botoesMenu = [];      // [{botao, custo: () => number|null}] para habilitar/desabilitar

  // Liga um botão a uma ação, com som de clique.
  function aoClicar(botao, acao) {
    botao.addEventListener('click', () => {
      TD.audio.play('clique');
      acao();
    });
  }

  function criar(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  // Moedinha + valor (ex.: "● 90")
  function comOuro(valor, prefixo) {
    const span = criar('span', 'valor-ouro');
    span.appendChild(criar('span', 'icone icone-ouro'));
    span.appendChild(document.createTextNode((prefixo || '') + valor));
    return span;
  }

  // Desenha o ícone de uma torre num canvas pequeno usando os mesmos sprites do jogo.
  function iconeTorre(tipo, nivel) {
    const tamanho = 44;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const c = criar('canvas', 'icone-torre');
    c.width = tamanho * dpr;
    c.height = tamanho * dpr;
    c.style.width = tamanho + 'px';
    c.style.height = tamanho + 'px';
    const g = c.getContext('2d');
    const escala = (tamanho / 40) * dpr;
    g.setTransform(escala, 0, 0, escala, 0, 0);
    TD.assets.draw(tipo + '_nv' + nivel + '_base', g, 20, 20);
    TD.assets.draw(tipo + '_nv' + nivel, g, 20, 20, -Math.PI / 2);
    return c;
  }

  function listaEstatisticas(ul, itens) {
    ul.innerHTML = '';
    itens.forEach(([rotulo, valor]) => {
      const li = criar('li');
      li.appendChild(criar('span', '', rotulo));
      li.appendChild(criar('strong', '', valor));
      ul.appendChild(li);
    });
  }

  TD.ui = {
    iniciar() {
      el = {
        vidas: $('hud-vidas'),
        ouro: $('hud-ouro'),
        onda: $('hud-onda'),
        btnPausa: $('btn-pausa'),
        btnVelocidade: $('btn-velocidade'),
        btnSom: $('btn-som'),
        btnOnda: $('btn-onda'),
        menu: $('menu-contexto'),
        aviso: $('aviso'),
        telaInicio: $('tela-inicio'),
        btnContinuarPartida: $('btn-continuar-partida'),
        btnNovoJogo: $('btn-novo-jogo'),
        inicioEstatisticas: $('inicio-estatisticas'),
        telaPausa: $('tela-pausa'),
        btnContinuar: $('btn-continuar'),
        btnSairMenu: $('btn-sair-menu'),
        telaResultado: $('tela-resultado'),
        resultadoTitulo: $('resultado-titulo'),
        resultadoTexto: $('resultado-texto'),
        resultadoEstatisticas: $('resultado-estatisticas'),
        btnJogarNovamente: $('btn-jogar-novamente'),
        btnResultadoMenu: $('btn-resultado-menu'),
      };
      aoClicar(el.btnPausa, () => TD.game.alternarPausa());
      aoClicar(el.btnContinuar, () => TD.game.retomar());
      aoClicar(el.btnSairMenu, () => TD.game.voltarAoMenu());
      aoClicar(el.btnVelocidade, () => TD.game.alternarVelocidade());
      el.btnSom.addEventListener('click', () => { TD.game.alternarMudo(); TD.audio.play('clique'); });
      el.btnOnda.addEventListener('click', () => {
        if (!TD.ondas.iniciarProxima()) TD.audio.play('negado');
      });
      aoClicar(el.btnNovoJogo, () => TD.game.novoJogo());
      aoClicar(el.btnContinuarPartida, () => TD.game.continuarPartida());
      aoClicar(el.btnJogarNovamente, () => TD.game.novoJogo());
      aoClicar(el.btnResultadoMenu, () => TD.game.voltarAoMenu());
    },

    // Chamado todo quadro: atualiza HUD, botões e menu só quando algo mudou.
    atualizarQuadro() {
      const e = TD.estado;
      const podeOnda = TD.ondas.podeIniciar();
      const chave = [e.ouro, e.vidas, e.onda, e.fase, e.pausado, e.velocidade,
        TD.audio.estaMudo(), podeOnda, !!e.selecao].join('|');
      if (chave === ultimaChave) return;
      ultimaChave = chave;

      const emJogo = e.fase === 'preparo' || e.fase === 'onda';
      el.vidas.textContent = e.vidas;
      el.ouro.textContent = e.ouro;
      el.onda.textContent = e.onda + '/' + cfg.jogo.totalOndas;

      el.btnPausa.textContent = e.pausado ? '▶' : '❚❚';
      el.btnPausa.setAttribute('aria-label', e.pausado ? 'Continuar' : 'Pausar');
      el.btnPausa.disabled = !emJogo;
      el.btnVelocidade.textContent = e.velocidade + 'x';
      el.btnVelocidade.disabled = !emJogo;
      el.btnSom.textContent = TD.audio.estaMudo() ? '🔇' : '🔊';
      el.btnSom.setAttribute('aria-label', TD.audio.estaMudo() ? 'Ativar som' : 'Desativar som');
      el.telaPausa.hidden = !(emJogo && e.pausado);

      // Botão de onda
      const proxima = e.onda + 1;
      let rotulo;
      if (e.fase === 'onda' && podeOnda) rotulo = 'Chamar onda ' + proxima;
      else if (e.fase === 'onda') rotulo = e.onda >= cfg.jogo.totalOndas ? 'Última onda!' : 'Onda ' + e.onda + ' em curso';
      else rotulo = 'Iniciar onda ' + Math.min(proxima, cfg.jogo.totalOndas);
      el.btnOnda.textContent = rotulo;
      el.btnOnda.disabled = !emJogo || e.pausado || !podeOnda;

      // Menu aberto: habilita só o que dá para pagar
      botoesMenu.forEach(({ botao, custo }) => {
        const c = custo();
        botao.disabled = c === null || e.ouro < c;
      });
    },

    // ---------------------------------------------------------------------------
    // Menu de contexto (construção / torre)
    // ---------------------------------------------------------------------------
    abrirMenu() {
      const sel = TD.estado.selecao;
      if (!sel) return;
      const torre = TD.torres.naCasa(sel.coluna, sel.linha);
      el.menu.innerHTML = '';
      botoesMenu = [];
      if (torre) this.montarMenuTorre(torre);
      else this.montarMenuConstrucao(sel);
      el.menu.hidden = false;
      ultimaChave = ''; // força atualizar os estados dos botões
      this.atualizarQuadro();
      this.posicionarMenu();
    },

    montarMenuConstrucao(sel) {
      el.menu.className = 'menu-contexto menu-construcao';
      Object.keys(cfg.torres).forEach((tipo) => {
        const def = cfg.torres[tipo];
        const botao = criar('button', 'opcao-torre');
        botao.appendChild(iconeTorre(tipo, 1));
        botao.appendChild(criar('span', 'opcao-nome', def.nome));
        botao.appendChild(criar('span', 'opcao-descricao', def.descricao));
        botao.appendChild(comOuro(TD.torres.custoConstrucao(tipo)));
        botao.addEventListener('click', () => {
          if (TD.torres.construir(tipo, sel.coluna, sel.linha)) this.fecharMenu();
          else TD.audio.play('negado');
        });
        el.menu.appendChild(botao);
        botoesMenu.push({ botao, custo: () => TD.torres.custoConstrucao(tipo) });
      });
    },

    montarMenuTorre(torre) {
      el.menu.className = 'menu-contexto menu-torre';
      const def = cfg.torres[torre.tipo];
      const at = def.niveis[torre.nivel];
      const prox = def.niveis[torre.nivel + 1] || null;

      const titulo = criar('div', 'menu-titulo');
      titulo.appendChild(criar('strong', '', def.nome));
      titulo.appendChild(criar('span', '', 'Nível ' + (torre.nivel + 1) + '/' + def.niveis.length));
      el.menu.appendChild(titulo);

      // Atributos atuais (→ próximo nível, se houver)
      const atributos = criar('div', 'menu-atributos');
      const linha = (rotulo, campo, sufixo) => {
        const d = criar('span', 'atributo');
        let texto = rotulo + ' ' + numero(at[campo]) + (sufixo || '');
        if (prox && prox[campo] !== at[campo]) texto += ' → ' + numero(prox[campo]) + (sufixo || '');
        d.textContent = texto;
        atributos.appendChild(d);
      };
      linha('Dano', 'dano');
      linha('Alcance', 'alcance');
      linha('Cadência', 'cadencia', '/s');
      if (at.raioExplosao) linha('Área', 'raioExplosao');
      el.menu.appendChild(atributos);

      const acoes = criar('div', 'menu-acoes');
      const melhorar = criar('button', 'botao botao-acao');
      if (prox) {
        melhorar.appendChild(criar('span', '', 'Melhorar'));
        melhorar.appendChild(comOuro(prox.custo));
        melhorar.addEventListener('click', () => {
          if (TD.torres.melhorar(torre)) this.abrirMenu(); // reabre com os novos valores
          else TD.audio.play('negado');
        });
      } else {
        melhorar.appendChild(criar('span', '', 'Nível máximo'));
      }
      botoesMenu.push({ botao: melhorar, custo: () => TD.torres.custoMelhoria(torre) });

      const vender = criar('button', 'botao botao-acao botao-vender');
      vender.appendChild(criar('span', '', 'Vender'));
      vender.appendChild(comOuro(TD.torres.valorVenda(torre), '+'));
      vender.addEventListener('click', () => {
        TD.torres.vender(torre);
        this.fecharMenu();
      });

      acoes.appendChild(melhorar);
      acoes.appendChild(vender);
      el.menu.appendChild(acoes);
    },

    // Coloca o menu acima da casa selecionada (ou abaixo, se não couber).
    posicionarMenu() {
      const sel = TD.estado.selecao;
      if (!sel || !el.menu || el.menu.hidden) return;
      const t = cfg.tela.tamanhoCasa;
      const centro = TD.game.paraPalco((sel.coluna + 0.5) * t, (sel.linha + 0.5) * t);
      const meia = (t / 2) * centro.escala;
      const palco = el.menu.parentElement;
      const w = el.menu.offsetWidth, h = el.menu.offsetHeight;
      let top = centro.y - meia - h - 8;
      if (top < 4) top = centro.y + meia + 8;
      top = Math.min(top, palco.clientHeight - h - 4);
      const left = TD.util.limitar(centro.x - w / 2, 4, Math.max(4, palco.clientWidth - w - 4));
      el.menu.style.left = left + 'px';
      el.menu.style.top = Math.max(4, top) + 'px';
    },

    fecharMenu() {
      TD.estado.selecao = null;
      botoesMenu = [];
      if (el.menu) {
        el.menu.hidden = true;
        el.menu.innerHTML = '';
      }
    },

    // ---------------------------------------------------------------------------
    // Telas
    // ---------------------------------------------------------------------------
    mostrarInicio(partidaSalva) {
      this.esconderTelas();
      const s = TD.estatisticas;
      el.btnContinuarPartida.hidden = !partidaSalva;
      if (partidaSalva) {
        el.btnContinuarPartida.textContent = 'Continuar (onda ' + (partidaSalva.onda + 1) + ')';
        el.btnNovoJogo.classList.remove('botao-principal');
      } else {
        el.btnNovoJogo.classList.add('botao-principal');
      }
      listaEstatisticas(el.inicioEstatisticas, [
        ['Melhor onda', s.melhorOnda + '/' + cfg.jogo.totalOndas],
        ['Vitórias', numero(s.vitorias)],
        ['Inimigos derrotados', numero(s.inimigosDerrotados)],
      ]);
      el.telaInicio.hidden = false;
      ultimaChave = '';
    },

    mostrarResultado(venceu) {
      const e = TD.estado;
      el.resultadoTitulo.textContent = venceu ? 'Vitória!' : 'Derrota';
      el.resultadoTitulo.className = venceu ? 'titulo-vitoria' : 'titulo-derrota';
      el.resultadoTexto.textContent = venceu
        ? 'O Necromante caiu e o reino está a salvo!'
        : 'Os mortos-vivos invadiram o castelo na onda ' + e.onda + '.';
      const itens = [['Inimigos derrotados', numero(e.abates)]];
      if (venceu) itens.push(['Vidas restantes', e.vidas + '/' + cfg.jogo.vidasIniciais]);
      else itens.push(['Onda alcançada', e.onda + '/' + cfg.jogo.totalOndas]);
      itens.push(['Melhor onda', TD.estatisticas.melhorOnda + '/' + cfg.jogo.totalOndas]);
      itens.push(['Vitórias', numero(TD.estatisticas.vitorias)]);
      listaEstatisticas(el.resultadoEstatisticas, itens);
      el.telaResultado.hidden = false;
      ultimaChave = '';
    },

    esconderTelas() {
      el.telaInicio.hidden = true;
      el.telaResultado.hidden = true;
      el.telaPausa.hidden = true;
      ultimaChave = '';
    },

    // Mensagem curta no topo do mapa.
    mostrarAviso(texto, duracao) {
      el.aviso.textContent = texto;
      el.aviso.classList.add('visivel');
      clearTimeout(temporizadorAviso);
      temporizadorAviso = setTimeout(() => el.aviso.classList.remove('visivel'), duracao || 1800);
    },
  };
})();
