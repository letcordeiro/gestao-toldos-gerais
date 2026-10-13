import { test } from "node:test";
import assert from "node:assert/strict";
import { guiaDeVisitas } from "./guia-visitas";

const textoDe = (papel: Parameters<typeof guiaDeVisitas>[0]) =>
  JSON.stringify(guiaDeVisitas(papel));

test("atendente não recebe passo a passo de bloquear horário", () => {
  const secao = guiaDeVisitas("atendente").find((s) => s.id === "bloqueios");
  assert.ok(secao);
  assert.equal(secao.passos, undefined);
  assert.equal(secao.titulo, "Horários bloqueados");
  assert.match(JSON.stringify(secao), /Indisponível/);
});

test("vendedor não é mandado escolher Quem vai — o campo não aparece para ele", () => {
  const agendar = guiaDeVisitas("vendedor").find((s) => s.id === "agendar");
  assert.ok(agendar);
  assert.doesNotMatch(JSON.stringify(agendar), /Quem vai/);
});

test("atendente é avisada de que Quem vai é obrigatório", () => {
  const agendar = guiaDeVisitas("atendente").find((s) => s.id === "agendar");
  assert.match(JSON.stringify(agendar), /Quem vai\*\*, escolha o vendedor\. É obrigatório/);
});

test("só o gestor escolhe de quem é a agenda ao bloquear", () => {
  assert.match(textoDe("gestor"), /Escolha de quem é a agenda/);
  assert.doesNotMatch(textoDe("vendedor"), /Escolha de quem é a agenda/);
});

test("todo perfil aprende a diferença entre visita e chamado", () => {
  for (const papel of ["gestor", "atendente", "vendedor"] as const) {
    const ids = guiaDeVisitas(papel).map((s) => s.id);
    assert.deepEqual(ids, ["onde", "semana", "agendar", "depois", "bloqueios", "chamado", "quem"]);
  }
});

test("negrito sempre fechado — senão o asterisco aparece na tela", () => {
  for (const papel of ["gestor", "atendente", "vendedor"] as const) {
    for (const s of guiaDeVisitas(papel)) {
      const textos = [
        s.resumo,
        s.atencao ?? "",
        ...(s.passos ?? []),
        ...(s.pontos ?? []),
        ...(s.tabela?.linhas.flat() ?? []),
      ];
      for (const t of textos) {
        assert.equal((t.match(/\*\*/g) ?? []).length % 2, 0, `${s.id}: ${t}`);
      }
    }
  }
});
