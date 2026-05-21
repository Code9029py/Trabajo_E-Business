import { useEffect, useMemo, useState } from "react";
import AdminProductCard from "../components/admin/AdminProductCard";
import ConfirmDeleteDialog from "../components/admin/ConfirmDeleteDialog";
import DeleteProductDialog from "../components/admin/DeleteProductDialog";
import ProductForm from "../components/admin/ProductForm";
import { categorias, subcategorias } from "../data/categorias";
import {
  crearProducto,
  editarProducto,
  eliminarProductoDefinitivo,
  obtenerProductos,
  ocultarProducto,
  refrescarProductos,
  reactivarProducto,
} from "../services/productosService";
import { registrarError } from "../utils/logger";
import { normalizarTexto } from "../utils/normalizarTexto";

function obtenerLabel(lista, id) {
  return lista.find((item) => item.id === id)?.label || "";
}

export default function AdminProductsPage({ onLogout, onBack }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToHide, setProductToHide] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [panelMessage, setPanelMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionProduct, setActionProduct] = useState(null);

  const cargarProductos = async ({ forzar = false } = {}) => {
    try {
      setLoading(true);
      setError("");
      const productosObtenidos = forzar ? await refrescarProductos() : await obtenerProductos();
      setProductos(productosObtenidos);
    } catch (loadError) {
      registrarError("Error al cargar productos en administración", loadError);
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const productosFiltrados = useMemo(() => {
    const texto = normalizarTexto(busqueda);

    return productos.filter((producto) => {
      const coincideEstado =
        estado === "todos" ||
        (estado === "activos" && producto.activo) ||
        (estado === "ocultos" && !producto.activo);
      const campos = [
        producto.nombre,
        producto.categoria,
        obtenerLabel(categorias, producto.categoria),
        producto.subcategoria,
        obtenerLabel(subcategorias, producto.subcategoria),
        producto.tipo,
      ];
      const coincideBusqueda =
        !texto || campos.some((campo) => normalizarTexto(campo).includes(texto));

      return coincideEstado && coincideBusqueda;
    });
  }, [busqueda, estado, productos]);

  const closeForm = () => {
    setFormMode(null);
    setSelectedProduct(null);
  };

  const handleSave = async (productData) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setPanelMessage(null);

      if (formMode === "edit" && selectedProduct) {
        await editarProducto(selectedProduct.id, productData);
      } else {
        await crearProducto(productData);
      }

      closeForm();
      await cargarProductos();
      setPanelMessage({ type: "success", text: "Producto guardado correctamente." });
    } catch (saveError) {
      registrarError("Error al guardar producto", saveError);
      setPanelMessage({
        type: "error",
        text: "No se pudo guardar el producto. Intentá nuevamente.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHide = async () => {
    if (!productToHide || actionProduct) return;

    try {
      setPanelMessage(null);
      setActionProduct({ id: productToHide.id, type: "ocultar" });
      await ocultarProducto(productToHide.id);
      setProductToHide(null);
      await cargarProductos();
      setPanelMessage({ type: "success", text: "Producto ocultado correctamente." });
    } catch (hideError) {
      registrarError("Error al ocultar producto", hideError);
      setProductToHide(null);
      setPanelMessage({ type: "error", text: "No se pudo ocultar el producto." });
    } finally {
      setActionProduct(null);
    }
  };

  const handleReactivate = async (id) => {
    if (actionProduct) return;

    try {
      setPanelMessage(null);
      setActionProduct({ id, type: "reactivar" });
      await reactivarProducto(id);
      await cargarProductos();
      setPanelMessage({ type: "success", text: "Producto reactivado correctamente." });
    } catch (reactivateError) {
      registrarError("Error al reactivar producto", reactivateError);
      setPanelMessage({ type: "error", text: "No se pudo reactivar el producto." });
    } finally {
      setActionProduct(null);
    }
  };

  const handleEliminarDefinitivo = async () => {
    if (!productToDelete || actionProduct) return;

    if (productToDelete.activo) {
      setProductToDelete(null);
      setPanelMessage({
        type: "error",
        text: "Solo se pueden eliminar definitivamente productos ocultos.",
      });
      return;
    }

    try {
      setPanelMessage(null);
      setActionProduct({ id: productToDelete.id, type: "eliminar" });
      await eliminarProductoDefinitivo(productToDelete.id);
      setProductToDelete(null);
      await cargarProductos();
      setPanelMessage({ type: "success", text: "Producto eliminado definitivamente." });
    } catch (deleteError) {
      registrarError("Error al eliminar producto definitivamente", deleteError);
      setProductToDelete(null);
      setPanelMessage({
        type: "error",
        text: "No se pudo eliminar definitivamente el producto.",
      });
    } finally {
      setActionProduct(null);
    }
  };

  const isHidingSelectedProduct = Boolean(
    actionProduct &&
      productToHide &&
      actionProduct.id === productToHide.id &&
      actionProduct.type === "ocultar",
  );
  const isDeletingSelectedProduct = Boolean(
    actionProduct &&
      productToDelete &&
      actionProduct.id === productToDelete.id &&
      actionProduct.type === "eliminar",
  );

  return (
    <main className="page admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <h1 className="contact-hero__title">Administración de productos</h1>
            <p className="contact-hero__subtitle">Gestioná los productos visibles en el catálogo.</p>
          </div>
          <div className="admin-header__actions">
            <button className="footer__link" type="button" onClick={onBack}>
              Volver al sitio público
            </button>
            <button className="footer__link" type="button" onClick={onLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>

        {panelMessage && (
          <div
            className={`admin-feedback admin-feedback--${panelMessage.type}`}
            role={panelMessage.type === "error" ? "alert" : "status"}
          >
            <span>{panelMessage.text}</span>
            <button type="button" onClick={() => setPanelMessage(null)}>
              Cerrar
            </button>
          </div>
        )}

        {formMode ? (
          <section className="contact-form-wrapper admin-panel">
            <h2 className="contact-form__heading">
              {formMode === "edit" ? "Editar producto" : "Agregar producto"}
            </h2>
            <ProductForm
              product={selectedProduct}
              products={productos}
              onSubmit={handleSave}
              onCancel={closeForm}
              isSaving={isSaving}
            />
          </section>
        ) : (
          <section className="admin-panel">
            <div className="admin-toolbar">
              <button
                className="contact-form__submit admin-toolbar__button"
                type="button"
                onClick={() => setFormMode("create")}
              >
                Agregar producto
              </button>
              <button
                className="footer__link admin-toolbar__refresh"
                type="button"
                onClick={() => cargarProductos({ forzar: true })}
                disabled={loading}
              >
                Actualizar productos
              </button>
              <input
                className="contact-form__input"
                type="search"
                name="busquedaAdminProductos"
                value={busqueda}
                placeholder="Buscar por nombre, categoría o tipo"
                onChange={(event) => setBusqueda(event.target.value)}
              />
              <select
                className="contact-form__select admin-toolbar__select"
                name="estadoAdminProductos"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="activos">Activos</option>
                <option value="ocultos">Ocultos</option>
              </select>
            </div>

            {loading && (
              <div className="admin-load-state admin-load-state--center" role="status">
                <p>Cargando productos...</p>
              </div>
            )}
            {!loading && error && (
              <div className="admin-load-state" role="alert">
                <p className="product-card__sub">{error}</p>
                <button className="footer__link" type="button" onClick={cargarProductos}>
                  Reintentar
                </button>
              </div>
            )}
            {!loading && !error && productosFiltrados.length === 0 && (
              <p className="product-card__sub">No se encontraron productos con los filtros actuales.</p>
            )}
            {!loading && !error && productosFiltrados.length > 0 && (
              <div className="admin-product-list">
                {productosFiltrados.map((product) => (
                  <AdminProductCard
                    product={product}
                    onEdit={(producto) => {
                      setSelectedProduct(producto);
                      setFormMode("edit");
                    }}
                    onHide={setProductToHide}
                    onReactivate={handleReactivate}
                    onDeletePermanent={setProductToDelete}
                    actionType={actionProduct?.id === product.id ? actionProduct.type : ""}
                    key={product.id}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      <DeleteProductDialog
        product={productToHide}
        onCancel={() => setProductToHide(null)}
        onConfirm={handleHide}
        isConfirming={isHidingSelectedProduct}
      />
      <ConfirmDeleteDialog
        product={productToDelete}
        onCancel={() => setProductToDelete(null)}
        onConfirm={handleEliminarDefinitivo}
        isConfirming={isDeletingSelectedProduct}
      />
    </main>
  );
}
