export const brand = {
  name: "Corte Nobre",
  tagline: "barbearia premium",
  phone: "+55 11 95555-0137",
  whatsapp: "5511955550137",
  email: "agenda@cortenobre.com.br",
  address: "Rua Oscar Freire, 742 - Jardins, Sao Paulo - SP",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Rua%20Oscar%20Freire%20742%20Sao%20Paulo",
  hours: [
    "Segunda a sexta, 9h as 20h",
    "Sabado, 9h as 18h",
    "Domingo, fechado",
  ],
};

export const heroImage =
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=2200&q=86";

export const galleryImages = [
  "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1593702288056-7927b442d344?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1400&q=82",
];

export const services = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Corte Executivo",
    slug: "corte-executivo",
    durationMinutes: 45,
    priceCents: 9000,
    description:
      "Corte alinhado ao seu estilo, finalizado com lavagem e styling discreto.",
    highlight: "Mais escolhido",
    idealFor: "rotina executiva e visual alinhado sem exagero",
    includes: ["consultoria curta", "lavagem", "finalizacao"],
    result: "corte limpo, facil de manter e pronto para a semana",
  },
  {
    id: "11111111-1111-4111-8111-111111111112",
    name: "Barba Classica",
    slug: "barba-classica",
    durationMinutes: 35,
    priceCents: 7000,
    description:
      "Toalha quente, desenho preciso, navalha e hidratacao para acabamento limpo.",
    highlight: "Ritual premium",
    idealFor: "barba marcada com conforto e acabamento de navalha",
    includes: ["toalha quente", "oleo pre-shave", "hidratacao"],
    result: "contorno definido e pele menos irritada",
  },
  {
    id: "11111111-1111-4111-8111-111111111113",
    name: "Corte + Barba",
    slug: "corte-barba",
    durationMinutes: 75,
    priceCents: 14500,
    description:
      "Experiencia completa para sair pronto: cabelo, barba e acabamento.",
    highlight: "Melhor valor",
    idealFor: "quem quer resolver visual completo em uma visita",
    includes: ["corte", "barba", "lavagem", "styling"],
    result: "conjunto harmonico entre cabelo e barba",
  },
  {
    id: "11111111-1111-4111-8111-111111111114",
    name: "Sobrancelha",
    slug: "sobrancelha",
    durationMinutes: 15,
    priceCents: 3000,
    description:
      "Limpeza e alinhamento natural para reforcar expressao sem exagero.",
    highlight: "Rapido",
    idealFor: "ajuste discreto entre cortes",
    includes: ["limpeza", "alinhamento", "acabamento natural"],
    result: "expressao mais limpa sem artificialidade",
  },
  {
    id: "11111111-1111-4111-8111-111111111115",
    name: "Pigmentacao de Barba",
    slug: "pigmentacao-barba",
    durationMinutes: 50,
    priceCents: 11000,
    description:
      "Correcoes pontuais e preenchimento com acabamento natural e sobrio.",
    highlight: "Acabamento natural",
    idealFor: "falhas leves e barba com pouca densidade",
    includes: ["analise de tom", "aplicacao pontual", "finalizacao"],
    result: "barba visualmente mais uniforme",
  },
  {
    id: "11111111-1111-4111-8111-111111111116",
    name: "Dia do Noivo",
    slug: "dia-do-noivo",
    durationMinutes: 120,
    priceCents: 26000,
    description:
      "Atendimento reservado com cabelo, barba, cuidados faciais e finalizacao.",
    highlight: "Sob consulta",
    idealFor: "eventos, casamento e dias de imagem importante",
    includes: ["atendimento reservado", "corte", "barba", "cuidados faciais"],
    result: "preparo completo com tempo e privacidade",
  },
];

export const barbers = [
  {
    id: "22222222-2222-4222-8222-222222222221",
    name: "Rafael Monteiro",
    slug: "rafael-monteiro",
    role: "Especialista em cortes classicos",
    rating: "4.98",
    image:
      "https://images.unsplash.com/photo-1556760544-74068565f05c?auto=format&fit=crop&w=900&q=82",
    specialties: ["Degrade baixo", "Tesoura", "Barba alinhada"],
    bio: "Precisao de salao europeu com leitura moderna do rosto masculino.",
    badge: "Mais requisitado",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Diego Santana",
    slug: "diego-santana",
    role: "Barbeiro visagista",
    rating: "4.96",
    image:
      "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=900&q=82",
    specialties: ["Corte texturizado", "Cacheados", "Design de barba"],
    bio: "Cria cortes que respeitam rotina, textura e personalidade.",
    badge: "Texturas",
  },
  {
    id: "22222222-2222-4222-8222-222222222223",
    name: "Marcos Vieira",
    slug: "marcos-vieira",
    role: "Navalha e acabamento",
    rating: "4.94",
    image:
      "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=900&q=82",
    specialties: ["Barba premium", "Navalha", "Acabamento executivo"],
    bio: "Foco em conforto, simetria e acabamento impecavel.",
    badge: "Barba",
  },
];

export const testimonials = [
  {
    quote:
      "Agendei no intervalo do trabalho, cheguei no horario e sai com o corte exatamente como pedi.",
    author: "Henrique L.",
    detail: "cliente recorrente",
  },
  {
    quote:
      "Ambiente discreto, barbeiros tecnicos e zero espera. Virou minha barbearia fixa.",
    author: "Bruno M.",
    detail: "avaliacao 5 estrelas",
  },
  {
    quote:
      "O link para consultar o agendamento salvou minha semana. Simples e bem profissional.",
    author: "Caio R.",
    detail: "primeira visita",
  },
];

export const faqs = [
  {
    question: "Preciso criar conta para agendar?",
    answer:
      "Nao. Voce pode escolher servico, barbeiro, horario e confirmar com nome e contato. A conta apenas acelera reagendamentos e historico.",
  },
  {
    question: "Posso remarcar ou cancelar?",
    answer:
      "Sim, respeitando a antecedencia configurada pela barbearia. Clientes logados fazem isso pela area do cliente; convidados usam codigo ou link seguro.",
  },
  {
    question: "Como sei que meu horario foi confirmado?",
    answer:
      "A confirmacao aparece na tela e o sistema fica preparado para enviar email e WhatsApp transacional.",
  },
  {
    question: "Posso escolher qualquer barbeiro disponivel?",
    answer:
      "Sim. O fluxo permite selecionar um profissional especifico ou deixar o sistema encontrar o melhor horario disponivel.",
  },
];
