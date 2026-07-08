import { db } from "./index";
import { fases, modelosToldo } from "./schema";
import { FASES, MODELOS } from "../../scripts/seed-data.mjs";

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
}

seed().then(() => process.exit(0));
