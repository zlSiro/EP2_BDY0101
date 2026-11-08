// 07_indices_explain.js
// Mide consultas con explain("executionStats") ANTES y DESPUES de crear indices.
db = db.getSiblingDB("EP2_BDY0101");

// Partir sin indices secundarios (se conserva _id)
["usuarios", "publicaciones", "reacciones", "comentarios", "campanas"].forEach(c => {
  db[c].getIndexes().filter(i => i.name !== "_id_").forEach(i => db[c].dropIndex(i.name));
});

// Parametros de prueba: publicacion con mas comentarios y usuario con mas publicaciones
const pubTop = db.comentarios.aggregate([
  { $group: { _id: "$publicacion_id", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 1 }
]).toArray()[0]._id;
const userTop = db.publicaciones.aggregate([
  { $group: { _id: "$usuario_id", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 1 }
]).toArray()[0]._id;
print("Parametros -> publicacion: " + pubTop + " | usuario: " + userTop);

// Consultas a evaluar
const pruebas = [
  { nombre: "Q1 comentarios de una publicacion",
    run: () => db.comentarios.find({ publicacion_id: pubTop }).explain("executionStats") },
  { nombre: "Q2 publicaciones de un usuario, mas recientes primero",
    run: () => db.publicaciones.find({ usuario_id: userTop }).sort({ fecha_publicacion: -1 }).explain("executionStats") },
  { nombre: "Q3 reacciones de una publicacion",
    run: () => db.reacciones.find({ publicacion_id: pubTop }).explain("executionStats") }
];

// Busca la etapa de scan (COLLSCAN / IXSCAN) dentro del plan ganador
const scanStage = p => { let s = p; while (s) { if (s.stage === "COLLSCAN" || s.stage === "IXSCAN") return s.stage; s = s.inputStage; } return "?"; };
const tieneSort = p => { let s = p; while (s) { if (s.stage === "SORT") return true; s = s.inputStage; } return false; };

const medir = etiqueta => pruebas.map(t => {
  const e = t.run().executionStats;
  const plan = t.run().queryPlanner.winningPlan;
  return {
    consulta: t.nombre, fase: etiqueta, etapa: scanStage(plan), sort_en_memoria: tieneSort(plan),
    ms: e.executionTimeMillis, examinados: e.totalDocsExamined, claves_examinadas: e.totalKeysExamined, retornados: e.nReturned
  };
});

print("\n=== ANTES (sin indices) ===");
const antes = medir("antes");
antes.forEach(r => printjson(r));

print("\n=== Creando indices ===");
const idx = [
  ["usuarios", { correo: 1 }, { unique: true, name: "uq_usuarios_correo" }],
  ["publicaciones", { usuario_id: 1, fecha_publicacion: -1 }, { name: "ix_pub_usuario_fecha" }],
  ["publicaciones", { categoria: 1, fecha_publicacion: -1 }, { name: "ix_pub_categoria_fecha" }],
  ["comentarios", { publicacion_id: 1 }, { name: "ix_com_publicacion" }],
  ["comentarios", { usuario_id: 1 }, { name: "ix_com_usuario" }],
  ["reacciones", { publicacion_id: 1, tipo_reaccion: 1 }, { name: "ix_rea_publicacion_tipo" }],
  ["reacciones", { usuario_id: 1 }, { name: "ix_rea_usuario" }]
];
idx.forEach(([c, k, o]) => print(c + ": " + db[c].createIndex(k, o)));

print("\n=== DESPUES (con indices) ===");
const despues = medir("despues");
despues.forEach(r => printjson(r));

print("\n=== RESUMEN ===");
antes.forEach((a, i) => {
  const d = despues[i];
  print(a.consulta + " | examinados " + a.examinados + " -> " + d.examinados +
        " | retornados " + a.retornados + " -> " + d.retornados +
        " | ms " + a.ms + " -> " + d.ms + " | " + a.etapa + " -> " + d.etapa +
        " | sort memoria " + a.sort_en_memoria + " -> " + d.sort_en_memoria);
});

print("\n=== Indices por coleccion ===");
["usuarios", "publicaciones", "reacciones", "comentarios"].forEach(c => print(c + ": " + db[c].getIndexes().map(i => i.name).join(", ")));
