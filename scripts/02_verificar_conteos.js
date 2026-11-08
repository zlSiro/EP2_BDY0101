// 02_verificar_conteos.js
// Verifica la cantidad de documentos por coleccion tras la importacion (esperado: 500 c/u)
// y el tipo actual de los campos de fecha (antes de la transformacion: string).
db = db.getSiblingDB("EP2_BDY0101");

const colecciones = ["usuarios", "publicaciones", "reacciones", "comentarios", "campanas"];
colecciones.forEach(c => print(c.padEnd(15), db[c].countDocuments()));

colecciones.forEach(c => printjson(db[c].findOne()));

printjson(db.usuarios.aggregate([
  { $project: { t: { $type: "$fecha_registro" } } },
  { $group: { _id: "$t", n: { $sum: 1 } } }
]).toArray());
