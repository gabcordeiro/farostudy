/**
 * Conteúdo compartilhado entre o tour de boas-vindas e a página de Ajuda,
 * para as duas nunca divergirem.
 */
import {
  IconChart,
  IconCoin,
  IconDeck,
  IconQuiz,
  IconRoute,
  IconUpload,
  IconUser,
} from "@/components/icons";

type IconComponent = typeof IconChart;

export interface SectionInfo {
  to: string;
  label: string;
  Icon: IconComponent;
  /** Uma frase: o que a aba faz. */
  summary: string;
  /** Explicacao mais longa para a página de Ajuda. */
  detail: string;
}

export const SECTIONS: SectionInfo[] = [
  {
    to: "/importar",
    label: "Importar",
    Icon: IconUpload,
    summary: "Onde tudo começa: cole um texto e a IA vira flashcards.",
    detail:
      "Cole o trecho de um edital, um resumo ou um JSON, escolha (ou crie) uma trilha e o Faro monta os flashcards para você. Cada geração consome 1 crédito. Depois de gerar, dá para revisar os cards direto na trilha.",
  },
  {
    to: "/trilhas",
    label: "Trilhas",
    Icon: IconRoute,
    summary: "Suas matérias organizadas, com todos os cards de cada uma.",
    detail:
      "Uma trilha é um bloco de estudo: uma matéria, um tópico do edital ou um idioma. Aqui você cria, renomeia e exclui trilhas, e ao abrir uma delas vê todos os cards, podendo editar a frente, o verso e a dica de cada um.",
  },
  {
    to: "/estudar",
    label: "Estudar",
    Icon: IconDeck,
    summary: "A revisão do dia, no ritmo que a memória pede.",
    detail:
      "Mostra só os cards que venceram hoje. Você lê a pergunta, tenta responder de cabeça, revela a resposta e avalia de Errei a Fácil. Essa nota decide quando o card volta: errou, ele reaparece logo; acertou fácil, ele some por mais tempo. Há também um botão de áudio para ouvir o card, útil para idiomas.",
  },
  {
    to: "/quiz",
    label: "Quiz",
    Icon: IconQuiz,
    summary: "Múltipla escolha gerada por IA a partir dos seus cards.",
    detail:
      "Escolha uma trilha e o Faro monta perguntas de múltipla escolha com base nos cards dela. Toda bateria gerada fica salva, então você pode refazer quantas vezes quiser sem gastar crédito de novo. Os acertos e erros também contam para o seu painel.",
  },
  {
    to: "/painel",
    label: "Evolução",
    Icon: IconChart,
    summary: "Seus números: ofensiva, acertos e o que está esquecendo.",
    detail:
      "O mapa de consistência mostra sua ofensiva (dias seguidos estudando). A curva de retenção estima quando você vai começar a esquecer cada trilha, e o ranking aponta onde você mais erra, para saber no que focar.",
  },
  {
    to: "/perfil",
    label: "Perfil",
    Icon: IconUser,
    summary: "Seu nome, sua foto e o tema do app.",
    detail:
      "Ajuste seu nome de exibição e sua foto. O tema (claro, escuro ou o do sistema) fica no rodapé da barra lateral e é lembrado no seu navegador.",
  },
  {
    to: "/planos",
    label: "Créditos",
    Icon: IconCoin,
    summary: "Combustivel das gerações por IA.",
    detail:
      "Cada geração de cards ou de quiz consome 1 crédito. Estudar e refazer quizzes salvos não custa nada. Toda conta nova começa com créditos de boas-vindas; quando acabarem, dá para pedir mais em Planos. Se a geração falhar, o crédito volta automaticamente.",
  },
];

export interface TourStep {
  title: string;
  body: string;
  mood: "search" | "cheer" | "sleepy";
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Faro Study",
    body: "Eu sou o Faro. Vou te mostrar em 4 passos como transformar sua matéria em revisões que acontecem na hora certa. Leva menos de um minuto.",
    mood: "cheer",
  },
  {
    title: "1. Traga sua matéria",
    body: "Em Importar, você cola um texto, um resumo ou parte do edital. A IA lê esse conteúdo e monta os flashcards prontos, dentro da trilha que você escolher.",
    mood: "search",
  },
  {
    title: "2. Organize em trilhas",
    body: "Cada trilha é uma matéria ou um tópico. Em Trilhas você vê todos os cards de cada uma e pode editar ou apagar o que quiser.",
    mood: "search",
  },
  {
    title: "3. Estude todo dia",
    body: "Em Estudar aparecem só os cards que venceram hoje. Responda de cabeça, revele e avalie de Errei a Fácil: o que você erra volta logo, o que acerta demora mais para reaparecer.",
    mood: "search",
  },
  {
    title: "4. Acompanhe sua evolução",
    body: "Em Evolução você vê sua ofensiva de dias seguidos e onde está esquecendo mais. Pronto: é só começar. Qualquer dúvida, a aba Ajuda tem tudo isso de novo com calma.",
    mood: "cheer",
  },
];
