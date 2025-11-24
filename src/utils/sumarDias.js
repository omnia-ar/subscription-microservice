export function sumarDias(fecha, dias) {
 // Crear una nueva instancia de Date para no modificar la fecha original
 const nuevaFecha = new Date(fecha);

 // Sumar los días utilizando setDate()
 nuevaFecha.setDate(nuevaFecha.getDate() + dias);

 return nuevaFecha;
}
