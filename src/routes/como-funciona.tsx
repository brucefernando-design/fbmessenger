import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Cómo funciona Allia2" },
      {
        name: "description",
        content: "Conecta tu Página, activa el agente y Allia2 responde por ti en Messenger.",
      },
      { property: "og:title", content: "Cómo funciona Allia2" },
      {
        property: "og:description",
        content: "Conecta tu Página, activa el agente y Allia2 responde por ti en Messenger.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ComoFunciona,
});

const steps = [
  {
    number: "1",
    title: "Conecta tu Página",
    description:
      "Autoriza a Allia2 desde Facebook con un clic. Eliges qué Página administrar. Nosotros nunca vemos tu contraseña.",
  },
  {
    number: "2",
    title: "Configura la ficha del negocio",
    description:
      "Cuéntale a Allia2 tus horarios, servicios y un saludo. El agente usa esta información para responder como si fueras tú.",
  },
  {
    number: "3",
    title: "Activa el agente",
    description:
      "Enciende el interruptor del agente. A partir de ese momento, Allia2 responde los mensajes nuevos en Messenger por ti.",
  },
  {
    number: "4",
    title: "Tú revisas cuando quieras",
    description:
      "Las citas que agende el agente aparecen en tu panel. Puedes confirmarlas, moverlas o apagar el agente cuando quieras.",
  },
];

function ComoFunciona() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-foreground">Cómo funciona</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        En 4 pasos tu Página de Facebook responde sola en Messenger.
      </p>

      <div className="mt-8 space-y-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {step.number}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center space-y-2">
        <a
          href="https://wa.me/?text=Hola%2C%20quiero%20conectar%20mi%20P%C3%A1gina%20de%20Facebook%20con%20Allia2"
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Pide tu acceso por WhatsApp
        </a>
        <p className="text-xs text-muted-foreground">
          Cada cliente recibe un enlace de acceso personalizado para conectar su Página.
        </p>
      </div>
    </div>
  );
}
