import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/site/legal-document";
import { PublicShell } from "@/components/site/public-shell";
import { brand } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Politica de privacidade",
  description:
    "Como a Corte Nobre coleta, usa, protege e permite gerenciar dados pessoais no agendamento online.",
};

const privacySections: LegalSection[] = [
  {
    id: "responsavel",
    title: "Responsavel pelo tratamento",
    summary:
      "A Corte Nobre usa dados pessoais para operar a barbearia, atender clientes e manter o sistema de agendamento.",
    items: [
      `O responsavel operacional por esta politica e ${brand.name}, com atendimento em ${brand.address}.`,
      `Pedidos relacionados a privacidade podem ser enviados para ${brand.email}.`,
      "Esta politica cobre o site, o fluxo de agendamento, a area do cliente, consultas por codigo, formularios de contato e comunicacoes transacionais.",
    ],
  },
  {
    id: "dados-coletados",
    title: "Dados que podemos coletar",
    summary:
      "Coletamos somente dados necessarios para confirmar horarios, identificar o cliente e proteger a operacao.",
    items: [
      "Dados de identificacao e contato: nome, email, telefone e, quando houver conta, identificador de usuario autenticado.",
      "Dados de agendamento: servico escolhido, barbeiro, data, horario, status, codigo de consulta, historico de cancelamento ou reagendamento e observacoes informadas pelo cliente.",
      "Dados de preferencia: barbeiro favorito, servico mais usado, pontos de fidelidade e preferencias salvas pelo proprio cliente.",
      "Dados enviados em formularios: mensagens de contato, motivo de cancelamento, notas solicitadas pelo cliente e respostas de atendimento.",
      "Dados tecnicos de seguranca: endereco IP, identificadores temporarios de rate limit, logs de erro e tentativas de acesso quando necessarios para proteger o sistema.",
    ],
  },
  {
    id: "uso",
    title: "Como usamos os dados",
    summary:
      "O uso e limitado ao funcionamento do servico, atendimento, seguranca e melhoria operacional.",
    items: [
      "Confirmar, consultar, cancelar, reagendar e acompanhar agendamentos.",
      "Enviar emails transacionais, lembretes, avisos de cancelamento, reagendamento e pos-atendimento quando configurados.",
      "Preencher dados automaticamente para clientes logados e acelerar novos agendamentos.",
      "Evitar conflitos de horario, abuso de formularios, tentativas automatizadas e uso indevido de codigos de consulta.",
      "Gerar metricas operacionais agregadas, como ocupacao, servicos mais agendados e recorrencia de clientes, sem vender dados pessoais.",
    ],
  },
  {
    id: "base-legal",
    title: "Base legal e consentimento",
    summary:
      "A coleta tem finalidade clara: executar o agendamento, cumprir obrigacoes e proteger a barbearia.",
    items: [
      "Dados essenciais ao agendamento sao tratados para executar o servico solicitado pelo cliente.",
      "Logs de seguranca, rate limit e auditoria podem ser tratados por legitimo interesse, sempre com acesso restrito.",
      "Comunicacoes transacionais fazem parte do funcionamento do agendamento; mensagens promocionais exigem consentimento ou outra base legal aplicavel.",
      "A conta do cliente e opcional. Quem nao cria conta ainda pode consultar o proprio agendamento por codigo ou link seguro.",
    ],
  },
  {
    id: "compartilhamento",
    title: "Compartilhamento e fornecedores",
    summary:
      "Dados podem passar por fornecedores tecnicos somente para hospedar, autenticar, enviar emails e operar o sistema.",
    items: [
      "Usamos Supabase para autenticacao, banco de dados, permissoes e controles de acesso.",
      "Usamos Vercel para hospedagem, deploy, execucao das rotas de API e entrega do site.",
      "Usamos Resend quando emails transacionais estiverem configurados.",
      "Podemos usar Cloudflare Turnstile para protecao contra abuso em formularios, quando as chaves estiverem ativas.",
      "Nao vendemos, alugamos ou compartilhamos dados pessoais para anuncios de terceiros.",
    ],
  },
  {
    id: "seguranca",
    title: "Seguranca aplicada",
    summary:
      "O projeto foi estruturado para validar acoes sensiveis no servidor e reduzir acesso indevido a dados.",
    items: [
      "As principais tabelas do Supabase usam Row Level Security para separar visitante, cliente autenticado, barbeiro e administrador.",
      "Clientes logados acessam apenas os proprios dados; consultas sem login exigem codigo ou token associado ao agendamento especifico.",
      "Tokens de acesso de convidados sao armazenados em hash, e nao em texto puro.",
      "Rotas sensiveis validam dados no servidor, aplicam rate limit e evitam confiar apenas no frontend.",
      "Secrets, chaves privadas e service role ficam restritos ao servidor e nao devem ser expostos no navegador.",
    ],
  },
  {
    id: "retencao",
    title: "Retencao e exclusao",
    summary:
      "Mantemos dados pelo tempo necessario para atendimento, historico operacional, seguranca e obrigacoes legais.",
    items: [
      "Agendamentos e historico podem ser mantidos para suporte, recorrencia, metricas internas e prevencao de conflitos.",
      "Quando um perfil e desativado, dados podem ser preservados de forma restrita para manter integridade de agendamentos antigos e logs de auditoria.",
      "Mensagens de contato e notificacoes podem ser retidas enquanto forem uteis para atendimento ou registro operacional.",
      "Pedidos de exclusao serao analisados considerando obrigacoes legais, necessidade de auditoria e prevencao de fraude.",
    ],
  },
  {
    id: "direitos",
    title: "Direitos do titular",
    summary:
      "O cliente pode solicitar acesso, correcao, portabilidade, revisao ou exclusao quando aplicavel.",
    items: [
      "Voce pode pedir confirmacao de tratamento, acesso aos dados, correcao de dados incompletos ou desatualizados e informacoes sobre compartilhamento.",
      "Tambem pode solicitar exclusao, anonimizacao, limitacao de uso ou revisao de preferencias, respeitando prazos e obrigacoes legais.",
      `Solicitacoes devem ser enviadas para ${brand.email}, preferencialmente com nome, telefone e email usados no agendamento.`,
      "Para proteger sua privacidade, poderemos solicitar verificacao de identidade antes de atender pedidos sobre dados pessoais.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies e tecnologias similares",
    summary:
      "Cookies sao usados para sessao, seguranca e funcionamento do site, nao para vender dados.",
    items: [
      "Cookies de autenticacao podem ser usados para manter a sessao de clientes, barbeiros e administradores.",
      "Recursos de seguranca podem usar identificadores temporarios para reduzir spam, tentativas repetidas e abuso de formularios.",
      "Se ferramentas de analytics forem ativadas no futuro, elas deverao respeitar esta politica e ser usadas para metricas agregadas de produto.",
      "O bloqueio de cookies essenciais pode impedir login, area do cliente, painel administrativo ou consulta segura de agendamentos.",
    ],
  },
  {
    id: "atualizacoes",
    title: "Atualizacoes desta politica",
    summary:
      "A politica pode mudar quando o sistema, fornecedores ou regras operacionais mudarem.",
    items: [
      "Alteracoes relevantes serao publicadas nesta pagina com data de atualizacao.",
      "Quando uma mudanca impactar significativamente o uso dos dados, poderemos comunicar clientes pelos canais cadastrados.",
      "O uso continuo do site apos atualizacoes indica ciencia da versao vigente, sem retirar direitos previstos em lei.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PublicShell>
      <LegalDocument
        eyebrow="Privacidade"
        title="Dados claros, acesso restrito e controle do cliente."
        intro="Esta politica explica quais dados a Corte Nobre trata, por que eles sao usados e como protegemos informacoes de agendamento, conta e atendimento."
        updatedAt="17 de abril de 2026"
        summary={[
          "A conta e opcional; o agendamento sem login continua disponivel por codigo ou link seguro.",
          "Dados sao usados para agenda, atendimento, seguranca, comunicacoes transacionais e operacao interna.",
          "Admins e barbeiros acessam apenas o necessario para operar o servico.",
          "Voce pode solicitar acesso, correcao ou exclusao quando aplicavel.",
        ]}
        sections={privacySections}
        closingNote={`Envie sua solicitacao para ${brand.email} ou fale pelo telefone ${brand.phone}. Para pedidos sobre dados pessoais, informe o contato usado no agendamento para verificacao.`}
      />
    </PublicShell>
  );
}
