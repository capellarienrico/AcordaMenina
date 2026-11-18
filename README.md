# AcordaMenina

> Aplicativo de produtividade e alertas de reuniões em tela cheia com sincronização de múltiplos calendários Google, sem limites de contas ou restrições de planos pagos.

Inspirado pelo conceito do *In Your Face*, o **AcordaMenina** garante que você nunca mais se atrase para uma reunião ou esqueça um compromisso, exibindo um alerta imersivo e impossível de ignorar no exato momento configurado.

---

## Recursos

- **Alerta em Tela Cheia (Overlay Imersivo):** Janela escura que toma o foco sobre qualquer janela ou jogo quando está na hora do compromisso.
- **Detecção Inteligente de Videoconferência:** Reconhece automaticamente links do **Google Meet**, **Zoom**, **Microsoft Teams** e **Webex**, com botão direto *"Entrar na Reunião"*.
- **Sem Limites de Contas:** Sem limite de alertas, sem limite de contas e sem limites de calendários. Adicione quantas agendas quiser (Pessoal, Trabalho, Família, Feriados).
- **Sons Customizáveis:** Sintetizador de áudio Web Audio embutido (Chime, Sino Zen, Pulso Digital, Despertar Suave e Fanfarra) com pré-escuta instantânea.
- **Soneca Rápida (Snooze):** Botões personalizáveis de adiamento (+1 min, +3 min, +5 min) e fechamento rápido via tecla `ESC` ou `Enter`.
- **Filtros Avançados:** Filtre por reuniões aceitas, apenas com vídeo, eventos de dia inteiro e intervalo de dias futuros.
- **Bandeja do Sistema (System Tray):** Funciona discretamente em segundo plano ao lado do relógio do Windows com menu de status.

---

## Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)

### Instalação e Execução
```bash
# Clone o repositório
git clone https://github.com/capellarienrico/AcordaMenina.git
cd AcordaMenina

# Instale as dependências
npm install

# Inicie o aplicativo
npm start
```

---

## Como Adicionar sua Agenda do Google

1. Abra o **Google Agenda** no seu navegador ([calendar.google.com](https://calendar.google.com)).
2. Na barra lateral esquerda, passe o mouse sobre a agenda desejada e clique nos **3 pontos verticais** &gt; **Configurações e compart.**
3. Role a página até a seção **"Integrar agenda"**.
4. Copie a URL do campo **"Endereço secreto no formato iCal"**.
5. Abra o **AcordaMenina**, vá na aba **Calendários**, cole o link e clique em **Adicionar Calendário**!

---

## Tecnologias Utilizadas

- **Electron** (Processo desktop nativo e janelas sem bordas)
- **Web Audio API** (Sintetizador sonoro integrado sem dependências externas de áudio)
- **node-ical** (Parser local rápido e privado de feeds iCal)
- **HTML5 & Modern CSS** (Interface Fluent Design inspirada no Windows 11)

---

## Autor

Desenvolvido por **[capellarienrico](https://github.com/capellarienrico)**.  
Licença MIT.
