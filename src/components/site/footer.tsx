import Link from "next/link";
import { Camera, Mail, MapPin, Phone, Scissors } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { brand } from "@/lib/site-data";

export function Footer() {
  return (
    <footer className="border-t border-line bg-[#0a0908]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brass text-ink">
              <Scissors size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.28em]">CORTE NOBRE</p>
              <p className="text-sm text-muted">barbearia premium</p>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-6 text-muted">
            Corte, barba e cuidado masculino com agenda simples, pontualidade e
            acabamento de alto nivel.
          </p>
          <div className="mt-6">
            <ButtonLink href="/agendamento">Agendar horario</ButtonLink>
          </div>
        </div>

        <FooterGroup
          title="Mapa"
          links={[
            ["/servicos", "Servicos"],
            ["/equipe", "Barbeiros"],
            ["/meus-agendamentos", "Meus agendamentos"],
            ["/admin", "Admin"],
          ]}
        />
        <FooterGroup
          title="Legal"
          links={[
            ["/privacidade", "Privacidade"],
            ["/termos", "Termos"],
            ["/cadastro", "Criar conta"],
          ]}
        />

        <div>
          <p className="font-semibold">Contato</p>
          <div className="mt-4 grid gap-3 text-sm text-muted">
            <a href={`tel:${brand.phone}`} className="flex gap-2 hover:text-foreground">
              <Phone size={16} aria-hidden="true" />
              {brand.phone}
            </a>
            <a href={`mailto:${brand.email}`} className="flex gap-2 hover:text-foreground">
              <Mail size={16} aria-hidden="true" />
              {brand.email}
            </a>
            <a href={brand.mapUrl} target="_blank" rel="noreferrer" className="flex gap-2 hover:text-foreground">
              <MapPin size={16} aria-hidden="true" />
              {brand.address}
            </a>
            <a href="/" className="flex gap-2 hover:text-foreground">
              <Camera size={16} aria-hidden="true" />
              @cortenobre
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Corte Nobre Barbearia. Todos os direitos reservados.
      </div>
    </footer>
  );
}

function FooterGroup({
  title,
  links,
}: {
  title: string;
  links: Array<[string, string]>;
}) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <div className="mt-4 grid gap-3 text-sm text-muted">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="hover:text-foreground">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
