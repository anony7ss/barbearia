import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/site/legal-document";
import { PublicShell } from "@/components/site/public-shell";
import { brand } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Regras de uso, agendamento, cancelamento, reagendamento e comunicacoes da Corte Nobre Barbearia.",
};

const termsSections: LegalSection[] = [
  {
    id: "aceite",
    title: "Aceite dos termos",
    summary:
      "Ao usar o site ou confirmar um agendamento, voce concorda com as regras abaixo.",
    items: [
      "Estes termos regulam o uso do site, agendamento online, area do cliente, consulta por codigo e comunicacoes transacionais da Corte Nobre.",
      "Se voce nao concordar com alguma regra, nao conclua o agendamento pelo site e entre em contato com a barbearia para atendimento alternativo.",
      "O uso do sistema deve respeitar as leis aplicaveis, a boa-fe e a finalidade de agendar ou gerenciar atendimentos reais.",
    ],
  },
  {
    id: "agendamento",
    title: "Agendamento e confirmacao",
    summary:
      "A reserva depende de servico, barbeiro, data, horario e dados de contato validos.",
    items: [
      "O cliente pode agendar sem criar conta ou usando uma conta autenticada.",
      "Antes de confirmar, o sistema mostra servico, preco, duracao, barbeiro e horario disponivel.",
      "A disponibilidade e recalculada no servidor no momento da confirmacao para evitar conflito de horarios.",
      "O agendamento so deve ser considerado confirmado quando a tela de sucesso ou comunicacao transacional indicar confirmacao.",
      "Dados incorretos de contato podem impedir envio de confirmacoes, lembretes, link de consulta ou avisos operacionais.",
    ],
  },
  {
    id: "conta",
    title: "Conta do cliente e acesso convidado",
    summary:
      "A conta e opcional, mas melhora historico, preferencias e remarcacao.",
    items: [
      "Clientes sem conta podem consultar agendamentos por codigo, telefone/email ou link seguro enviado pela barbearia.",
      "Clientes com conta podem visualizar historico, proximos horarios, preferencias e solicitar cancelamento ou reagendamento conforme regras vigentes.",
      "O cliente e responsavel por manter email, telefone e senha protegidos e atualizados.",
      "Nao compartilhe codigos ou links de gerenciamento de agendamento com terceiros, pois eles podem permitir acesso ao horario especifico.",
    ],
  },
  {
    id: "cancelamento-reagendamento",
    title: "Cancelamento e reagendamento",
    summary:
      "Mudancas seguem a antecedencia minima configurada pela administracao.",
    items: [
      "Cancelamentos e reagendamentos podem ser bloqueados quando estiverem fora da janela minima definida pela barbearia.",
      "Ao reagendar, o novo horario depende de disponibilidade real de servico, barbeiro e agenda.",
      "Cancelar ou reagendar nao garante reserva automatica de outro horario.",
      "A barbearia pode registrar motivo de cancelamento, historico de status e informacoes operacionais para atendimento e auditoria.",
      "Em caso de erro operacional, instabilidade ou impossibilidade de atendimento, a barbearia podera propor novo horario ou cancelar a reserva.",
    ],
  },
  {
    id: "pontualidade",
    title: "Pontualidade, atraso e no-show",
    summary:
      "Pontualidade protege a agenda de todos os clientes e profissionais.",
    items: [
      "O cliente deve chegar no horario marcado ou avisar com antecedencia quando nao puder comparecer.",
      "Atrasos podem reduzir o tempo disponivel para o servico, exigir adaptacao do atendimento ou gerar cancelamento operacional.",
      "Faltas sem aviso podem ser registradas como no-show no historico interno.",
      "Clientes com comportamento abusivo, faltas recorrentes ou dados inconsistentes podem ter novos agendamentos sujeitos a aprovacao manual.",
    ],
  },
  {
    id: "servicos-precos",
    title: "Servicos, precos e disponibilidade",
    summary:
      "Informacoes comerciais podem mudar, mas o cliente ve os dados principais antes de confirmar.",
    items: [
      "Precos, duracoes, barbeiros disponiveis, horarios de funcionamento e servicos ativos podem ser alterados pela administracao.",
      "Bloqueios de agenda podem ocorrer por feriados, manutencao, folgas, ferias, treinamentos ou necessidades operacionais.",
      "Imagens, descricoes e exemplos de cortes tem finalidade ilustrativa e nao garantem resultado identico em todos os casos.",
      "Servicos podem depender de avaliacao profissional, condicao do cabelo/barba, tempo disponivel e orientacoes de cuidado.",
    ],
  },
  {
    id: "comunicacoes",
    title: "Comunicacoes transacionais",
    summary:
      "Emails e mensagens operacionais ajudam a confirmar e lembrar horarios.",
    items: [
      "Ao agendar, o cliente aceita receber comunicacoes relacionadas ao horario, como confirmacao, lembrete, cancelamento, reagendamento e pos-atendimento.",
      "Essas comunicacoes podem ocorrer por email, WhatsApp, telefone ou canais informados pelo cliente.",
      "Mensagens promocionais, campanhas ou beneficios de fidelidade devem respeitar preferencias do cliente e regras de privacidade.",
      "A entrega de emails e mensagens depende de dados corretos, provedores externos e disponibilidade dos canais.",
    ],
  },
  {
    id: "uso-adequado",
    title: "Uso adequado do sistema",
    summary:
      "O site deve ser usado apenas para agendamentos reais, contato e gerenciamento de horarios.",
    items: [
      "E proibido usar dados falsos, automatizar tentativas de agendamento, explorar falhas, burlar rate limit ou tentar acessar dados de outros clientes.",
      "Tambem e proibido enviar spam, conteudo ofensivo, ameacas, scripts, cargas maliciosas ou mensagens sem relacao com atendimento.",
      "A barbearia pode bloquear, cancelar ou revisar manualmente agendamentos suspeitos, duplicados, abusivos ou inconsistentes.",
      "Acoes sensiveis podem ser registradas em logs de auditoria para seguranca, suporte e investigacao de incidentes.",
    ],
  },
  {
    id: "responsabilidades",
    title: "Responsabilidades e limitacoes",
    summary:
      "O sistema busca disponibilidade e seguranca, mas pode passar por manutencao ou instabilidade.",
    items: [
      "A Corte Nobre se compromete a manter operacao profissional, comunicacao clara e protecao adequada dos dados.",
      "O cliente e responsavel por informar dados corretos, comparecer no horario e usar os canais oficiais de forma adequada.",
      "Podem ocorrer indisponibilidades por manutencao, falhas de rede, provedores externos, Supabase, Vercel, email, navegador ou conexao do cliente.",
      "A barbearia nao se responsabiliza por perda de horario causada por dados incorretos, falta de acesso ao email/telefone ou compartilhamento indevido de link seguro.",
    ],
  },
  {
    id: "privacidade",
    title: "Privacidade e dados pessoais",
    summary:
      "O uso de dados pessoais segue a politica de privacidade publicada no site.",
    items: [
      "Dados pessoais sao usados para operar agenda, atendimento, autenticacao, comunicacoes transacionais, seguranca e melhoria do servico.",
      "Clientes podem consultar a politica completa em /privacidade.",
      "Solicitacoes sobre dados pessoais devem ser enviadas para o contato oficial da barbearia.",
    ],
  },
  {
    id: "alteracoes",
    title: "Alteracoes dos termos",
    summary:
      "Os termos podem ser atualizados para refletir mudancas no sistema ou na operacao.",
    items: [
      "A versao vigente sera publicada nesta pagina com data de atualizacao.",
      "Mudancas relevantes poderao ser comunicadas pelos canais cadastrados quando necessario.",
      "O uso continuo do site apos atualizacoes indica ciencia dos termos vigentes.",
    ],
  },
];

export default function TermsPage() {
  return (
    <PublicShell>
      <LegalDocument
        eyebrow="Termos de uso"
        title="Regras simples para agendar, remarcar e usar a plataforma."
        intro="Estes termos definem como funciona o agendamento online da Corte Nobre, incluindo conta opcional, consulta por codigo, cancelamento, reagendamento e comunicacoes."
        updatedAt="17 de abril de 2026"
        summary={[
          "Voce pode agendar sem conta, mas precisa informar contato correto.",
          "Cancelamento e reagendamento seguem a janela minima definida pela barbearia.",
          "A disponibilidade e validada no servidor antes de confirmar qualquer horario.",
          "Uso abusivo, dados falsos ou tentativas de acesso indevido podem gerar bloqueio ou cancelamento.",
        ]}
        sections={termsSections}
        closingNote={`Para duvidas sobre termos, agenda, cancelamento ou comunicacoes, fale com a Corte Nobre pelo email ${brand.email} ou telefone ${brand.phone}.`}
      />
    </PublicShell>
  );
}
