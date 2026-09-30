# Defesa do Reino

Tower defense medieval para celular (modo retrato, controle por toque). HTML5 Canvas + JavaScript puro, sem frameworks e sem etapa de build.

Os mortos-vivos seguem pela estrada até os portões do castelo. Construa torres ao lado da estrada e sobreviva às 10 ondas, até o Necromante.

## Como jogar

- **Construir:** toque numa casa de grama marcada ao lado da estrada e escolha Arqueiros, Balista ou Catapulta. As opções que você não pode pagar ficam apagadas.
- **Melhorar ou vender:** toque numa torre. Aparecem o alcance, os atributos do próximo nível e os botões *Melhorar* e *Vender*. A venda devolve parte do ouro investido.
- **Fechar o menu:** toque fora dele.
- **Iniciar onda:** chama a próxima onda. Depois que todos os inimigos da onda atual surgirem, dá para chamar a seguinte antes da hora.
- **❚❚ / 1x·2x / 🔊:** pausa, velocidade do jogo e som.
- A partida é salva automaticamente no fim de cada onda. Ao abrir o jogo de novo, escolha *Continuar* ou *Novo jogo*.

| Torre | Estilo |
|---|---|
| Arqueiros | Rápida, dano baixo, ótima contra fantasmas |
| Balista | Equilibrada, virotes fortes |
| Catapulta | Lenta, dano em área no impacto |

| Inimigo | Estilo |
|---|---|
| Esqueleto | Normal |
| Fantasma | Rápido e frágil |
| Zumbi gigante | Lento, muita vida |
| Necromante | Chefe da onda 10: muita vida e invoca esqueletos |

## Rodar localmente

Abrir o `index.html` direto no navegador funciona. Para testar no celular, use um servidor estático na pasta do projeto:

```bash
npx serve -l 8000 .
```

Se tiver Python instalado, também dá para usar:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador do computador.

### No celular (mesma rede Wi-Fi)

1. Descubra o IP do computador. No Windows, rode `ipconfig` e anote o "Endereço IPv4" (ex.: `192.168.0.15`). No macOS/Linux, use `ipconfig getifaddr en0` ou `hostname -I`.
2. No celular, conectado ao mesmo Wi-Fi, abra `http://192.168.0.15:8000`.
3. Se não abrir, libere a porta no firewall. No Windows, aceite o aviso de "rede privada".
4. Opcional: no menu do navegador, escolha *Adicionar à tela inicial* para abrir como aplicativo.

## Publicar no GitHub Pages

1. Crie uma conta em <https://github.com> (se ainda não tiver).
2. Clique em **New repository**, dê um nome (ex.: `defesa-do-reino`), deixe **Public** e crie.
3. Envie os arquivos. Escolha uma das opções:
   - **Pelo site:** na página do repositório, clique em **uploading an existing file**, arraste todo o conteúdo da pasta (`index.html`, `style.css`, `manifest.json`, `README.md`, `js/`, `icons/`) e clique em **Commit changes**.
   - **Pelo terminal**, dentro da pasta do projeto:
     ```bash
     git init
     git add .
     git commit -m "Primeira versão"
     git branch -M main
     git remote add origin https://github.com/SEU_USUARIO/defesa-do-reino.git
     git push -u origin main
     ```
4. No repositório, vá em **Settings → Pages**. Em **Build and deployment**, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e clique em **Save**.
5. Espere 1 ou 2 minutos. O jogo fica em `https://SEU_USUARIO.github.io/defesa-do-reino/`.
6. Para atualizar, envie os arquivos alterados de novo. O Pages republica sozinho.

Todos os caminhos do projeto são relativos, então o jogo funciona dentro da subpasta do Pages sem ajustes.

## Balancear pelo `js/config.js`

Todo o balanceamento fica em `js/config.js`, e cada valor tem um comentário.

- **Distâncias** estão em *casas* (1 casa = 40 px lógicos), **velocidades** em casas por segundo e a **cadência** em disparos por segundo.
- `jogo`: vidas e ouro iniciais, bônus por chamar onda cedo (`bonusChamarCedo`) e reembolso de venda (`reembolsoVenda`, ex.: `0.6` = 60%).
- `torres.<tipo>.niveis`: três níveis por torre. No nível 1, `custo` é o preço de construção; nos níveis 2 e 3, é o preço da melhoria. A catapulta tem ainda `raioExplosao`.
- `inimigos`: vida, velocidade, recompensa, dano ao castelo (`danoAoCastelo`) e, no Necromante, `invocacao` (intervalo, quantidade, recompensa dos invocados).
- `ondas`: cada onda tem `vidaMultiplicador` (multiplica a vida de todos os inimigos da onda), `bonus` e `grupos`. Cada grupo define tipo, quantidade, intervalo entre inimigos e atraso de início. Para mudar o número de ondas, adicione ou remova entradas da lista.
- `mapa.caminho`: os pontos da estrada, em casas `[coluna, linha]`. As casas de construção são calculadas sozinhas (grama vizinha da estrada).
- `debug.mostrarFps`: mostra o FPS no canto do mapa.

## Trocar a arte por PNGs (`js/assets.js`)

Toda a arte passa por `TD.assets.draw(nome, ctx, x, y, angulo, escala)`. Para trocar um desenho por imagem, basta preencher o objeto `IMAGENS` no topo de `js/assets.js`, sem mexer na lógica do jogo:

```js
const IMAGENS = {
  'balista_nv2':      { src: 'img/balista_nv2.png', largura: 40, altura: 40 },
  'balista_nv2_base': { src: 'img/balista_nv2_base.png', largura: 40, altura: 40 },
  'esqueleto':        { src: 'img/esqueleto.png', largura: 28, altura: 32 },
  'chao':             { src: 'img/mapa.png', largura: 360, altura: 640, ancoraX: 0, ancoraY: 0 },
};
```

- `largura` e `altura` são o tamanho de desenho, em px lógicos. O mapa inteiro tem 360×640 e uma casa tem 40×40. Para ficar nítido em telas de alta densidade, faça o PNG com 2× ou 3× esse tamanho.
- `ancoraX` e `ancoraY` definem que ponto da imagem fica em (x, y). O padrão é `0.5`, o centro.
- Quem **gira** (arma das torres e projéteis) deve ser desenhado **virado para a direita**.
- Se a imagem não carregar, o desenho em código continua valendo.

**Nomes dos sprites:**

- **Torres** (`N` = 1, 2 ou 3): `arqueiros_nvN`, `balista_nvN`, `catapulta_nvN` são a parte que gira; `arqueiros_nvN_base`, `balista_nvN_base`, `catapulta_nvN_base` são a base fixa.
- **Inimigos:** `esqueleto`, `fantasma`, `zumbi`, `necromante`.
- **Projéteis:** `flecha`, `virote`, `pedra`, `sombra_projetil`.
- **Cenário:**
  - `chao` é o gramado, desenhado a partir do canto (0, 0).
  - `estrada` é desenhada a partir dos pontos do caminho.
  - Os demais são `arvore`, `rocha`, `marcador_construcao`, `nevoa_entrada` e `castelo`.
  - Para usar um mapa inteiro pintado, coloque a imagem em `chao` e troque o desenho da `estrada` por uma função vazia (`TD.assets.registrar('estrada', () => {})`).
- **Efeitos e interface:** `explosao`, `impacto`, `morte`, `texto_ouro`, `invocacao`, `perda_vida`, `barra_vida`, `alcance`, `selecao_casa`.

## Trocar os sons (`js/audio.js`)

Todos os sons passam por `TD.audio.play(nome)`. Por padrão eles são sintetizados com Web Audio. Para usar arquivos, preencha `ARQUIVOS` no topo de `js/audio.js`:

```js
const ARQUIVOS = {
  'explosao': { src: 'sons/explosao.mp3', volume: 0.8 },
  'vitoria':  { src: 'sons/vitoria.ogg' },
};
```

Nomes dos sons: `disparo_flecha`, `disparo_virote`, `disparo_pedra`, `impacto`, `explosao`, `morte`, `morte_fantasma`, `morte_chefe`, `invocacao`, `perda_vida`, `construir`, `melhorar`, `vender`, `clique`, `negado`, `onda_inicio`, `onda_fim`, `vitoria` e `derrota`.

O volume geral fica em `config.js` (`audio.volumeGeral`). O áudio só começa depois do primeiro toque na tela, por exigência dos navegadores de celular, e a preferência de mudo é salva.

## Estrutura

```
index.html      página, HUD, botões e telas (início, pausa, resultado)
style.css       layout em retrato
manifest.json   dados para "Adicionar à tela inicial"
icons/          ícones do app
js/config.js    balanceamento e parâmetros
js/storage.js   localStorage (partida, estatísticas, preferências), tolerante a erros
js/assets.js    camada de sprites (desenho em código ou PNG)
js/audio.js     camada de som (Web Audio ou arquivos)
js/map.js       caminho, grade de construção e cenário em cache
js/enemies.js   inimigos, movimento, dano e invocação
js/towers.js    torres, mira, melhoria e venda
js/projectiles.js  projéteis e efeitos visuais
js/waves.js     fila de surgimento das ondas
js/ui.js        HUD, menus de toque e telas
js/game.js      estado, game loop, ciclo da partida e entrada
```

Os scripts são clássicos, carregados em ordem e com um único namespace global (`window.TD`). Por isso o jogo roda tanto em `file://` quanto em servidor estático.
