# Câmara do Caçador — substitui o Modo Foco

Data: 2026-07-16 · Status: aprovado pelo usuário

## Objetivo
O Modo Foco (timer Pomodoro) é pouco usado. A página `/foco` passa a exibir o
"boneco" do rank atual do jogador com um radar de atributos ao lado — uma sala
de evolução pessoal.

## Layout
Duas colunas (empilha no mobile):

1. **Boneco (esquerda, destaque)** — retrato grande do mais forte do rank atual
   (imagens de `client/public/ranks/`, mesmo mapa do Dashboard), moldura estilo
   Sistema (borda ciano, scanlines), badge de nível, rank, título e barra de XP.
2. **Radar de atributos (direita)** — Chart.js Radar com os 6 atributos
   (Força, Inteligência, Disciplina, Vitalidade, Agilidade, Carisma), estilo
   visual reaproveitado de Estatísticas; lista numérica dos atributos embaixo.

## Navegação
- Item "Modo Foco" vira **"Caçador"** (ícone Swords), rota `/foco` inalterada.
- Label curto no menu mobile: "Caçador".

## Dados
- `dashboard.get` → character (rank, level, title, XP).
- `statistics.get` → attributes (label/value/color).

## Fora do escopo
- Backend de foco (`focus.complete`, `focusXp`) fica intacto, apenas sem UI.
- Demais páginas não mudam.

## Decisões
- Mapa de imagens de rank extraído para `client/src/lib/rankImages.ts`
  (compartilhado entre Dashboard e a nova página).
- Rank "Humano" não tem retrato: mostra fallback (letra), igual ao Dashboard.
