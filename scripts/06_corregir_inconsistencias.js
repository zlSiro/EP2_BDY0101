// 06_corregir_inconsistencias.js
// Corrige duplicados (con respaldo) y marca incoherencias de fechas (sin borrar).
db = db.getSiblingDB("EP2_BDY0101");
const WC = { writeConcern: { w: "majority", j: true } };

print("=== ANTES ===");
printjson({
  reacciones: db.reacciones.countDocuments(),
  marcadas_pub: db.publicaciones.countDocuments({ fecha_inconsistente: true }),
  marcadas_com: db.comentarios.countDocuments({ fecha_inconsistente: true }),
  marcadas_rea: db.reacciones.countDocuments({ fecha_inconsistente: true })
});

// 1. Reacciones duplicadas (mismo usuario + publicacion): conservar la mas reciente
print("\n=== 1. Duplicados de reacciones ===");
const grupos = db.reacciones.aggregate([
  { $group: { _id: { u: "$usuario_id", p: "$publicacion_id" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();

grupos.forEach(g => {
  const docs = db.reacciones.find({ _id: { $in: g.ids } }).sort({ fecha: -1, _id: -1 }).toArray();
  print("Grupo " + JSON.stringify(g._id));
  printjson(docs);
  const conservar = docs[0];
  const eliminar = docs.slice(1);
  eliminar.forEach(d => {
    db.getCollection("_auditoria_inconsistencias").insertOne({
      tipo: "reaccion_duplicada",
      coleccion: "reacciones",
      doc_original: d,
      conservado: conservar._id,
      criterio: "Una reaccion por usuario y publicacion; se conserva la mas reciente",
      detectado_en: new Date()
    }, WC);
    const r = db.reacciones.deleteOne({ _id: d._id }, WC);
    print("Eliminado " + d._id + " (respaldado) | conservado " + conservar._id + " | deletedCount: " + r.deletedCount);
  });
});

// 2. Marcar fechas incoherentes (no se borra ni se altera la fecha original)
print("\n=== 2. Marcar fechas incoherentes ===");
const merge = col => ({ $merge: { into: col, on: "_id", whenMatched: "merge", whenNotMatched: "discard" } });

db.publicaciones.aggregate([
  { $lookup: { from: "usuarios", localField: "usuario_id", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $match: { $expr: { $lt: ["$fecha_publicacion", "$u.fecha_registro"] } } },
  { $project: { fecha_inconsistente: { $literal: true } } },
  merge("publicaciones")
]);
db.comentarios.aggregate([
  { $lookup: { from: "publicaciones", localField: "publicacion_id", foreignField: "_id", as: "p" } },
  { $unwind: "$p" },
  { $match: { $expr: { $lt: ["$fecha", "$p.fecha_publicacion"] } } },
  { $project: { fecha_inconsistente: { $literal: true } } },
  merge("comentarios")
]);
db.reacciones.aggregate([
  { $lookup: { from: "publicaciones", localField: "publicacion_id", foreignField: "_id", as: "p" } },
  { $unwind: "$p" },
  { $match: { $expr: { $lt: ["$fecha", "$p.fecha_publicacion"] } } },
  { $project: { fecha_inconsistente: { $literal: true } } },
  merge("reacciones")
]);

const resumen = {
  publicaciones: db.publicaciones.countDocuments({ fecha_inconsistente: true }),
  comentarios: db.comentarios.countDocuments({ fecha_inconsistente: true }),
  reacciones: db.reacciones.countDocuments({ fecha_inconsistente: true })
};
db.getCollection("_auditoria_inconsistencias").insertOne({
  tipo: "fechas_incoherentes_marcadas",
  resumen: resumen,
  criterio: "No se eliminan: volumen alto (data sintetica con fechas independientes). Se marca fecha_inconsistente:true para poder excluirlas en analisis",
  detectado_en: new Date()
}, WC);

print("\n=== DESPUES ===");
printjson({
  reacciones: db.reacciones.countDocuments(),
  marcadas: resumen,
  auditoria: db.getCollection("_auditoria_inconsistencias").countDocuments()
});
