"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { variantConfigsAPI } from "@/lib/api";
import { VariantConfig } from "@/types";

export default function ConfigurationPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<VariantConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<VariantConfig | null>(null);
  const [editingValues, setEditingValues] = useState<string>("");
  
  const [formData, setFormData] = useState({
    type: "",
    label: "",
    hasGlobalValues: false,
    values: [] as string[],
  });

  useEffect(() => {
    const adminData = localStorage.getItem("adminUser");
    if (!adminData) {
      router.push("/admin/login");
      return;
    }
    loadConfigs();
  }, [router]);

  const loadConfigs = async () => {
    try {
      const data = await variantConfigsAPI.getAll();
      setConfigs(data);
    } catch (error) {
      console.error("Error al cargar configuraciones:", error);
      alert("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const configData = {
        ...formData,
        values: formData.hasGlobalValues 
          ? editingValues.split(',').map(v => v.trim()).filter(v => v !== '')
          : [],
        createdAt: editingConfig?.createdAt || new Date().toISOString(),
      };

      if (editingConfig) {
        await variantConfigsAPI.update(editingConfig.id, configData);
      } else {
        await variantConfigsAPI.create(configData);
      }

      setShowModal(false);
      setEditingConfig(null);
      resetForm();
      loadConfigs();
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      alert("Error al guardar configuración");
    }
  };

  const handleEdit = (config: VariantConfig) => {
    setEditingConfig(config);
    setFormData({
      type: config.type,
      label: config.label,
      hasGlobalValues: config.hasGlobalValues,
      values: config.values || [],
    });
    setEditingValues(config.values?.join(', ') || '');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar esta configuración de variante?")) return;

    try {
      await variantConfigsAPI.delete(id);
      loadConfigs();
    } catch (error) {
      console.error("Error al eliminar configuración:", error);
      alert("Error al eliminar configuración");
    }
  };

  const resetForm = () => {
    setFormData({
      type: "",
      label: "",
      hasGlobalValues: false,
      values: [],
    });
    setEditingValues("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConfig(null);
    resetForm();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-600">Gestiona las variantes de productos</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Volver al Dashboard
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + Nueva Variante
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Tipos de Variantes de Producto</h2>
            <p className="text-sm text-gray-600 mt-1">
              Define los tipos de variantes disponibles para tus productos
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {configs.map((config) => (
              <div key={config.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900">{config.label}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {config.type}
                      </span>
                      {config.hasGlobalValues ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Valores Globales
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Valores por Producto
                        </span>
                      )}
                    </div>
                    
                    {config.hasGlobalValues && config.values && config.values.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">Valores disponibles:</p>
                        <div className="flex flex-wrap gap-2">
                          {config.values.map((value, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full border border-gray-300"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!config.hasGlobalValues && (
                      <p className="mt-2 text-sm text-gray-600">
                        Los valores se asignan individualmente a cada producto
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(config)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-900 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {configs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No hay configuraciones de variantes. Crea una nueva para comenzar.
              </div>
            )}
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Información sobre Variantes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Valores Globales:</strong> Los valores están predefinidos (ej: Tallas S, M, L). Ideales para tallas, colores estándar.</li>
            <li>• <strong>Valores por Producto:</strong> Cada producto define sus propios valores (ej: Diseño 1, Diseño 2). Ideal para diseños únicos.</li>
          </ul>
        </div>
      </main>

      {/* Modal Crear/Editar Configuración */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">
              {editingConfig ? "Editar Variante" : "Nueva Variante"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo (ID interno)
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  required
                  placeholder="size, color, material, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa minúsculas y guiones bajos. Ejemplo: size, color, design
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etiqueta (Nombre visible)
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  required
                  placeholder="Talla, Color, Diseño, etc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.hasGlobalValues}
                    onChange={(e) => setFormData({ ...formData, hasGlobalValues: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Tiene valores predefinidos globales
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Si está marcado, todos los productos usarán los mismos valores. Si no, cada producto define sus propios valores.
                </p>
              </div>

              {formData.hasGlobalValues && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valores (separados por comas)
                  </label>
                  <textarea
                    value={editingValues}
                    onChange={(e) => setEditingValues(e.target.value)}
                    placeholder="XS, S, M, L, XL, XXL"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ejemplo: XS, S, M, L, XL o Rojo, Azul, Verde
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingConfig ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
