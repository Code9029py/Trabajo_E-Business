import { useEffect, useMemo, useState } from "react";
import CatalogFilters from "../components/catalog/CatalogFilters";
import ProductGrid from "../components/catalog/ProductGrid";
import Select from "../components/common/Select";
import { ChevronDownIcon } from "../components/common/Icons";
import { ordenamientos } from "../data/filtros";
import { obtenerColores } from "../services/coloresService";
import { obtenerProductosActivos, refrescarProductos } from "../services/productosService";
import { filtrarProductos } from "../utils/filtrarProductos";
import { registrarError } from "../utils/logger";
import {
  obtenerColoresDisponibles,
  obtenerPropiedadesDisponibles,
  obtenerTallesDisponibles,
} from "../utils/opcionesCatalogo";

const filtrosIniciales = {
  busqueda: "",
  categoria: "",
  subcategoria: "",
  color: "",
  talle: "",
  propiedades: [],
  estadoStock: "",
  orden: "recomendado",
};

const FAVORITES_STORAGE_KEY = "vtech_favorites";

function leerFavoritosGuardados() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const guardados = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]");
    return Array.isArray(guardados) ? guardados.map(String) : [];
  } catch {
    return [];
  }
}

function guardarFavoritos(favoritos) {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritos));
  }
}

function ordenarConFavoritos(productos, favoritos) {
  const favoritosSet = new Set(favoritos.map(String));

  return [...productos].sort((a, b) => {
    const favoritoA = favoritosSet.has(String(a.id));
    const favoritoB = favoritosSet.has(String(b.id));

    if (favoritoA !== favoritoB) return favoritoA ? -1 : 1;
    if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
    return 0;
  });
}

export default function CatalogPage() {
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [liked, setLiked] = useState(() => leerFavoritosGuardados());
  const [coloresGlobales, setColoresGlobales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const cargarProductos = async ({ forzar = false } = {}) => {
    try {
      setLoading(true);
      setError("");
      const productosObtenidos = forzar
        ? (await refrescarProductos()).filter((producto) => producto.activo === true)
        : await obtenerProductosActivos();

      setProductos(productosObtenidos);
    } catch (loadError) {
      registrarError("Error al cargar productos del catálogo", loadError);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    guardarFavoritos(liked);
  }, [liked]);

  useEffect(() => {
    let activo = true;

    obtenerColores()
      .then((colores) => {
        if (activo) {
          setColoresGlobales(colores);
        }
      })
      .catch((loadError) => {
        registrarError("Error al cargar colores globales del catálogo", loadError);
      });

    return () => {
      activo = false;
    };
  }, []);

  const productosFiltrados = useMemo(
    () => ordenarConFavoritos(filtrarProductos(productos, filtros), liked),
    [productos, filtros, liked],
  );
  const opcionesFiltros = useMemo(
    () => ({
      colores: obtenerColoresDisponibles(productos, coloresGlobales),
      talles: obtenerTallesDisponibles(productos),
      propiedades: obtenerPropiedadesDisponibles(productos),
    }),
    [productos, coloresGlobales],
  );

  const updateFiltros = (changes) => {
    setFiltros((current) => ({ ...current, ...changes }));
  };

  const togglePropiedad = (propiedad) => {
    setFiltros((current) => ({
      ...current,
      propiedades: current.propiedades.includes(propiedad)
        ? current.propiedades.filter((item) => item !== propiedad)
        : [...current.propiedades, propiedad],
    }));
  };

  const toggleLike = (productId) => {
    const id = String(productId);
    setLiked((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  };

  return (
    <main className="page page--catalogo" id="page-catalogo">
      <div className="catalog-layout">
        <button
          className="contact-form__submit catalog-filter-toggle"
          type="button"
          onClick={() => setFiltersOpen(true)}
        >
          Filtros
        </button>
        <button
          className={`catalog-filter-backdrop${filtersOpen ? " catalog-filter-backdrop--open" : ""}`}
          type="button"
          aria-label="Cerrar filtros"
          onClick={() => setFiltersOpen(false)}
        />
        <CatalogFilters
          filtros={filtros}
          opciones={opcionesFiltros}
          onChange={updateFiltros}
          onTogglePropiedad={togglePropiedad}
          onReset={() => setFiltros(filtrosIniciales)}
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        <div className="catalog-main">
          <div className="catalog-header">
            <div>
              <h1 className="catalog-header__title">Indumentaria de Trabajo</h1>
              <p className="product-card__sub">
                {productosFiltrados.length} producto{productosFiltrados.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="catalog-header__sort">
              <button
                className="footer__link"
                type="button"
                onClick={() => cargarProductos({ forzar: true })}
                disabled={loading}
              >
                Actualizar catálogo
              </button>
              <label htmlFor="sortBy">Ordenar por:</label>
              <div className="catalog-header__select-wrapper">
                <Select
                  id="sortBy"
                  className="catalog-header__select"
                  options={ordenamientos}
                  value={filtros.orden}
                  onChange={(event) => updateFiltros({ orden: event.target.value })}
                />
                <ChevronDownIcon />
              </div>
            </div>
          </div>

          {loading && (
            <div className="catalog-load-state" role="status">
              <p>Cargando productos...</p>
            </div>
          )}
          {!loading && error && (
            <div className="catalog-load-state catalog-load-state--error" role="alert">
              <p>{error}</p>
              <button className="footer__link" type="button" onClick={() => cargarProductos()}>
                Reintentar
              </button>
            </div>
          )}
          {!loading && !error && productosFiltrados.length > 0 ? (
            <ProductGrid
              products={productosFiltrados}
              liked={liked}
              onToggleLike={toggleLike}
              coloresGlobales={coloresGlobales}
            />
          ) : null}
          {!loading && !error && productosFiltrados.length === 0 ? (
            <div className="catalog-empty-state">
              <p>No se encontraron productos con los filtros seleccionados.</p>
              <button className="footer__link" type="button" onClick={() => setFiltros(filtrosIniciales)}>
                Limpiar filtros
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
