"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { InputSenha } from "@/components/shared/input-senha";
import { redefinirSenhaUsuario } from "./actions";

// Sem caracteres que se confundem quando alguém lê a senha em voz alta ou
// copia de um papel: 0/O, 1/l/I.
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function senhaSugerida(): string {
  const valores = new Uint32Array(10);
  crypto.getRandomValues(valores);
  return Array.from(valores, (n) => ALFABETO[n % ALFABETO.length]).join("");
}

/**
 * Gestor redefine a senha de um usuário. Serve para quem esqueceu: não pede a
 * senha antiga. A senha fica visível para o gestor poder passar adiante.
 */
export function RedefinirSenhaDialog({
  usuarioId,
  nome,
  temEmail,
  temAcesso,
}: {
  usuarioId: number;
  nome: string;
  temEmail: boolean;
  temAcesso: boolean;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  // Estado próprio em vez de useTransition: a action chama revalidatePath da
  // rota aberta e o setState de dentro do startTransition não chegava a valer —
  // o diálogo ficava aberto com a senha já gravada. Mesma armadilha anotada no
  // CLAUDE.md. Com try/finally o botão sempre destrava.
  const [pending, setPending] = useState(false);

  const salvar = async (valor: string) => {
    setErro(null);
    setPending(true);
    try {
      const r = await redefinirSenhaUsuario(usuarioId, valor);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      setSenha("");
      router.refresh();
      toast.success(
        valor ? `Senha de ${nome} redefinida` : `Acesso de ${nome} removido`
      );
    } catch {
      setErro("Não deu para salvar agora. Tente de novo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) {
          setSenha("");
          setErro(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" title={`Redefinir senha de ${nome}`}>
            <KeyRound className="size-4" /> Senha
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha — {nome}</DialogTitle>
        </DialogHeader>

        {!temEmail ? (
          <p className="text-sm text-muted-foreground">
            Este usuário não tem e-mail cadastrado, e o login é pelo e-mail.
            Cadastre o e-mail em <strong>Editar</strong> antes de definir uma
            senha.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`senha-${usuarioId}`}>Nova senha</Label>
              <InputSenha
                id={`senha-${usuarioId}`}
                value={senha}
                autoComplete="new-password"
                placeholder="ao menos 6 caracteres"
                onChange={(e) => setSenha(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSenha(senhaSugerida())}
                >
                  Gerar senha
                </Button>
                {senha && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(senha);
                        toast.success("Senha copiada");
                      } catch {
                        toast.error(
                          "Não deu para copiar — use o olho para ver e anote."
                        );
                      }
                    }}
                  >
                    Copiar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Anote ou copie antes de fechar: depois de salva, a senha não pode
                ser lida de novo.
              </p>
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1"
                disabled={pending || senha.trim().length < 6}
                onClick={() => salvar(senha.trim())}
              >
                {pending ? "Salvando…" : "Salvar senha"}
              </Button>
              {temAcesso && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => salvar("")}
                >
                  Remover acesso
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
