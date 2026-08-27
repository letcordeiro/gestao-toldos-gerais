import { db } from "./index";
import { fases, gatilhos, modelosToldo, motivosPerda } from "./schema";
import {
  FASES,
  GATILHOS,
  MODELOS,
  MOTIVOS_PERDA,
} from "../../scripts/seed-data.mjs";

async function seed() {
  const fasesExistentes = await db.select().from(fases);
  if (fasesExistentes.length === 0) {
    await db.insert(fases).values(FASES);
    console.log(`✔ ${FASES.length} fases criadas`);
  } else {
    console.log("• Fases já existem, pulando");
  }

  const modelosExistentes = await db.select().from(modelosToldo);
  if (modelosExistentes.length === 0) {
    await db.insert(modelosToldo).values(MODELOS);
    console.log(`✔ ${MODELOS.length} modelos de toldo criados`);
  } else {
    console.log("• Modelos já existem, pulando");
  }

  const motivosExistentes = await db.select().from(motivosPerda);
  if (motivosExistentes.length === 0) {
    await db.insert(motivosPerda).values(MOTIVOS_PERDA);
    console.log(`✔ ${MOTIVOS_PERDA.length} motivos de perda criados`);
  } else {
    console.log("• Motivos de perda já existem, pulando");
  }

  const gatilhosExistentes = await db.select().from(gatilhos);
  if (gatilhosExistentes.length === 0) {
    const listaFases = await db.select().from(fases);
    const porNome = new Map(listaFases.map((f) => [f.nome, f.id]));
    type NovoGatilho = typeof gatilhos.$inferInsert;
    const valores: NovoGatilho[] = GATILHOS.map((g) => ({
      nome: g.nome,
      evento: g.evento as NovoGatilho["evento"],
      faseId: g.faseNome ? porNome.get(g.faseNome) ?? null : null,
      tarefaTipo: g.tarefaTipo as NovoGatilho["tarefaTipo"],
      tarefaTitulo: g.tarefaTitulo,
      tarefaPrioridade: g.tarefaPrioridade as NovoGatilho["tarefaPrioridade"],
      prazoDias: g.prazoDias,
      mensagem: g.mensagem,
      // Gatilho de fase sem fase correspondente é descartado.
    })).filter((g) => g.evento !== "entrou_na_fase" || g.faseId != null);
    if (valores.length > 0) await db.insert(gatilhos).values(valores);
    console.log(`✔ ${valores.length} automações criadas`);
  } else {
    console.log("• Automações já existem, pulando");
  }
}

seed().then(() => process.exit(0));
