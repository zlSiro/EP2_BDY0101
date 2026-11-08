// 09_crud.js
// Escenario ContentFlow: alta de usuario -> publicacion -> interacciones -> edicion -> campana -> baja en cascada.
// Usa ids con prefijo "demo_". Al terminar deja la base como estaba (idempotente).
db = db.getSiblingDB("EP2_BDY0101");
const WC = { writeConcern: { w: "majority", j: true } };

const conteos = () => ({
  usuarios: db.usuarios.countDocuments(),
  publicaciones: db.publicaciones.countDocuments(),
  reacciones: db.reacciones.countDocuments(),
  comentarios: db.comentarios.countDocuments(),
  campanas: db.campanas.countDocuments()
});
const titulo = t => print("\n===== " + t + " =====");

const limpiar = () => {
  db.reacciones.deleteMany({ _id: /^demo_/ }, WC);
  db.comentarios.deleteMany({ _id: /^demo_/ }, WC);
  db.publicaciones.deleteMany({ _id: /^demo_/ }, WC);
  db.usuarios.deleteMany({ _id: /^demo_/ }, WC);
  db.campanas.updateOne({ _id: "camp_1", publicaciones_asociadas: "demo_pub_1" },
    { $pull: { publicaciones_asociadas: "demo_pub_1" }, $inc: { "metricas_objetivo.likes": -10 } }, WC);
};

limpiar(); // por si una ejecucion anterior quedo a medias
titulo("ESTADO INICIAL");
const inicial = conteos();
printjson(inicial);
const camp1Antes = db.campanas.findOne({ _id: "camp_1" });
print("camp_1 antes: publicaciones_asociadas=" + JSON.stringify(camp1Antes.publicaciones_asociadas) + " | meta likes=" + camp1Antes.metricas_objetivo.likes);

// ---------------- CREATE ----------------
titulo("C1. Alta de usuario (insertOne)");
printjson(db.usuarios.insertOne({
  _id: "demo_user_1", nombre: "Usuario Demo", correo: "demo.crud@contentflow.test",
  pais: "Chile", genero: "Otro", fecha_registro: new Date(Date.now() - 2 * 3600 * 1000), dispositivo: "Móvil"
}, WC));
printjson(db.usuarios.findOne({ _id: "demo_user_1" }));

titulo("C2. Correo duplicado debe fallar (indice unico uq_usuarios_correo)");
try {
  db.usuarios.insertOne({ _id: "demo_user_dup", nombre: "Duplicado", correo: "demo.crud@contentflow.test",
    pais: "Chile", genero: "Otro", fecha_registro: new Date(), dispositivo: "Desktop" }, WC);
  print("ERROR: se inserto un correo duplicado");
} catch (e) {
  print("Rechazado como se esperaba | codigo: " + e.code + " | " + e.codeName);
}
print("Usuarios con ese correo: " + db.usuarios.countDocuments({ correo: "demo.crud@contentflow.test" }) + " (esperado 1)");

titulo("C3. Publicacion validando que el autor exista (insertOne)");
if (!db.usuarios.findOne({ _id: "demo_user_1" })) throw new Error("Autor inexistente");
db.publicaciones.insertOne({
  _id: "demo_pub_1", usuario_id: "demo_user_1", contenido: "Primera publicacion de prueba CRUD",
  fecha_publicacion: new Date(Date.now() - 3600 * 1000), categoria: "Tecnología",
  hashtags: ["#innovacion"], tipo: "Texto"
}, WC);
printjson(db.publicaciones.findOne({ _id: "demo_pub_1" }));

titulo("C4. Reacciones y comentario (insertMany / insertOne)");
printjson(db.reacciones.insertMany([
  { _id: "demo_react_1", usuario_id: "user_1", publicacion_id: "demo_pub_1", tipo_reaccion: "Me gusta", fecha: new Date() },
  { _id: "demo_react_2", usuario_id: "user_2", publicacion_id: "demo_pub_1", tipo_reaccion: "Me encanta", fecha: new Date() }
], WC));
printjson(db.comentarios.insertOne({
  _id: "demo_comm_1", usuario_id: "user_141", publicacion_id: "demo_pub_1",
  comentario: "Buen contenido", fecha: new Date(), likes: 0
}, WC));

// ---------------- READ ----------------
titulo("R1. Lectura: interacciones de la publicacion (aggregate)");
printjson(db.publicaciones.aggregate([
  { $match: { _id: "demo_pub_1" } },
  { $lookup: { from: "reacciones", localField: "_id", foreignField: "publicacion_id", as: "r" } },
  { $lookup: { from: "comentarios", localField: "_id", foreignField: "publicacion_id", as: "c" } },
  { $project: { categoria: 1, hashtags: 1, reacciones: { $size: "$r" }, comentarios: { $size: "$c" } } }
]).toArray());

// ---------------- UPDATE ----------------
titulo("U1. $inc likes del comentario (+5)");
print("antes: " + db.comentarios.findOne({ _id: "demo_comm_1" }).likes);
db.comentarios.updateOne({ _id: "demo_comm_1" }, { $inc: { likes: 5 } }, WC);
print("despues: " + db.comentarios.findOne({ _id: "demo_comm_1" }).likes);

titulo("U2. $set categoria y tipo + $push hashtag");
print("antes: " + JSON.stringify(db.publicaciones.findOne({ _id: "demo_pub_1" }, { categoria: 1, tipo: 1, hashtags: 1 })));
db.publicaciones.updateOne({ _id: "demo_pub_1" },
  { $set: { categoria: "Educación", tipo: "Video" }, $push: { hashtags: "#aprendizaje" } }, WC);
print("despues: " + JSON.stringify(db.publicaciones.findOne({ _id: "demo_pub_1" }, { categoria: 1, tipo: 1, hashtags: 1 })));

titulo("U3. Cambio de reaccion ($set)");
print("antes: " + db.reacciones.findOne({ _id: "demo_react_2" }).tipo_reaccion);
db.reacciones.updateOne({ _id: "demo_react_2" }, { $set: { tipo_reaccion: "Me gusta" } }, WC);
print("despues: " + db.reacciones.findOne({ _id: "demo_react_2" }).tipo_reaccion);

titulo("U4. Asociar publicacion a campana camp_1 ($addToSet + $inc meta)");
db.campanas.updateOne({ _id: "camp_1" },
  { $addToSet: { publicaciones_asociadas: "demo_pub_1" }, $inc: { "metricas_objetivo.likes": 10 } }, WC);
const c1 = db.campanas.findOne({ _id: "camp_1" });
print("despues: publicaciones_asociadas=" + JSON.stringify(c1.publicaciones_asociadas) + " | meta likes=" + c1.metricas_objetivo.likes);

titulo("U5. updateMany: marcar reacciones de la publicacion como revisadas");
printjson(db.reacciones.updateMany({ publicacion_id: "demo_pub_1" }, { $set: { revisada: true } }, WC));

// ---------------- DELETE ----------------
titulo("D1. Eliminar una reaccion (deleteOne)");
print("antes: " + db.reacciones.countDocuments({ publicacion_id: "demo_pub_1" }));
printjson(db.reacciones.deleteOne({ _id: "demo_react_2" }, WC));
print("despues: " + db.reacciones.countDocuments({ publicacion_id: "demo_pub_1" }));

titulo("D2. Baja del usuario en cascada (reacciones, comentarios, campana, publicacion, usuario)");
printjson({
  antes: {
    reacciones: db.reacciones.countDocuments({ publicacion_id: "demo_pub_1" }),
    comentarios: db.comentarios.countDocuments({ publicacion_id: "demo_pub_1" }),
    en_campana: db.campanas.countDocuments({ publicaciones_asociadas: "demo_pub_1" })
  }
});
db.reacciones.deleteMany({ publicacion_id: "demo_pub_1" }, WC);
db.comentarios.deleteMany({ publicacion_id: "demo_pub_1" }, WC);
db.campanas.updateMany({ publicaciones_asociadas: "demo_pub_1" },
  { $pull: { publicaciones_asociadas: "demo_pub_1" } }, WC);
db.campanas.updateOne({ _id: "camp_1" }, { $inc: { "metricas_objetivo.likes": -10 } }, WC);
db.publicaciones.deleteOne({ _id: "demo_pub_1" }, WC);
db.usuarios.deleteOne({ _id: "demo_user_1" }, WC);

// ---------------- VALIDACION FINAL ----------------
titulo("V. Validacion de integridad y estado final");
const huerfanas = db.reacciones.aggregate([
  { $lookup: { from: "publicaciones", localField: "publicacion_id", foreignField: "_id", as: "p" } },
  { $match: { p: { $size: 0 } } }, { $count: "n" }
]).toArray();
print("Reacciones huerfanas: " + (huerfanas[0] ? huerfanas[0].n : 0) + " (esperado 0)");
print("Docs demo restantes: " + (
  db.usuarios.countDocuments({ _id: /^demo_/ }) + db.publicaciones.countDocuments({ _id: /^demo_/ }) +
  db.reacciones.countDocuments({ _id: /^demo_/ }) + db.comentarios.countDocuments({ _id: /^demo_/ })) + " (esperado 0)");
const c1f = db.campanas.findOne({ _id: "camp_1" });
print("camp_1 restaurada: " + (JSON.stringify(c1f.publicaciones_asociadas) === JSON.stringify(camp1Antes.publicaciones_asociadas)
  && c1f.metricas_objetivo.likes === camp1Antes.metricas_objetivo.likes));
const final = conteos();
printjson(final);
print("Estado final igual al inicial: " + (JSON.stringify(final) === JSON.stringify(inicial)));
