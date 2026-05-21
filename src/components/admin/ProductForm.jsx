import { useEffect, useMemo, useRef, useState } from "react";
import { categorias, subcategorias } from "../../data/categorias";
import { estadosStock, getColorHex, normalizarColor } from "../../data/filtros";
import { crearColor, obtenerColores } from "../../services/coloresService";
import {
  crearSlug,
  obtenerColoresDisponibles,
  obtenerPropiedadesDisponibles,
  obtenerTallesDisponibles,
} from "../../utils/opcionesCatalogo";
import { normalizarImagenUrl } from "../../utils/imagenes";
import { registrarError } from "../../utils/logger";
import { normalizarImagenesProducto } from "../../utils/productoMedia";
import CreatableTagSelector from "../common/CreatableTagSelector";
import ProductPreview from "./ProductPreview";

const emptyProduct = {
  id: "",
  nombre: "",
  categoria: "indumentaria-proteccion",
  subcategoria: "proteccion-cuerpo-completo",
  tipo: "",
  descripcionCorta: "",
  descripcionLarga: [],
  colores: [],
  talles: [],
  medidas: [],
  caracteristicas: [],
  propiedades: [],
  estadoStock: "consultar",
  precio: "",
  activo: true,
  destacado: false,
  imagenUrl: "",
  imagenes: [],
};

function arrayToText(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

function textToArray(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function productToForm(product) {
  const source = product || emptyProduct;
  const imagenes = normalizarImagenesProducto(source);

  return {
    ...emptyProduct,
    ...source,
    descripcionLarga: arrayToText(source.descripcionLarga),
    colores: Array.isArray(source.colores) ? source.colores : [],
    talles: Array.isArray(source.talles) ? source.talles : [],
    medidas: Array.isArray(source.medidas) ? source.medidas : [],
    caracteristicas: Array.isArray(source.caracteristicas) ? source.caracteristicas : [],
    propiedades: Array.isArray(source.propiedades) ? source.propiedades : [],
    precio: source.precio || "",
    imagenUrl: imagenes[0] || normalizarImagenUrl(source.imagenUrl),
    imagenes,
  };
}

function formToProduct(form) {
  const imagenes = form.imagenes.map(normalizarImagenUrl).filter(Boolean);
  const imagenUrl = imagenes[0] || normalizarImagenUrl(form.imagenUrl);

  return {
    ...form,
    descripcionLarga: textToArray(form.descripcionLarga),
    precio: String(form.precio || "").trim(),
    imagenUrl,
    imagenes,
  };
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function agregarUnico(values, value) {
  const cleanValue = value.trim();

  if (!cleanValue || values.some((item) => normalizarColor(item) === normalizarColor(cleanValue))) {
    return values;
  }

  return [...values, cleanValue];
}

function mezclarColorGlobal(coloresActuales, nuevoColor) {
  if (!nuevoColor) return coloresActuales;

  const keyNuevo = normalizarColor(nuevoColor.slug || nuevoColor.nombre);
  const existe = coloresActuales.some((color) => normalizarColor(color.slug || color.nombre) === keyNuevo);

  return existe ? coloresActuales : [...coloresActuales, nuevoColor];
}

function ColorSelector({
  options,
  value,
  onChange,
  coloresGlobales,
  onCreateColor,
  isCreating = false,
  error = "",
}) {
  const [selectedOption, setSelectedOption] = useState("");
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#006b5c");

  const availableOptions = options.filter(
    (option) => !value.some((item) => normalizarColor(item) === normalizarColor(option.value)),
  );

  const addSelectedColor = (event) => {
    const nextValue = event.target.value;
    if (!nextValue) return;

    onChange(agregarUnico(value, nextValue));
    setSelectedOption("");
  };

  const removeColor = (color) => {
    onChange(value.filter((item) => normalizarColor(item) !== normalizarColor(color)));
  };

  const submitNewColor = async () => {
    const colorCreado = await onCreateColor({
      nombre: newColorName,
      hex: newColorHex,
    });

    if (colorCreado) {
      setNewColorName("");
      setNewColorHex("#006b5c");
      setIsCreatingColor(false);
    }
  };

  return (
    <div className="tag-selector admin-color-selector">
      <label className="contact-form__label">Colores disponibles</label>
      <p className="tag-selector__helper">
        Seleccioná colores existentes o creá uno nuevo con nombre y color visual.
      </p>

      <div className="tag-selector__chips admin-color-selector__chips">
        {value.length > 0 ? (
          value.map((color) => (
            <button
              className="tag-selector__chip admin-color-selector__chip"
              type="button"
              onClick={() => removeColor(color)}
              key={color}
            >
              <span
                className="admin-color-selector__dot"
                style={{ background: getColorHex(color, coloresGlobales) }}
                aria-hidden="true"
              />
              {color}
              <span aria-hidden="true">×</span>
            </button>
          ))
        ) : (
          <span className="tag-selector__empty">Sin colores seleccionados</span>
        )}
      </div>

      <div className="tag-selector__controls">
        <select
          className="contact-form__select"
          value={selectedOption}
          onChange={addSelectedColor}
          aria-label="Colores disponibles"
        >
          <option value="">Seleccionar color</option>
          {availableOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          className="tag-selector__create-button"
          type="button"
          onClick={() => setIsCreatingColor((current) => !current)}
        >
          + Crear color
        </button>
      </div>

      {isCreatingColor && (
        <div className="admin-color-creator">
          <input
            className="contact-form__input"
            value={newColorName}
            placeholder="Nombre del color"
            onChange={(event) => setNewColorName(event.target.value)}
          />
          <input
            className="admin-color-creator__input"
            type="color"
            value={newColorHex}
            aria-label="Color visual"
            onChange={(event) => setNewColorHex(event.target.value)}
          />
          <span className="admin-color-creator__preview">
            <span
              className="admin-color-selector__dot"
              style={{ background: newColorHex }}
              aria-hidden="true"
            />
            {newColorName || "Vista previa"}
          </span>
          <button
            className="tag-selector__add admin-color-creator__save"
            type="button"
            onClick={submitNewColor}
            disabled={isCreating || !newColorName.trim()}
          >
            {isCreating ? "..." : "+"}
          </button>
        </div>
      )}

      {error && <p className="tag-selector__helper tag-selector__helper--error">{error}</p>}
    </div>
  );
}

export default function ProductForm({ product, products = [], onSubmit, onCancel, isSaving = false }) {
  const [form, setForm] = useState(() => productToForm(product));
  const [coloresGlobales, setColoresGlobales] = useState([]);
  const [colorError, setColorError] = useState("");
  const [isCreatingColor, setIsCreatingColor] = useState(false);
  const submitLockedRef = useRef(false);
  const previewProduct = useMemo(
    () => ({
      ...formToProduct(form),
    }),
    [form],
  );
  const colorOptions = useMemo(
    () => obtenerColoresDisponibles(products, coloresGlobales),
    [products, coloresGlobales],
  );
  const talleOptions = useMemo(() => obtenerTallesDisponibles(products), [products]);
  const propiedadOptions = useMemo(() => obtenerPropiedadesDisponibles(products), [products]);
  const medidaOptions = useMemo(
    () =>
      uniqueStrings(products.flatMap((producto) => producto.medidas)).map((medida) => ({
        value: medida,
        label: medida,
      })),
    [products],
  );
  const caracteristicaOptions = useMemo(
    () =>
      uniqueStrings(products.flatMap((producto) => producto.caracteristicas)).map(
        (caracteristica) => ({
          value: caracteristica,
          label: caracteristica,
        }),
      ),
    [products],
  );
  const subcategoriasDisponibles = subcategorias.filter(
    (subcategoria) => subcategoria.categoriaId === form.categoria,
  );

  useEffect(() => {
    if (!isSaving) {
      submitLockedRef.current = false;
    }
  }, [isSaving]);

  useEffect(() => {
    let activo = true;

    obtenerColores()
      .then((colores) => {
        if (activo) {
          setColoresGlobales(colores);
        }
      })
      .catch((loadError) => {
        registrarError("Error al cargar colores globales en el formulario", loadError);
        if (activo) {
          setColorError("No se pudieron cargar los colores globales.");
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateImagen = (index, value) => {
    setForm((current) => {
      const imagenes = [...current.imagenes];
      imagenes[index] = value;
      return {
        ...current,
        imagenes,
        imagenUrl: index === 0 ? value : current.imagenUrl,
      };
    });
  };

  const addImagen = () => {
    setForm((current) => ({ ...current, imagenes: [...current.imagenes, ""] }));
  };

  const removeImagen = (index) => {
    setForm((current) => {
      const imagenes = current.imagenes.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        imagenes,
        imagenUrl: imagenes[0] || "",
      };
    });
  };

  const updateCategoria = (categoria) => {
    const subcategoriaActualValida = subcategorias.some(
      (subcategoria) => subcategoria.id === form.subcategoria && subcategoria.categoriaId === categoria,
    );
    const primeraSubcategoria = subcategorias.find(
      (subcategoria) => subcategoria.categoriaId === categoria,
    );

    setForm((current) => ({
      ...current,
      categoria,
      subcategoria: subcategoriaActualValida ? current.subcategoria : primeraSubcategoria?.id || "",
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSaving || submitLockedRef.current) {
      return;
    }

    submitLockedRef.current = true;
    onSubmit(formToProduct(form));
  };

  const handleCreateColor = async (colorData) => {
    try {
      setIsCreatingColor(true);
      setColorError("");
      const colorCreado = await crearColor(colorData);
      const nombreColor = colorCreado.nombre || colorData.nombre;

      setColoresGlobales((current) => mezclarColorGlobal(current, colorCreado));
      setForm((current) => ({
        ...current,
        colores: agregarUnico(current.colores, nombreColor),
      }));

      return colorCreado;
    } catch (createError) {
      registrarError("Error al crear un color global", createError);
      setColorError(createError.message || "No se pudo crear el color.");
      return null;
    } finally {
      setIsCreatingColor(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <fieldset className="admin-form__fields" disabled={isSaving}>
        <div className="contact-form__row">
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminNombre">
              Nombre
            </label>
            <input
              className="contact-form__input"
              id="adminNombre"
              name="nombre"
              value={form.nombre}
              onChange={(event) => updateField("nombre", event.target.value)}
              required
            />
          </div>
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminTipo">
              Tipo
            </label>
            <input
              className="contact-form__input"
              id="adminTipo"
              name="tipo"
              value={form.tipo}
              onChange={(event) => updateField("tipo", event.target.value)}
            />
          </div>
        </div>

        <div className="contact-form__row">
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminCategoria">
              Categoría
            </label>
            <select
              className="contact-form__select"
              id="adminCategoria"
              name="categoria"
              value={form.categoria}
              onChange={(event) => updateCategoria(event.target.value)}
              required
            >
              {categorias.map((categoria) => (
                <option value={categoria.id} key={categoria.id}>
                  {categoria.label}
                </option>
              ))}
            </select>
          </div>
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminSubcategoria">
              Subcategoría
            </label>
            <select
              className="contact-form__select"
              id="adminSubcategoria"
              name="subcategoria"
              value={form.subcategoria}
              onChange={(event) => updateField("subcategoria", event.target.value)}
            >
              {subcategoriasDisponibles.map((subcategoria) => (
                <option value={subcategoria.id} key={subcategoria.id}>
                  {subcategoria.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="contact-form__group">
          <label className="contact-form__label" htmlFor="adminDescripcionCorta">
            Descripción corta
          </label>
          <input
            className="contact-form__input"
            id="adminDescripcionCorta"
            name="descripcionCorta"
            value={form.descripcionCorta}
            onChange={(event) => updateField("descripcionCorta", event.target.value)}
            required
          />
        </div>

        <div className="contact-form__group">
          <label className="contact-form__label" htmlFor="adminDescripcionLarga">
            Descripción larga
          </label>
          <textarea
            className="contact-form__textarea"
            id="adminDescripcionLarga"
            name="descripcionLarga"
            value={form.descripcionLarga}
            onChange={(event) => updateField("descripcionLarga", event.target.value)}
            placeholder="Una línea por descripción."
          />
        </div>

        <ColorSelector
          options={colorOptions}
          value={form.colores}
          onChange={(value) => updateField("colores", value)}
          coloresGlobales={coloresGlobales}
          onCreateColor={handleCreateColor}
          isCreating={isCreatingColor}
          error={colorError}
        />

        <CreatableTagSelector
          label="Talles disponibles"
          helperText="Seleccioná los talles disponibles. Si no usa talle, dejalo vacío o usá Único."
          options={talleOptions}
          value={form.talles}
          onChange={(value) => updateField("talles", value)}
          placeholder="Seleccionar talle"
        />

        <CreatableTagSelector
          label="Medidas"
          helperText="Agregá medidas si el producto las necesita."
          options={medidaOptions}
          value={form.medidas}
          onChange={(value) => updateField("medidas", value)}
          placeholder="Seleccionar medida"
        />

        <CreatableTagSelector
          label="Características visibles"
          helperText="Estas características se mostrarán al comprador en la ficha del producto."
          options={caracteristicaOptions}
          value={form.caracteristicas}
          onChange={(value) => updateField("caracteristicas", value)}
          placeholder="Seleccionar característica"
        />

        <CreatableTagSelector
          label="Propiedades para filtros"
          helperText="Seleccioná propiedades existentes o agregá una nueva con +."
          options={propiedadOptions}
          value={form.propiedades}
          onChange={(value) => updateField("propiedades", value)}
          placeholder="Seleccionar propiedad"
          createValue={crearSlug}
        />

        <div className="contact-form__row">
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminEstadoStock">
              Estado de stock
            </label>
            <select
              className="contact-form__select"
              id="adminEstadoStock"
              name="estadoStock"
              value={form.estadoStock}
              onChange={(event) => updateField("estadoStock", event.target.value)}
              required
            >
              {estadosStock.map((estado) => (
                <option value={estado.id} key={estado.id}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminPrecio">
              Precio
            </label>
            <input
              className="contact-form__input"
              id="adminPrecio"
              name="precio"
              inputMode="numeric"
              value={form.precio}
              onChange={(event) => updateField("precio", event.target.value)}
              placeholder="Ej: 120000"
            />
            <p className="tag-selector__helper">
              Opcional. Se muestra como moneda paraguaya en el catalogo.
            </p>
          </div>
        </div>

        <div className="contact-form__group admin-images-field">
          <div className="admin-images-field__header">
            <div>
              <label className="contact-form__label">Imagenes del producto</label>
              <p className="tag-selector__helper">
                Pega enlaces directos o compartidos de Google Drive. La primera imagen queda como principal.
              </p>
            </div>
            <button className="footer__link" type="button" onClick={addImagen}>
              + Agregar imagen
            </button>
          </div>

          {form.imagenes.length > 0 ? (
            <div className="admin-images-field__list">
              {form.imagenes.map((imagen, index) => (
                <div className="admin-images-field__item" key={`imagen-${index}`}>
                  <input
                    className="contact-form__input"
                    aria-label={`Imagen ${index + 1}`}
                    value={imagen}
                    onChange={(event) => updateImagen(index, event.target.value)}
                    onBlur={(event) => updateImagen(index, normalizarImagenUrl(event.target.value))}
                    placeholder="https://drive.google.com/file/d/..."
                  />
                  <button
                    className="footer__link admin-link--danger"
                    type="button"
                    onClick={() => removeImagen(index)}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button className="footer__link" type="button" onClick={addImagen}>
              Cargar primera imagen
            </button>
          )}
        </div>

        <div className="admin-form__checks">
          <label className="catalog-filters__checkbox">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={(event) => updateField("activo", event.target.checked)}
            />{" "}
            Activo
          </label>
          <label className="catalog-filters__checkbox">
            <input
              type="checkbox"
              name="destacado"
              checked={form.destacado}
              onChange={(event) => updateField("destacado", event.target.checked)}
            />{" "}
            Destacado
          </label>
        </div>

        <div className="admin-actions">
          <button className="contact-form__submit" type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar producto"}
          </button>
          <button className="footer__link" type="button" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </button>
        </div>
      </fieldset>

      <ProductPreview product={previewProduct} coloresGlobales={coloresGlobales} />
    </form>
  );
}
