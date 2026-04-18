import type { Metadata } from "next";
import { Clock3, Mail, MapPin, MessageCircle, Navigation, Phone, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/site/contact-form";
import { PublicShell } from "@/components/site/public-shell";
import { ButtonLink } from "@/components/ui/button-link";
import { brand } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Contato",
  description: "Endereco, telefone, WhatsApp e formulario da Corte Nobre.",
};

export default function ContactPage() {
  const whatsappUrl = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(
    "Ola, quero falar com a Corte Nobre.",
  )}`;

  return (
    <PublicShell>
      <section className="overflow-x-hidden px-4 pb-24 pt-32 sm:px-6 sm:pt-36 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Contato
            </p>
            <h1 className="mt-4 max-w-3xl break-words text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Fale com quem resolve sua agenda.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
              Para duvidas, ajustes de horario, eventos ou atendimento especial,
              fale direto pelo canal mais rapido.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={whatsappUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                Chamar no WhatsApp
              </ButtonLink>
              <ButtonLink href="/agendamento" variant="secondary" className="w-full sm:w-auto">
                Agendar online
              </ButtonLink>
            </div>

            <div className="mt-10 grid gap-3">
              <ContactPoint icon={<Phone size={18} />} href={`tel:${brand.phone}`} label="Telefone" value={brand.phone} />
              <ContactPoint icon={<MessageCircle size={18} />} href={whatsappUrl} label="WhatsApp" value="Resposta mais rapida" external />
              <ContactPoint icon={<Mail size={18} />} href={`mailto:${brand.email}`} label="Email" value={brand.email} />
              <ContactPoint icon={<MapPin size={18} />} href={brand.mapUrl} label="Endereco" value={brand.address} external />
            </div>
          </div>

          <div className="grid min-w-0 gap-6">
            <ContactForm />
            <div className="grid gap-4 rounded-[1.5rem] border border-line bg-smoke p-4 sm:grid-cols-3 sm:rounded-[2rem] sm:p-5">
              <InfoBlock icon={<Clock3 size={17} />} title="Horario" items={brand.hours} />
              <InfoBlock
                icon={<Navigation size={17} />}
                title="Chegada"
                items={["Jardins, Sao Paulo", "Abra o mapa antes de sair"]}
              />
              <InfoBlock
                icon={<ShieldCheck size={17} />}
                title="Privacidade"
                items={["Dados usados so para retorno", "Sem marketing automatico"]}
              />
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function ContactPoint({
  icon,
  href,
  label,
  value,
  external = false,
}: {
  icon: ReactNode;
  href: string;
  label: string;
  value: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group flex min-w-0 items-center gap-4 border-t border-line py-4 transition hover:border-brass/60"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-brass transition group-hover:border-brass">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </span>
        <span className="mt-1 block break-words text-sm font-semibold">{value}</span>
      </span>
    </a>
  );
}

function InfoBlock({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="text-brass">{icon}</div>
      <p className="mt-3 font-semibold">{title}</p>
      <div className="mt-2 grid gap-1">
        {items.map((item) => (
          <p key={item} className="text-sm leading-6 text-muted">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
