// 03_transformar_fechas.js
// Convierte los campos de fecha (string ISO sin zona) a tipo Date con $toDate.
// Los strings sin "Z" se interpretan como UTC. Idempotente: se puede re-ejecutar.
db = db.getSiblingDB("EP2_BDY0101");

const campos = {
  usuarios: ["fecha_registro"],
  publicaciones: ["fecha_publicacion"],
  reacciones: ["fecha"],
  comentarios: ["fecha"],
  campanas: ["fecha_inicio", "fecha_fin"]
};

// 1. Chequeo previo: $toDate falla con strings invalidos, por eso se cuentan antes
print("=== 1. Chequeo previo (esperado 0 y 0) ===");
for (const [col, fs] of Object.entries(campos)) for (const f of fs) {
  const malos = db[col].countDocuments({ $expr: { $eq: [{ $convert: { input: "$" + f, to: "date", onError: "ERR", onNull: "NULL" } }, "ERR"] } });
  const nulos = db[col].countDocuments({ [f]: null });
  print(col + "." + f, "invalidas:", malos, "nulas/faltantes:", nulos);
}

// 2. Conversion
print("\n=== 2. Conversion ===");
for (const [col, fs] of Object.entries(campos)) {
  const set = {};
  fs.forEach(f => set[f] = { $toDate: "$" + f });
  const r = db[col].updateMany({}, [{ $set: set }]);
  print(col, "modificados:", r.modifiedCount);
}

// 3. Verificacion de tipos (esperado: date, 500)
print("\n=== 3. Verificacion de tipos ===");
for (const [col, fs] of Object.entries(campos)) for (const f of fs)
  printjson({ col, campo: f, tipos: db[col].aggregate([{ $group: { _id: { $type: "$" + f }, n: { $sum: 1 } } }]).toArray() });
