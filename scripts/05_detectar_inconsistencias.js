// 05_detectar_inconsistencias.js
// Solo DETECTA. No modifica datos. Ejecutar en mongosh (Compass o terminal).
db = db.getSiblingDB("EP2_BDY0101");

print("=== Concern por defecto de la conexion ===");
printjson({ read: db.getMongo().getReadConcern(), write: db.getMongo().getWriteConcern() });

print("\n=== 1. Referencias invalidas ===");
const huerfanos = (col, campo, destino) => db[col].aggregate([
  { $lookup: { from: destino, localField: campo, foreignField: "_id", as: "r" } },
  { $match: { r: { $size: 0 } } },
  { $project: { _id: 1, [campo]: 1 } }
]).toArray();

const chequeos = [
  ["publicaciones", "usuario_id", "usuarios"],
  ["reacciones", "usuario_id", "usuarios"],
  ["reacciones", "publicacion_id", "publicaciones"],
  ["comentarios", "usuario_id", "usuarios"],
  ["comentarios", "publicacion_id", "publicaciones"]
];
chequeos.forEach(([c, f, d]) => {
  const h = huerfanos(c, f, d);
  print(c + "." + f + " -> " + d + " | huerfanos: " + h.length);
  if (h.length) printjson(h.slice(0, 5));
});

const campHuerf = db.campanas.aggregate([
  { $unwind: "$publicaciones_asociadas" },
  { $lookup: { from: "publicaciones", localField: "publicaciones_asociadas", foreignField: "_id", as: "r" } },
  { $match: { r: { $size: 0 } } },
  { $project: { _id: 1, publicaciones_asociadas: 1 } }
]).toArray();
print("campanas.publicaciones_asociadas -> publicaciones | huerfanos: " + campHuerf.length);
if (campHuerf.length) printjson(campHuerf.slice(0, 5));

print("\n=== 2. Duplicados ===");
const dupCorreo = db.usuarios.aggregate([
  { $group: { _id: { $toLower: "$correo" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("usuarios correo duplicado: " + dupCorreo.length);
if (dupCorreo.length) printjson(dupCorreo.slice(0, 5));

const dupReac = db.reacciones.aggregate([
  { $group: { _id: { u: "$usuario_id", p: "$publicacion_id" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("reacciones mismo usuario+publicacion: " + dupReac.length);
if (dupReac.length) printjson(dupReac.slice(0, 5));

const dupCom = db.comentarios.aggregate([
  { $group: { _id: { u: "$usuario_id", p: "$publicacion_id", c: "$comentario" }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
  { $match: { n: { $gt: 1 } } }
]).toArray();
print("comentarios identicos mismo usuario+publicacion: " + dupCom.length);
if (dupCom.length) printjson(dupCom.slice(0, 5));

print("\n=== 3. Valores invalidos y fechas incoherentes ===");
print("campanas fin < inicio: " + db.campanas.countDocuments({ $expr: { $lt: ["$fecha_fin", "$fecha_inicio"] } }));
print("comentarios likes < 0: " + db.comentarios.countDocuments({ likes: { $lt: 0 } }));
print("campanas metricas < 0: " + db.campanas.countDocuments({ $or: [
  { "metricas_objetivo.likes": { $lt: 0 } },
  { "metricas_objetivo.comentarios": { $lt: 0 } },
  { "metricas_objetivo.compartidos": { $lt: 0 } }
] }));
print("usuarios correo invalido: " + db.usuarios.countDocuments({ correo: { $not: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ } }));
print("publicaciones campos vacios: " + db.publicaciones.countDocuments({ $or: [
  { contenido: "" }, { contenido: null }, { categoria: null }, { tipo: null }
] }));

const pubAntes = db.publicaciones.aggregate([
  { $lookup: { from: "usuarios", localField: "usuario_id", foreignField: "_id", as: "u" } },
  { $unwind: "$u" },
  { $match: { $expr: { $lt: ["$fecha_publicacion", "$u.fecha_registro"] } } },
  { $count: "n" }
]).toArray();
print("publicaciones antes del registro del autor: " + (pubAntes[0] ? pubAntes[0].n : 0));

const comAntes = db.comentarios.aggregate([
  { $lookup: { from: "publicaciones", localField: "publicacion_id", foreignField: "_id", as: "p" } },
  { $unwind: "$p" },
  { $match: { $expr: { $lt: ["$fecha", "$p.fecha_publicacion"] } } },
  { $count: "n" }
]).toArray();
print("comentarios antes de la publicacion: " + (comAntes[0] ? comAntes[0].n : 0));

const reaAntes = db.reacciones.aggregate([
  { $lookup: { from: "publicaciones", localField: "publicacion_id", foreignField: "_id", as: "p" } },
  { $unwind: "$p" },
  { $match: { $expr: { $lt: ["$fecha", "$p.fecha_publicacion"] } } },
  { $count: "n" }
]).toArray();
print("reacciones antes de la publicacion: " + (reaAntes[0] ? reaAntes[0].n : 0));

print("\n=== 4. Valores categoricos ===");
["pais", "genero", "dispositivo"].forEach(f => print("usuarios." + f + ": " + JSON.stringify(db.usuarios.distinct(f))));
["categoria", "tipo"].forEach(f => print("publicaciones." + f + ": " + JSON.stringify(db.publicaciones.distinct(f))));
print("reacciones.tipo_reaccion: " + JSON.stringify(db.reacciones.distinct("tipo_reaccion")));
print("campanas.objetivo: " + JSON.stringify(db.campanas.distinct("objetivo")));
