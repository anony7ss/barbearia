export const subscriptionPlans = [
  {
    id: "essencial",
    envKey: "ESSENCIAL",
    name: "Essencial",
    eyebrow: "manutencao mensal",
    priceCents: 9900,
    intervalLabel: "mes",
    description: "Para manter o corte executivo sempre em dia, sem improviso na agenda.",
    checkoutName: "Corte Nobre Essencial",
    checkoutDescription: "Assinatura mensal com 1 corte executivo e beneficios de recorrencia.",
    highlight: "entrada",
    featured: false,
    includes: [
      "1 corte executivo por mes",
      "Historico e preferencias salvos",
      "Reagendamento facilitado",
      "Beneficios futuros de fidelidade",
    ],
  },
  {
    id: "prime",
    envKey: "PRIME",
    name: "Prime",
    eyebrow: "mais equilibrado",
    priceCents: 14900,
    intervalLabel: "mes",
    description: "O plano principal para quem quer cabelo e barba com constancia.",
    checkoutName: "Corte Nobre Prime",
    checkoutDescription: "Assinatura mensal com corte, barba e prioridade operacional.",
    highlight: "mais indicado",
    featured: true,
    includes: [
      "1 corte + barba por mes",
      "Prioridade em horarios recorrentes",
      "10% em servicos extras",
      "Preferencia de barbeiro salva",
    ],
  },
  {
    id: "black",
    envKey: "BLACK",
    name: "Black",
    eyebrow: "rotina completa",
    priceCents: 21900,
    intervalLabel: "mes",
    description: "Para quem precisa de imagem sempre alinhada e agenda com mais prioridade.",
    checkoutName: "Corte Nobre Black",
    checkoutDescription: "Assinatura mensal com 2 visitas e prioridade ampliada.",
    highlight: "premium",
    featured: false,
    includes: [
      "2 visitas mensais",
      "Prioridade alta na agenda",
      "Barbeiro favorito como padrao",
      "Ajustes rapidos conforme disponibilidade",
    ],
  },
] as const;

export type SubscriptionPlan = (typeof subscriptionPlans)[number];
export type SubscriptionPlanId = SubscriptionPlan["id"];

export function getSubscriptionPlan(planId: string) {
  return subscriptionPlans.find((plan) => plan.id === planId) ?? null;
}
