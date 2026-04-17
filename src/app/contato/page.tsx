import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/site/contact-form";
import { PublicShell } from "@/components/site/public-shell";
import { brand } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Contato",
  description: "Endereco, telefone, WhatsApp e formulario da Corte Nobre.",
};

export default function ContactPage() {
  return (
    <PublicShell>
      <section className="px-4 pb-20 pt-36 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brass">
              Contato
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Fale com a barbearia.
            </h1>
            <div className="mt-8 grid gap-4 text-muted">
              <a href={`tel:${brand.phone}`} className="flex gap-3 hover:text-foreground">
                <Phone className="text-brass" size={20} />
                {brand.phone}
              </a>
              <a href={`mailto:${brand.email}`} className="flex gap-3 hover:text-foreground">
                <Mail className="text-brass" size={20} />
                {brand.email}
              </a>
              <a href={brand.mapUrl} target="_blank" rel="noreferrer" className="flex gap-3 hover:text-foreground">
                <MapPin className="text-brass" size={20} />
                {brand.address}
              </a>
            </div>
            <div className="mt-8 rounded-[2rem] border border-line p-5">
              {brand.hours.map((hour) => (
                <p key={hour} className="text-sm leading-7 text-muted">{hour}</p>
              ))}
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </PublicShell>
  );
}
