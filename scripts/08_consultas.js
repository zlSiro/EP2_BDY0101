// 08_consultas.js
// Consultas de lectura (IE4) y pipelines de agregacion (IE5) con su requerimiento de negocio.
use("EP2_BDY0101");
db = db.getSiblingDB("EP2_BDY0101");
const TZ = "America/Santiago";

const mostrar = (id, requerimiento, docs) => {
  print("\n----- " + id + " -----");
  print("Requerimiento: " + requerimiento);
  const arr = Array.isArray(docs) ? docs : docs.toArray();
  print("Resultados: " + arr.length);
  arr.slice(0, 5).forEach(d => printjson(d));
};

print("########## PARTE A: CONSULTAS DE LECTURA (IE4) ##########");

mostrar("F1 filtro + proyeccion + orden",
  "Disenio de contenido: ultimos videos de Tecnologia",
  db.publicaciones.find({ categoria: "Tecnología", tipo: "Video" },
    { categoria: 1, tipo: 1, fecha_publicacion: 1, hashtags: 1 })
    .sort({ fecha_publicacion: -1 }).limit(5));

mostrar("F2 comparacion ($gte) + orden",
  "Contenidos populares: comentarios con muchos likes",
  db.comentarios.find({ likes: { $gte: 80 } }, { usuario_id: 1, publicacion_id: 1, likes: 1 })
    .sort({ likes: -1 }).limit(10));

mostrar("F3 operadores logicos ($and/$or/$in) + fecha",
  "Perfil de audiencia: mujeres en movil o tablet registradas desde junio 2025",
  db.usuarios.find({
    $and: [
      { genero: "Femenino" },
      { dispositivo: { $in: ["Móvil", "Tablet"] } },
      { fecha_registro: { $gte: ISODate("2025-06-01T00:00:00Z") } }
    ]
  }, { nombre: 1, pais: 1, dispositivo: 1, fecha_registro: 1 }).sort({ fecha_registro: -1 }).limit(10));

mostrar("F4 busqueda en arreglo ($all)",
  "Disenio de contenido: publicaciones que combinan #series y #cultura",
  db.publicaciones.find({ hashtags: { $all: ["#series", "#cultura"] } },
    { categoria: 1, hashtags: 1, tipo: 1 }));

mostrar("F5 campo anidado + rango de fecha",
  "Exito de campanas: campanas de captacion con meta de likes > 500 iniciadas en 2025-03 o despues",
  db.campanas.find({
    objetivo: "Captar nuevos usuarios",
    "metricas_objetivo.likes": { $gt: 500 },
    fecha_inicio: { $gte: ISODate("2025-03-01T00:00:00Z") }
  }, { nombre: 1, fecha_inicio: 1, fecha_fin: 1, "metricas_objetivo.likes": 1 })
    .sort({ "metricas_objetivo.likes": -1 }).limit(10));

print("\nF6 conteo excluyendo datos marcados como inconsistentes");
print("Requerimiento: Calidad de datos: 'Me encanta' con fecha coherente");
print("Resultado: " + db.reacciones.countDocuments({ tipo_reaccion: "Me encanta", fecha_inconsistente: { $ne: true } }));

print("\n########## PARTE B: AGREGACIONES (IE5) ##########");

mostrar("A1 $group + $unionWith + $lookup + $sort",
  "Usuarios mas activos: top 10 por publicaciones + comentarios + reacciones",
  db.publicaciones.aggregate([
    { $group: { _id: "$usuario_id", publicaciones: { $sum: 1 } } },
    { $unionWith: { coll: "comentarios", pipeline: [{ $group: { _id: "$usuario_id", comentarios: { $sum: 1 } } }] } },
    { $unionWith: { coll: "reacciones", pipeline: [{ $group: { _id: "$usuario_id", reacciones: { $sum: 1 } } }] } },
    { $group: { _id: "$_id",
        publicaciones: { $sum: { $ifNull: ["$publicaciones", 0] } },
        comentarios: { $sum: { $ifNull: ["$comentarios", 0] } },
        reacciones: { $sum: { $ifNull: ["$reacciones", 0] } } } },
    { $addFields: { total: { $add: ["$publicaciones", "$comentarios", "$reacciones"] } } },
    { $sort: { total: -1, _id: 1 } },
    { $limit: 10 },
    { $lookup: { from: "usuarios", localField: "_id", foreignField: "_id", as: "u" } },
    { $unwind: "$u" },
    { $project: { nombre: "$u.nombre", pais: "$u.pais", publicaciones: 1, comentarios: 1, reacciones: 1, total: 1 } }
  ]));

mostrar("A2 $lookup doble + $size",
  "Contenidos mas populares: top 10 publicaciones por comentarios + reacciones",
  db.publicaciones.aggregate([
    { $lookup: { from: "comentarios", localField: "_id", foreignField: "publicacion_id", as: "c" } },
    { $lookup: { from: "reacciones", localField: "_id", foreignField: "publicacion_id", as: "r" } },
    { $project: { categoria: 1, tipo: 1, comentarios: { $size: "$c" }, reacciones: { $size: "$r" },
        puntaje: { $add: [{ $size: "$c" }, { $size: "$r" }] } } },
    { $sort: { puntaje: -1, _id: 1 } },
    { $limit: 10 }
  ]));

mostrar("A3 categoria y tipo con mas interaccion ($group)",
  "Disenio de contenido: que categoria y tipo generan mas interaccion",
  db.publicaciones.aggregate([
    { $lookup: { from: "comentarios", localField: "_id", foreignField: "publicacion_id", as: "c" } },
    { $lookup: { from: "reacciones", localField: "_id", foreignField: "publicacion_id", as: "r" } },
    { $group: { _id: { categoria: "$categoria", tipo: "$tipo" },
        publicaciones: { $sum: 1 },
        interacciones: { $sum: { $add: [{ $size: "$c" }, { $size: "$r" }] } } } },
    { $addFields: { promedio_por_publicacion: { $round: [{ $divide: ["$interacciones", "$publicaciones"] }, 2] } } },
    { $sort: { promedio_por_publicacion: -1 } },
    { $limit: 10 }
  ]));

mostrar("A4 horario de publicacion ($hour con zona horaria)",
  "Horarios de publicacion: que hora genera mas reacciones por publicacion (hora Chile)",
  db.publicaciones.aggregate([
    { $match: { fecha_inconsistente: { $ne: true } } },
    { $lookup: { from: "reacciones", localField: "_id", foreignField: "publicacion_id", as: "r" } },
    { $group: { _id: { $hour: { date: "$fecha_publicacion", timezone: TZ } },
        publicaciones: { $sum: 1 }, reacciones: { $sum: { $size: "$r" } } } },
    { $addFields: { promedio: { $round: [{ $divide: ["$reacciones", "$publicaciones"] }, 2] } } },
    { $sort: { promedio: -1, _id: 1 } },
    { $limit: 8 }
  ]));

mostrar("A5 dia de la semana ($dayOfWeek)",
  "Horarios de publicacion: volumen de publicaciones por dia (1=domingo ... 7=sabado)",
  db.publicaciones.aggregate([
    { $group: { _id: { $dayOfWeek: { date: "$fecha_publicacion", timezone: TZ } }, publicaciones: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]));

mostrar("A6 $lookup + $unwind + $group",
  "Perfil de audiencia: tipo de reaccion segun genero",
  db.reacciones.aggregate([
    { $lookup: { from: "usuarios", localField: "usuario_id", foreignField: "_id", as: "u" } },
    { $unwind: "$u" },
    { $group: { _id: { genero: "$u.genero", reaccion: "$tipo_reaccion" }, total: { $sum: 1 } } },
    { $sort: { "_id.genero": 1, total: -1 } }
  ]));

mostrar("A7 audiencia por pais y dispositivo",
  "Perfil de audiencia: top 10 paises por usuarios y dispositivo predominante",
  db.usuarios.aggregate([
    { $group: { _id: { pais: "$pais", dispositivo: "$dispositivo" }, usuarios: { $sum: 1 } } },
    { $sort: { usuarios: -1, "_id.pais": 1 } },
    { $limit: 10 }
  ]));

mostrar("A8 $unwind + $lookup + calculo de cumplimiento",
  "Exito de campanas: comentarios y likes reales de sus publicaciones vs metas",
  db.campanas.aggregate([
    { $unwind: "$publicaciones_asociadas" },
    { $lookup: { from: "comentarios", localField: "publicaciones_asociadas", foreignField: "publicacion_id", as: "c" } },
    { $lookup: { from: "reacciones", localField: "publicaciones_asociadas", foreignField: "publicacion_id", as: "r" } },
    { $group: { _id: "$_id", nombre: { $first: "$nombre" }, objetivo: { $first: "$objetivo" },
        meta_comentarios: { $first: "$metricas_objetivo.comentarios" },
        meta_likes: { $first: "$metricas_objetivo.likes" },
        comentarios: { $sum: { $size: "$c" } },
        likes_comentarios: { $sum: { $sum: "$c.likes" } },
        reacciones: { $sum: { $size: "$r" } } } },
    { $addFields: {
        cumpl_comentarios_pct: { $cond: [{ $gt: ["$meta_comentarios", 0] },
          { $round: [{ $multiply: [{ $divide: ["$comentarios", "$meta_comentarios"] }, 100] }, 1] }, null] },
        cumpl_likes_pct: { $cond: [{ $gt: ["$meta_likes", 0] },
          { $round: [{ $multiply: [{ $divide: ["$likes_comentarios", "$meta_likes"] }, 100] }, 1] }, null] } } },
    { $sort: { cumpl_likes_pct: -1, _id: 1 } },
    { $limit: 10 }
  ]));

mostrar("A9 resumen por objetivo de campana",
  "Exito de campanas: que objetivo rinde mas en promedio",
  db.campanas.aggregate([
    { $unwind: "$publicaciones_asociadas" },
    { $lookup: { from: "reacciones", localField: "publicaciones_asociadas", foreignField: "publicacion_id", as: "r" } },
    { $group: { _id: "$_id", objetivo: { $first: "$objetivo" }, reacciones: { $sum: { $size: "$r" } } } },
    { $group: { _id: "$objetivo", campanas: { $sum: 1 }, reacciones_promedio: { $avg: "$reacciones" } } },
    { $project: { campanas: 1, reacciones_promedio: { $round: ["$reacciones_promedio", 2] } } },
    { $sort: { reacciones_promedio: -1 } }
  ]));
