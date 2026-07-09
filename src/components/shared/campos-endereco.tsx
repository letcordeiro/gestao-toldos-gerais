"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EnderecoInicial = {
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
};

function mascaraCep(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Campos de endereço com CEP em primeiro: ao completar o CEP, busca o
// endereço no ViaCEP e preenche rua/bairro/cidade (resta número e complemento).
// obrigatorio: exige CEP, endereço e número.
export function CamposEndereco({
  inicial,
  obrigatorio = false,
}: {
  inicial?: EnderecoInicial;
  obrigatorio?: boolean;
}) {
  const [cep, setCep] = useState(inicial?.cep ?? "");
  const [endereco, setEndereco] = useState(inicial?.endereco ?? "");
  const [numero, setNumero] = useState(inicial?.numero ?? "");
  const [complemento, setComplemento] = useState(inicial?.complemento ?? "");
  const [bairro, setBairro] = useState(inicial?.bairro ?? "");
  const [cidade, setCidade] = useState(inicial?.cidade ?? "");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscando(true);
    setErro(null);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) {
        setErro("CEP não encontrado — preencha o endereço manualmente.");
      } else {
        if (j.logradouro) setEndereco(j.logradouro);
        if (j.bairro) setBairro(j.bairro);
        if (j.localidade)
          setCidade(`${j.localidade}${j.uf ? `/${j.uf}` : ""}`);
      }
    } catch {
      setErro("Não deu para buscar o CEP agora — preencha manualmente.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="cep">CEP{obrigatorio ? " *" : ""}</Label>
        <Input
          id="cep"
          name="cep"
          value={cep}
          required={obrigatorio}
          inputMode="numeric"
          placeholder="30000-000"
          onChange={(e) => {
            const m = mascaraCep(e.target.value);
            setCep(m);
            if (m.replace(/\D/g, "").length === 8) buscarCep(m);
          }}
          onBlur={(e) => buscarCep(e.target.value)}
        />
        {buscando && (
          <p className="text-xs text-muted-foreground">Buscando endereço…</p>
        )}
        {erro && <p className="text-xs text-amber-600">{erro}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endereco">Endereço (rua/av.){obrigatorio ? " *" : ""}</Label>
        <Input
          id="endereco"
          name="endereco"
          value={endereco}
          required={obrigatorio}
          onChange={(e) => setEndereco(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="numero">Número{obrigatorio ? " *" : ""}</Label>
          <Input
            id="numero"
            name="numero"
            value={numero}
            required={obrigatorio}
            onChange={(e) => setNumero(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            name="complemento"
            value={complemento}
            placeholder="apto, bloco…"
            onChange={(e) => setComplemento(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bairro">Bairro</Label>
          <Input
            id="bairro"
            name="bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            name="cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
