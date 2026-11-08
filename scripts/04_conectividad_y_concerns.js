// 04_conectividad_y_concerns.js
// Prueba de conectividad, permisos del usuario de la API y read/write concern.
db = db.getSiblingDB("EP2_BDY0101");
const USUARIO_API = "<USUARIO_API>"; // reemplazar por el usuario de Atlas con rol readWrite (no se versiona)

print("Base:", db.getName());
printjson(db.runCommand({ ping: 1 }));
print("Nodo primario escribible:", db.hello().isWritablePrimary);

// Concern por defecto de la conexion (undefined = defaults de Atlas)
printjson({ read: db.getMongo().getReadConcern(), write: db.getMongo().getWriteConcern() });

// Lectura con read concern "majority"
printjson(db.usuarios.find().readConcern("majority").limit(1).toArray());

// Escritura con write concern w:majority + journal, y limpieza del documento de prueba
printjson(db.usuarios.insertOne({ _id: "test_wc", nombre: "prueba" }, { writeConcern: { w: "majority", j: true } }));
printjson(db.usuarios.deleteOne({ _id: "test_wc" }));

// Permiso negativo: el usuario NO es admin (debe fallar con Unauthorized)
try {
  db.getSiblingDB("admin").runCommand({ usersInfo: USUARIO_API });
  print("ATENCION: el usuario tiene mas permisos de los esperados");
} catch (e) {
  print("Rechazado como se esperaba:", e.message.slice(0, 80));
}
