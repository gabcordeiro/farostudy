/**
 * Conteudo compartilhado entre o tour de boas-vindas e a pagina de Ajuda,
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
  /** Explicacao mais longa para a pagina de Ajuda. */
  detail: string;
}

export const SECTIONS: SectionInfo[] = [
  {
    to: "/importar",
    label: "Importar",
    Icon: IconUpload,
    summary: "Onde tudo comeca: cole um texto e a IA vira flashcards.",
    detail:
      "Cole o trecho de um edital, um resumo ou um JSON, escolha (ou crie) uma trilha e o Faro monta os flashcards para voce. Cada geracao consome 1 credito. Depois de gerar, da para revisar os cards direto na trilha.",
  },
  {
    to: "/trilhas",
    label: "Trilhas",
    Icon: IconRoute,
    summary: "Suas materias organizadas, com todos os cards de cada uma.",
    detail:
      "Uma trilha e um bloco de estudo: uma materia, um topico do edital ou um idioma. Aqui voce cria, renomeia e exclui trilhas, e ao abrir uma delas ve todos os cards, podendo editar a frente, o verso e a dica de cada um.",
  },
  {
    to: "/estudar",
    label: "Estudar",
    Icon: IconDeck,
    summary: "A revisao do dia, no ritmo que a memoria pede.",
    detail:
      "Mostra so os cards que venceram hoje. Voce le a pergunta, tenta responder de cabeca, revela a resposta e avalia de Errei a Facil. Essa nota decide quando o card volta: errou, ele reaparece logo; acertou facil, ele some por mais tempo. Ha tambem um botao de audio para ouvir o card, util para idiomas.",
  },
  {
    to: "/quiz",
    label: "Quiz",
    Icon: IconQuiz,
    summary: "Multipla escolha gerada por IA a partir dos seus cards.",
    detail:
      "Escolha uma trilha e o Faro monta perguntas de multipla escolha com base nos cards dela. Toda bateria gerada fica salva, entao voce pode refazer quantas vezes quiser sem gastar credito de novo. Os acertos e erros tambem contam para o seu painel.",
  },
  {
    to: "/painel",
    label: "Evolucao",
    Icon: IconChart,
    summary: "Seus numeros: ofensiva, acertos e o que esta esquecendo.",
    detail:
      "O mapa de consistencia mostra sua ofensiva (dias seguidos estudando). A curva de retencao estima quando voce vai comecar a esquecer cada trilha, e o ranking aponta onde voce mais erra, para saber no que focar.",
  },
  {
    to: "/perfil",
    label: "Perfil",
    Icon: IconUser,
    summary: "Seu nome, sua foto e o tema do app.",
    detail:
      "Ajuste seu nome de exibicao e sua foto. O tema (claro, escuro ou o do sistema) fica no rodape da barra lateral e e lembrado no seu navegador.",
  },
  {
    to: "/planos",
    label: "Creditos",
    Icon: IconCoin,
    summary: "Combustivel das geracoes por IA.",
    detail:
      "Cada geracao de cards ou de quiz consome 1 credito. Estudar e refazer quizzes salvos nao custa nada. Toda conta nova comeca com creditos de boas-vindas; quando acabarem, da para pedir mais em Planos. Se a geracao falhar, o credito volta automaticamente.",
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
    body: "Eu sou o Faro. Vou te mostrar em 4 passos como transformar sua materia em revisoes que acontecem na hora certa. Leva menos de um minuto.",
    mood: "cheer",
  },
  {
    title: "1. Traga sua materia",
    body: "Em Importar, voce cola um texto, um resumo ou parte do edital. A IA le esse conteudo e monta os flashcards prontos, dentro da trilha que voce escolher.",
    mood: "search",
  },
  {
    title: "2. Organize em trilhas",
    body: "Cada trilha e uma materia ou um topico. Em Trilhas voce ve todos os cards de cada uma e pode editar ou apagar o que quiser.",
    mood: "search",
  },
  {
    title: "3. Estude todo dia",
    body: "Em Estudar aparecem so os cards que venceram hoje. Responda de cabeca, revele e avalie de Errei a Facil: o que voce erra volta logo, o que acerta demora mais para reaparecer.",
    mood: "search",
  },
  {
    title: "4. Acompanhe sua evolucao",
    body: "Em Evolucao voce ve sua ofensiva de dias seguidos e onde esta esquecendo mais. Pronto: e so comecar. Qualquer duvida, a aba Ajuda tem tudo isso de novo com calma.",
    mood: "cheer",
  },
];
