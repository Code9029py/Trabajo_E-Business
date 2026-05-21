const ADMIN_API_TOKEN = "CAMBIAR_POR_TOKEN_SEGURO";

const NOMBRE_HOJA_PRODUCTOS = "productos";
const NOMBRE_HOJA_ELIMINADOS = "productos_eliminados";
const NOMBRE_HOJA_COLORES = "colores";

const COLUMNAS_REQUERIDAS = [
  "id",
  "nombre",
  "categoria",
  "subcategoria",
  "tipo",
  "descripcionCorta",
  "descripcionLarga",
  "colores",
  "talles",
  "medidas",
  "caracteristicas",
  "propiedades",
  "estadoStock",
  "precio",
  "activo",
  "destacado",
  "imagenUrl",
  "imagenes",
  "fechaCreacion",
  "fechaActualizacion",
];

const CAMPOS_ARRAY = [
  "descripcionLarga",
  "colores",
  "talles",
  "medidas",
  "caracteristicas",
  "propiedades",
  "imagenes",
];

const COLUMNAS_COLORES = [
  "id",
  "nombre",
  "slug",
  "hex",
  "activo",
  "fechaCreacion",
  "fechaActualizacion",
];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : "{}");
    const accion = payload.accion;

    if (!accion) {
      return responderJSON({ ok: false, error: "Falta la acción a ejecutar." });
    }

    if (accion === "listar") {
      return listarProductos();
    }

    if (accion === "listarColores") {
      return listarColores();
    }

    if (!validarToken(payload.token)) {
      return responderJSON({ ok: false, error: "Token inválido o faltante." });
    }

    if (accion === "crear") return crearProducto(payload.producto);
    if (accion === "editar") return editarProducto(payload.id, payload.producto);
    if (accion === "ocultar") return cambiarEstadoActivo(payload.id, false);
    if (accion === "reactivar") return cambiarEstadoActivo(payload.id, true);
    if (accion === "eliminarDefinitivo") return eliminarProductoDefinitivo(payload.id);
    if (accion === "crearColor") return crearColor(payload.color);
    if (accion === "editarColor") return editarColor(payload.id || payload.slug, payload.color);
    if (accion === "ocultarColor") return cambiarEstadoColor(payload.id || payload.slug, false);
    if (accion === "reactivarColor") return cambiarEstadoColor(payload.id || payload.slug, true);

    return responderJSON({ ok: false, error: "Acción no reconocida: " + accion });
  } catch (error) {
    return responderJSON({
      ok: false,
      error: error.message || "Error inesperado al procesar la solicitud.",
    });
  }
}

function doGet(e) {
  try {
    const accion = e && e.parameter ? e.parameter.accion : "";

    if (accion === "listar") {
      return listarProductos();
    }

    if (accion === "listarColores") {
      return listarColores();
    }

    return responderJSON({ ok: true, mensaje: "API de productos activa." });
  } catch (error) {
    return responderJSON({
      ok: false,
      error: error.message || "Error inesperado al procesar la solicitud.",
    });
  }
}

function listarProductos() {
  const hoja = obtenerHojaProductos();
  const encabezados = obtenerEncabezados(hoja);
  const ultimaFila = hoja.getLastRow();

  if (ultimaFila < 2) {
    return responderJSON({ ok: true, productos: [] });
  }

  const filas = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  const productos = filas
    .filter(function (fila) {
      return fila.some(function (celda) {
        return celda !== "";
      });
    })
    .map(function (fila) {
      return filaAProducto(encabezados, fila);
    });

  return responderJSON({ ok: true, productos: productos });
}

function listarColores() {
  const hoja = obtenerHojaColores();
  const encabezados = obtenerEncabezadosColores(hoja);
  const ultimaFila = hoja.getLastRow();

  if (ultimaFila < 2) {
    return responderJSON({ ok: true, colores: [] });
  }

  const filas = hoja.getRange(2, 1, ultimaFila - 1, encabezados.length).getValues();
  const colores = filas
    .filter(function (fila) {
      return fila.some(function (celda) {
        return celda !== "";
      });
    })
    .map(function (fila) {
      return filaAColor(encabezados, fila);
    })
    .filter(function (color) {
      return color.activo === true;
    });

  return responderJSON({ ok: true, colores: colores });
}

function crearColor(color) {
  if (!color || typeof color !== "object") {
    return responderJSON({ ok: false, error: "Falta el color a crear." });
  }

  const nombre = String(color.nombre || "").trim();
  const hex = String(color.hex || "").trim();

  if (!nombre) {
    return responderJSON({ ok: false, error: "El color debe tener nombre." });
  }

  if (!validarHexColor(hex)) {
    return responderJSON({ ok: false, error: "El color visual debe ser un hex válido." });
  }

  const hoja = obtenerHojaColores();
  const encabezados = obtenerEncabezadosColores(hoja);
  const slug = generarSlugTexto(color.slug || nombre);
  const filaExistente = buscarFilaPorCampo(hoja, encabezados, "slug", slug);

  if (filaExistente !== -1) {
    const filaActual = hoja.getRange(filaExistente, 1, 1, encabezados.length).getValues()[0];
    return responderJSON({ ok: true, color: filaAColor(encabezados, filaActual) });
  }

  const colorNuevo = {
    id: slug,
    nombre: nombre,
    slug: slug,
    hex: hex,
    activo: true,
  };
  const fila = colorAFila(colorNuevo, encabezados, null);
  hoja.appendRow(fila);

  return responderJSON({ ok: true, color: filaAColor(encabezados, fila) });
}

function editarColor(idOSlug, color) {
  if (!idOSlug) {
    return responderJSON({ ok: false, error: "Falta el id o slug del color." });
  }

  if (!color || typeof color !== "object") {
    return responderJSON({ ok: false, error: "Faltan los datos del color a editar." });
  }

  const hoja = obtenerHojaColores();
  const encabezados = obtenerEncabezadosColores(hoja);
  const numeroFila = buscarFilaColorPorIdOSlug(hoja, encabezados, idOSlug);

  if (numeroFila === -1) {
    return responderJSON({ ok: false, error: "No existe un color con ese id o slug." });
  }

  if (color.hex !== undefined && !validarHexColor(color.hex)) {
    return responderJSON({ ok: false, error: "El color visual debe ser un hex válido." });
  }

  const filaActual = hoja.getRange(numeroFila, 1, 1, encabezados.length).getValues()[0];
  const colorExistente = filaAColor(encabezados, filaActual);
  const nombre = color.nombre !== undefined ? String(color.nombre).trim() : colorExistente.nombre;
  const slug = color.slug !== undefined || color.nombre !== undefined
    ? generarSlugTexto(color.slug || nombre)
    : colorExistente.slug;
  const colorActualizado = Object.assign({}, colorExistente, color, {
    id: slug,
    nombre: nombre,
    slug: slug,
  });
  const nuevaFila = colorAFila(colorActualizado, encabezados, colorExistente);

  hoja.getRange(numeroFila, 1, 1, encabezados.length).setValues([nuevaFila]);

  return responderJSON({ ok: true, color: filaAColor(encabezados, nuevaFila) });
}

function cambiarEstadoColor(idOSlug, activo) {
  if (!idOSlug) {
    return responderJSON({ ok: false, error: "Falta el id o slug del color." });
  }

  const hoja = obtenerHojaColores();
  const encabezados = obtenerEncabezadosColores(hoja);
  const numeroFila = buscarFilaColorPorIdOSlug(hoja, encabezados, idOSlug);

  if (numeroFila === -1) {
    return responderJSON({ ok: false, error: "No existe un color con ese id o slug." });
  }

  const filaActual = hoja.getRange(numeroFila, 1, 1, encabezados.length).getValues()[0];
  const colorExistente = filaAColor(encabezados, filaActual);
  const colorActualizado = Object.assign({}, colorExistente, { activo: activo });
  const nuevaFila = colorAFila(colorActualizado, encabezados, colorExistente);

  hoja.getRange(numeroFila, 1, 1, encabezados.length).setValues([nuevaFila]);

  return responderJSON({ ok: true, color: filaAColor(encabezados, nuevaFila) });
}

function crearProducto(producto) {
  if (!producto || typeof producto !== "object") {
    return responderJSON({ ok: false, error: "Falta el producto a crear." });
  }

  if (!producto.id) {
    return responderJSON({ ok: false, error: "El producto debe tener un id." });
  }

  const hoja = obtenerHojaProductos();
  const encabezados = obtenerEncabezados(hoja);
  const filaExistente = buscarFilaPorId(hoja, encabezados, producto.id);

  if (filaExistente !== -1) {
    return responderJSON({ ok: false, error: "Ya existe un producto con el id: " + producto.id });
  }

  const productoNuevo = Object.assign({}, producto, {
    activo: producto.activo !== undefined ? parseBoolean(producto.activo) : true,
    destacado: producto.destacado !== undefined ? parseBoolean(producto.destacado) : false,
  });

  const fila = productoAFila(productoNuevo, encabezados, null);
  hoja.appendRow(fila);

  return responderJSON({ ok: true, producto: filaAProducto(encabezados, fila) });
}

function editarProducto(id, producto) {
  if (!id) {
    return responderJSON({ ok: false, error: "Falta el id del producto a editar." });
  }

  if (!producto || typeof producto !== "object") {
    return responderJSON({ ok: false, error: "Faltan los datos del producto a editar." });
  }

  const hoja = obtenerHojaProductos();
  const encabezados = obtenerEncabezados(hoja);
  const numeroFila = buscarFilaPorId(hoja, encabezados, id);

  if (numeroFila === -1) {
    return responderJSON({ ok: false, error: "No existe un producto con ese id." });
  }

  const filaActual = hoja.getRange(numeroFila, 1, 1, encabezados.length).getValues()[0];
  const productoExistente = filaAProducto(encabezados, filaActual);
  const productoActualizado = Object.assign({}, productoExistente, producto, { id: id });
  const nuevaFila = productoAFila(productoActualizado, encabezados, productoExistente);

  hoja.getRange(numeroFila, 1, 1, encabezados.length).setValues([nuevaFila]);

  return responderJSON({ ok: true, producto: filaAProducto(encabezados, nuevaFila) });
}

function cambiarEstadoActivo(id, activo) {
  if (!id) {
    return responderJSON({ ok: false, error: "Falta el id del producto." });
  }

  const hoja = obtenerHojaProductos();
  const encabezados = obtenerEncabezados(hoja);
  const numeroFila = buscarFilaPorId(hoja, encabezados, id);

  if (numeroFila === -1) {
    return responderJSON({ ok: false, error: "No existe un producto con ese id." });
  }

  const filaActual = hoja.getRange(numeroFila, 1, 1, encabezados.length).getValues()[0];
  const productoExistente = filaAProducto(encabezados, filaActual);
  const productoActualizado = Object.assign({}, productoExistente, { activo: activo });
  const nuevaFila = productoAFila(productoActualizado, encabezados, productoExistente);

  hoja.getRange(numeroFila, 1, 1, encabezados.length).setValues([nuevaFila]);

  return responderJSON({ ok: true, producto: filaAProducto(encabezados, nuevaFila) });
}

function eliminarProductoDefinitivo(id) {
  if (!id) {
    return responderJSON({ ok: false, error: "Falta el id del producto." });
  }

  const hoja = obtenerHojaProductos();
  const encabezados = obtenerEncabezados(hoja);
  const numeroFila = buscarFilaPorId(hoja, encabezados, id);

  if (numeroFila === -1) {
    return responderJSON({ ok: false, error: "No existe un producto con ese id." });
  }

  const filaActual = hoja.getRange(numeroFila, 1, 1, encabezados.length).getValues()[0];
  const producto = filaAProducto(encabezados, filaActual);

  if (producto.activo === true) {
    return responderJSON({
      ok: false,
      error: "Solo se pueden eliminar definitivamente productos ocultos.",
    });
  }

  archivarFilaEliminada(encabezados, filaActual);
  hoja.deleteRow(numeroFila);

  return responderJSON({ ok: true, id: id });
}

function archivarFilaEliminada(encabezados, fila) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let hojaEliminados = spreadsheet.getSheetByName(NOMBRE_HOJA_ELIMINADOS);

  if (!hojaEliminados) {
    hojaEliminados = spreadsheet.insertSheet(NOMBRE_HOJA_ELIMINADOS);
  }

  const encabezadosEliminados = encabezados.concat(["fechaEliminacion"]);

  if (hojaEliminados.getLastRow() === 0) {
    hojaEliminados.appendRow(encabezadosEliminados);
  } else {
    const actuales = hojaEliminados
      .getRange(1, 1, 1, hojaEliminados.getLastColumn())
      .getValues()[0]
      .map(function (valor) {
        return String(valor).trim();
      });

    if (actuales.indexOf("fechaEliminacion") === -1) {
      hojaEliminados.getRange(1, actuales.length + 1).setValue("fechaEliminacion");
    }
  }

  hojaEliminados.appendRow(fila.concat([generarFechaISO()]));
}

function obtenerHojaProductos() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = spreadsheet.getSheetByName(NOMBRE_HOJA_PRODUCTOS);

  if (!hoja) {
    throw new Error('No existe la hoja "' + NOMBRE_HOJA_PRODUCTOS + '".');
  }

  return hoja;
}

function obtenerHojaColores() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = spreadsheet.getSheetByName(NOMBRE_HOJA_COLORES);

  if (!hoja) {
    hoja = spreadsheet.insertSheet(NOMBRE_HOJA_COLORES);
    hoja.appendRow(COLUMNAS_COLORES);
  }

  return hoja;
}

function obtenerEncabezados(hoja) {
  const ultimaColumna = hoja.getLastColumn();

  if (ultimaColumna < 1) {
    throw new Error("La hoja no tiene encabezados.");
  }

  const encabezados = hoja
    .getRange(1, 1, 1, ultimaColumna)
    .getValues()[0]
    .map(function (valor) {
      return String(valor).trim();
    });

  const faltantes = COLUMNAS_REQUERIDAS.filter(function (columna) {
    return encabezados.indexOf(columna) === -1;
  });

  if (faltantes.length > 0) {
    throw new Error("Faltan columnas requeridas: " + faltantes.join(", "));
  }

  return encabezados;
}

function obtenerEncabezadosColores(hoja) {
  if (hoja.getLastRow() === 0 || hoja.getLastColumn() === 0) {
    hoja.appendRow(COLUMNAS_COLORES);
    return COLUMNAS_COLORES.slice();
  }

  const encabezados = hoja
    .getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0]
    .map(function (valor) {
      return String(valor).trim();
    });

  COLUMNAS_COLORES.forEach(function (columna) {
    if (encabezados.indexOf(columna) === -1) {
      hoja.getRange(1, encabezados.length + 1).setValue(columna);
      encabezados.push(columna);
    }
  });

  return encabezados;
}

function filaAProducto(encabezados, fila) {
  const producto = {};

  encabezados.forEach(function (encabezado, index) {
    const valor = fila[index];

    if (CAMPOS_ARRAY.indexOf(encabezado) !== -1) {
      producto[encabezado] = parseArray(valor);
      return;
    }

    if (encabezado === "activo" || encabezado === "destacado") {
      producto[encabezado] = parseBoolean(valor);
      return;
    }

    if (encabezado === "fechaCreacion" || encabezado === "fechaActualizacion") {
      producto[encabezado] = valor instanceof Date ? valor.toISOString() : String(valor || "");
      return;
    }

    producto[encabezado] = String(valor || "");
  });

  return producto;
}

function filaAColor(encabezados, fila) {
  const color = {};

  encabezados.forEach(function (encabezado, index) {
    const valor = fila[index];

    if (encabezado === "activo") {
      color[encabezado] = parseBoolean(valor);
      return;
    }

    if (encabezado === "fechaCreacion" || encabezado === "fechaActualizacion") {
      color[encabezado] = valor instanceof Date ? valor.toISOString() : String(valor || "");
      return;
    }

    color[encabezado] = String(valor || "");
  });

  return color;
}

function productoAFila(producto, encabezados, productoExistente) {
  const fechaActual = generarFechaISO();
  const existente = productoExistente || {};

  return encabezados.map(function (encabezado) {
    if (encabezado === "fechaCreacion") {
      return existente.fechaCreacion || producto.fechaCreacion || fechaActual;
    }

    if (encabezado === "fechaActualizacion") {
      return fechaActual;
    }

    if (CAMPOS_ARRAY.indexOf(encabezado) !== -1) {
      return stringifyArray(producto[encabezado]);
    }

    if (encabezado === "activo") {
      return producto.activo !== undefined ? parseBoolean(producto.activo) : true;
    }

    if (encabezado === "destacado") {
      return producto.destacado !== undefined ? parseBoolean(producto.destacado) : false;
    }

    return producto[encabezado] !== undefined && producto[encabezado] !== null
      ? producto[encabezado]
      : "";
  });
}

function colorAFila(color, encabezados, colorExistente) {
  const fechaActual = generarFechaISO();
  const existente = colorExistente || {};

  return encabezados.map(function (encabezado) {
    if (encabezado === "fechaCreacion") {
      return existente.fechaCreacion || color.fechaCreacion || fechaActual;
    }

    if (encabezado === "fechaActualizacion") {
      return fechaActual;
    }

    if (encabezado === "activo") {
      return color.activo !== undefined ? parseBoolean(color.activo) : true;
    }

    return color[encabezado] !== undefined && color[encabezado] !== null ? color[encabezado] : "";
  });
}

function parseArray(valor) {
  if (Array.isArray(valor)) {
    return valor.map(String).map(function (item) { return item.trim(); }).filter(Boolean);
  }

  if (valor === undefined || valor === null || valor === "") {
    return [];
  }

  return String(valor).split("|").map(function (item) { return item.trim(); }).filter(Boolean);
}

function stringifyArray(array) {
  if (Array.isArray(array)) {
    return array.map(String).map(function (item) { return item.trim(); }).filter(Boolean).join("|");
  }

  if (array === undefined || array === null || array === "") {
    return "";
  }

  return String(array);
}

function parseBoolean(valor) {
  if (valor === true) return true;
  if (valor === false) return false;

  const texto = String(valor || "").trim().toLowerCase();
  return texto === "true" || texto === "1" || texto === "si" || texto === "sí" || texto === "yes";
}

function generarFechaISO() {
  return new Date().toISOString();
}

function buscarFilaPorId(hoja, encabezados, id) {
  const indiceId = encabezados.indexOf("id");

  if (indiceId === -1) {
    throw new Error('No se encontró la columna "id".');
  }

  const ultimaFila = hoja.getLastRow();

  if (ultimaFila < 2) {
    return -1;
  }

  const valoresId = hoja.getRange(2, indiceId + 1, ultimaFila - 1, 1).getValues();
  const idBuscado = String(id).trim();

  for (let i = 0; i < valoresId.length; i += 1) {
    if (String(valoresId[i][0]).trim() === idBuscado) {
      return i + 2;
    }
  }

  return -1;
}

function buscarFilaPorCampo(hoja, encabezados, campo, valor) {
  const indice = encabezados.indexOf(campo);

  if (indice === -1) {
    throw new Error('No se encontró la columna "' + campo + '".');
  }

  const ultimaFila = hoja.getLastRow();

  if (ultimaFila < 2) {
    return -1;
  }

  const valores = hoja.getRange(2, indice + 1, ultimaFila - 1, 1).getValues();
  const valorBuscado = String(valor).trim();

  for (let i = 0; i < valores.length; i += 1) {
    if (String(valores[i][0]).trim() === valorBuscado) {
      return i + 2;
    }
  }

  return -1;
}

function buscarFilaColorPorIdOSlug(hoja, encabezados, idOSlug) {
  const idNormalizado = String(idOSlug).trim();
  const porId = buscarFilaPorCampo(hoja, encabezados, "id", idNormalizado);

  if (porId !== -1) {
    return porId;
  }

  return buscarFilaPorCampo(hoja, encabezados, "slug", generarSlugTexto(idNormalizado));
}

function validarHexColor(hex) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(hex || "").trim());
}

function generarSlugTexto(texto) {
  return String(texto || "")
    .toLowerCase()
    .replace(/\u00f1/g, "n")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validarToken(token) {
  return Boolean(token) && token === ADMIN_API_TOKEN;
}

function responderJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
