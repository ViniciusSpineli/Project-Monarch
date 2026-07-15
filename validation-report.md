# Relatório de validação — ASCENSION // SYSTEM

## Ambiente verificado

Aplicação verificada em 15/07/2026 no preview de desenvolvimento do projeto `ascension-system`, tanto em desktop quanto em viewport móvel.

## Dashboard

O Dashboard carregou sem autenticação e apresentou avatar, nível 7, título Caçador Desperto, XP total, rank E, sequência de 7 dias, recorde, missão diária do Sistema, seis atributos, quatro skills com nível/XP/tempo, heatmap, conquistas, Boss semanal e frase motivacional. A missão diária automática renderizada foi **Mente Afiada**, marcada como missão do Sistema.

Evidência visual: `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-05-02_2668.webp`.

## Estatísticas

A página Estatísticas renderizou cinco elementos `canvas` acessíveis com `role="img"`, correspondentes aos gráficos Chart.js de XP por período, missões concluídas, atributos, skills e desempenho físico/mental. Também renderizou o heatmap dos últimos 28 dias, os seletores Dia/Semana/Mês e o estado vazio de sessões de foco.

Evidência visual: `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-05-18_4693.webp`.

## Modo Foco

A página exibiu cronômetro Pomodoro em 25:00, seleção de duração 25/50/90 minutos, skill vinculada, recompensa projetada e regra explícita de concessão automática de XP apenas quando o cronômetro chega a zero. Os controles iniciar, reiniciar e novo ciclo estavam disponíveis.

Evidência visual: `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-05-25_7114.webp`.

## Missões

A central de Missões exibiu pesquisa, filtro por status, filtro por tipo, agrupamento e ordenação, além das ações concluir, duplicar e editar. A missão diária automática foi listada com tipo, categoria, prioridade, duração, prazo e XP.

O fluxo **Nova Missão** abriu corretamente um diálogo com título, descrição, tipo, categoria, prioridade, data limite, recompensa, duração e skill vinculada, além das ações cancelar e registrar. O formulário permaneceu sem submissão para preservar o estado inicial entregue ao usuário.

Evidências visuais:

- `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-05-37_7495.webp`
- `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-05-45_7590.webp`

## Backend e regras

A geração diária é idempotente no banco por data e flag `isSystem`. A conclusão de missão concede XP, atualiza atributos, atividade diária, timeline e progresso do Boss; a duplicação preserva os dados da origem e acrescenta o sufixo “— Cópia”. O Modo Foco registra a sessão, concede XP geral e à skill e atualiza telemetria diária. Boss derrotado concede XP, desbloqueia conquista e cria notificação/atividade.

A suíte Vitest contém 15 testes aprovados, incluindo progressão, nível, skills, Pomodoro, Bosses, validação de Missões, seleção diária determinística, duplicação e proteção contra reconclusão. TypeScript e build de produção foram aprovados.

## Acessibilidade e estados

Foram confirmados nomes acessíveis nos botões principais, `role="img"` nos gráficos, labels no formulário, navegação por links sem becos sem saída, foco visível definido no tema, contraste adequado na paleta escura e suporte CSS a `prefers-reduced-motion`. Há estados de carregamento, vazio e erro nas páginas de dados.

## Evolução e Diário

A página Evolução carregou três eventos persistentes na Timeline, com tipos skill, level e achievement, datas, horários, descrições e XP documentado. Também apresentou as abas Timeline, Diário e Recordes e a ação Novo Registro. A interface exibiu o estado de carregamento temático “Recuperando memórias do Sistema” antes de revelar os dados, confirmando a existência de feedback durante consultas.

Evidência visual: `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-06-22_6713.webp`.

## Notificações in-app

O centro de transmissões abriu sobre a interface e exibiu dois eventos persistentes com tratamento visual distinto: **Sequência ampliada** e **Nova missão do Sistema**. A gaveta inclui ação para marcar transmissões como lidas e fechamento acessível. Os demais tipos previstos — level up, nova skill, conquista, título e Boss — utilizam o mesmo contrato tipado com ícone, cor e animação definidos por evento.

Evidência visual: `/home/ubuntu/screenshots/3000-i3dvq0k3j6582jb_2026-07-15_13-06-48_9434.webp`.
