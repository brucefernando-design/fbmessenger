import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { FacebookLogo } from "./FacebookLogo";
import { Avatar } from "./Avatar";
import { connectablePages } from "@/lib/mockData";

type Step = "gate" | "interstitial" | "choosePage" | "success";

interface ConnectFlowProps {
  onComplete?: () => void;
}

export function ConnectFlow({ onComplete }: ConnectFlowProps) {
  const [step, setStep] = useState<Step>("gate");
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const navigate = useNavigate();

  const connectedPage = connectablePages.find((p) => p.id === selectedPage);

  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[560px]">
        {step === "gate" && <GateStep onContinue={() => setStep("interstitial")} />}
        {step === "interstitial" && (
          <InterstitialStep
            onCancel={() => setStep("gate")}
            onContinue={() => setStep("choosePage")}
          />
        )}
        {step === "choosePage" && (
          <ChoosePageStep
            selectedPage={selectedPage}
            onSelect={setSelectedPage}
            onConnect={() => setStep("success")}
          />
        )}
        {step === "success" && connectedPage && (
          <SuccessStep
            pageName={connectedPage.name}
            pageId={connectedPage.id}
            onConfigure={() => navigate({ to: "/pages/$id", params: { id: connectedPage.id } })}
            onConnectAnother={() => {
              setSelectedPage(null);
              setStep("gate");
              onComplete?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

function GateStep({ onContinue }: { onContinue: () => void }) {
  return (
    <Card>
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-foreground">Conectar Messenger</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Allia2 solo puede leer y responder mensajes de la Página que autorices. Nunca pedimos tu
          contraseña de Facebook.
        </p>
      </div>
      <div className="px-6 pb-6">
        <button
          onClick={onContinue}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <FacebookLogo className="h-5 w-5" />
          Continuar con Facebook
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Serás enviado a Facebook para elegir la Página.
        </p>
      </div>
    </Card>
  );
}

function InterstitialStep({ onCancel, onContinue }: { onCancel: () => void; onContinue: () => void }) {
  const permissions = [
    "Ver la lista de Páginas",
    "Leer y enviar mensajes de Messenger",
    "Gestionar ajustes de mensajería",
  ];

  return (
    <Card>
      {/* Header styled like Facebook Login for Business */}
      <div className="border-b border-border bg-[#F0F2F5] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FacebookLogo className="h-6 w-6" />
          </div>
          <span className="text-lg font-semibold text-foreground">Facebook</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-start gap-3">
          <Avatar label="A2" size={40} className="bg-primary text-primary-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Allia2</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Allia2 quiere administrar mensajes de tus Páginas
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {permissions.map((perm) => (
            <div key={perm} className="flex items-center gap-2.5">
              <svg className="h-5 w-5 shrink-0 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-foreground">{perm}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-muted-foreground">
          Allia2 no publicará en tu muro ni verá tu contraseña.
        </p>
      </div>

      <div className="flex gap-3 border-t border-border px-6 py-4">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          onClick={onContinue}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continuar
        </button>
      </div>
    </Card>
  );
}

function ChoosePageStep({
  selectedPage,
  onSelect,
  onConnect,
}: {
  selectedPage: string | null;
  onSelect: (id: string) => void;
  onConnect: () => void;
}) {
  return (
    <Card>
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-xl font-bold text-foreground">Elige una Página</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona la Página de Facebook que Allia2 administrará.
        </p>
      </div>

      <div className="px-6 pb-4">
        <div className="space-y-2">
          {connectablePages.map((page) => (
            <button
              key={page.id}
              onClick={() => onSelect(page.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                selectedPage === page.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              <Avatar label={page.initials} size={44} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{page.name}</p>
                <p className="text-xs text-muted-foreground">Admin · {page.category}</p>
              </div>
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                  selectedPage === page.id
                    ? "border-primary bg-primary"
                    : "border-border",
                )}
              >
                {selectedPage === page.id && (
                  <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <button
          onClick={onConnect}
          disabled={!selectedPage}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Conectar esta Página
        </button>
      </div>
    </Card>
  );
}

function SuccessStep({
  pageName,
  pageId,
  onConfigure,
  onConnectAnother,
}: {
  pageName: string;
  pageId: string;
  onConfigure: () => void;
  onConnectAnother: () => void;
}) {
  return (
    <Card>
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success">
          <svg className="h-8 w-8 text-success-foreground" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 text-xl font-bold text-foreground">Página conectada</h1>

        <div className="mt-5 rounded-lg border border-border bg-background p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Página</span>
            <span className="text-sm font-medium text-foreground">{pageName}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page ID</span>
            <span className="text-sm font-medium text-foreground">{pageId}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Token</span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <svg className="h-4 w-4 text-success" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Guardado de forma segura
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <button
          onClick={onConfigure}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Configurar ficha del negocio
        </button>
        <button
          onClick={onConnectAnother}
          className="mt-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          Conectar otra Página
        </button>
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]">
      {children}
    </div>
  );
}
