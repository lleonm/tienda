# Copilot Instructions - Tienda Online

## 📋 Arquitectura General

E-commerce para ropa/accesorios con panel administrativo. Stack: **Next.js 15 App Router + React 19 + TypeScript + Tailwind + JSON Server**.

### Flujo de Datos Crítico
```
data/*.json → scripts/build-db.js → db.json → JSON Server (puerto 3001) ← Next.js (puerto 3000)
```

**¡NUNCA modifiques `db.json` directamente!** Edita los archivos individuales en `data/` y ejecuta `npm run build-db`.

## 🚀 Comandos Esenciales (PowerShell)

```powershell
# Iniciar/detener entorno completo (OBLIGATORIO)
.\scripts\start-servers.ps1   # Inicia Next.js + JSON Server en ventanas separadas
.\scripts\stop-servers.ps1    # Limpia procesos y libera puertos

# Regenerar base de datos tras editar data/*.json
npm run build-db

# Desarrollo individual (solo si sabes lo que haces)
npm run dev           # Next.js en puerto 3000
npm run json-server   # JSON Server en puerto 3001
```

## 🏗️ Patrones Arquitectónicos Clave

### 1. Gestión de Estado en Cliente
**Todas las páginas admin son Client Components** (`'use client'`) porque:
- Usan hooks como `useState`, `useEffect`, `useRouter`
- Ejemplo: [`src/app/admin/customers/page.tsx`](src/app/admin/customers/page.tsx#L1-L10)

```tsx
'use client';
import { useState, useEffect } from 'react';
import { customersAPI } from '@/lib/api';
```

### 2. API Client Pattern (src/lib/api.ts)
Cliente unificado para JSON Server. **SIEMPRE usa las funciones exportadas, nunca fetch directo**:

```typescript
// ✅ CORRECTO
import { customersAPI } from '@/lib/api';
const customers = await customersAPI.getAll();

// ❌ INCORRECTO
fetch('http://localhost:3001/customers')
```

Ver [`src/lib/api.ts`](src/lib/api.ts) para APIs disponibles: `customersAPI`, `productsAPI`, `ordersAPI`, `invoicesAPI`, `variantConfigsAPI`, `catalogNodesAPI`.

### 3. Sistema de Notificaciones Modal
Componente [`src/components/Modal.tsx`](src/components/Modal.tsx) maneja 5 tipos: `success`, `error`, `warning`, `info`, `confirm`.

Patrón estándar:
```tsx
const [modal, setModal] = useState({
  isOpen: false, type: 'info', title: '', message: '', onConfirm: undefined
});

const showNotification = (type, title, message, onConfirm?) => {
  setModal({ isOpen: true, type, title, message, onConfirm });
};

// Confirmación de eliminación
showNotification('confirm', '¿Eliminar?', 'No se puede deshacer', async () => {
  await customersAPI.delete(id);
  showNotification('success', '¡Eliminado!', 'Operación exitosa');
});
```

**REGLA CRÍTICA**: Máximo 1 modal simultáneo. Para flujos complejos, usa páginas dedicadas:
- Formularios multi-paso: [`src/app/admin/customers/new/page.tsx`](src/app/admin/customers/new/page.tsx)
- Edición de entidades complejas: [`src/app/admin/products/[id]/edit/page.tsx`](src/app/admin/products/[id]/edit/page.tsx)

### 4. Navegación con Next.js Router
```tsx
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/admin/customers');  // Redirección programática
```

### 5. Estructura de Tipos (src/types/index.ts)

#### Tipos Costa Rica
- `Provincia`, `Canton`, `Distrito` con códigos oficiales
- `CustomerAddress`: Direcciones con geografía CR + campo `label` opcional ("Casa", "Oficina")

#### Productos Normalizados (Sistema EAV)
```typescript
Product → ProductVariant → VariantAttributeValue → ProductAttributeValue → ProductAttribute
```
- **`Product`**: Entidad base con `name`, `description`, `catalogNodeId`, `baseSku`
- **`ProductVariant`**: SKU individual con `price`, `stock`, `active`
- **`ProductAttribute`**: Atributos como "Color", "Talla" (ej: id=1: "Talla", id=2: "Color")
- **`ProductAttributeValue`**: Valores de atributos (ej: id=1: "XS", id=8: "Azul")
- **`VariantAttributeValue`**: Relación many-to-many variante ↔ valor de atributo

**Edición de variantes**: Use página dedicada [`[id]/edit/page.tsx`](src/app/admin/products/[id]/edit/page.tsx) para:
- Ver todas las variantes existentes con sus atributos
- Editar precio/stock/disponibilidad individualmente
- Agregar nuevas combinaciones de variantes

#### Clientes
```typescript
Customer {
  identificationType: 'fisica' | 'juridica' | 'dimex' | 'pasaporte'
  phones: string[]  // Array de teléfonos
  addresses: CustomerAddress[]  // Array de direcciones con UUIDs
  createdBy: 'frontend' | 'admin'
}
```

### 6. Datos de Prueba Protegidos
Archivos en `data/` contienen datos reales de Costa Rica (geografía) y ejemplos:
- `costa_rica_geografia.json`: 7 provincias, 82 cantones, 488 distritos
- `customers.json`: 20 clientes con direcciones reales
- `products.json`, `orders.json`, `invoices.json`

**PROTECCIÓN**: No eliminar/reemplazar estos datos a menos que el usuario lo pida **explícitamente**.

## 🎨 Convenciones de Código

### Estilo
- **Tailwind puro** (no CSS modules): `className="bg-blue-50 text-blue-700"`
- Emojis en títulos: `<h1>👥 Clientes</h1>`
- Español en UI: mensajes, placeholders, botones

### Nombrado
- Componentes: `PascalCase.tsx` → `CustomerCard.tsx`
- Utilidades: `camelCase.ts` → `formatPrice.ts`
- Páginas dinámicas: `[id]/edit/page.tsx`

### TypeScript
- Tipado estricto (`tsconfig.json` strict mode)
- Interfaces para entidades ([`src/types/index.ts`](src/types/index.ts))
- Tipos de retorno explícitos en funciones API

## 🔧 Debugging y Desarrollo

### Verificar Estado de Base de Datos
```powershell
# Ver contenido de una entidad
Get-Content .\data\customers.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### Errores Comunes
1. **Puerto en uso**: Ejecuta `.\scripts\stop-servers.ps1` antes de reiniciar
2. **db.json desactualizado**: Corre `npm run build-db` después de editar `data/*.json`
3. **404 en API**: Verifica que JSON Server esté corriendo (`http://localhost:3001`)

## 🚫 Restricciones Críticas

1. **NO hacer commits automáticos** - Solo cuando el usuario lo pida
2. **NO usar fetch directo** - Usar `src/lib/api.ts`
3. **NO modificar db.json** - Editar archivos en `data/`
4. **NO modales anidados** - Usar páginas dedicadas
5. **NO borrar datos de prueba** - Sin autorización explícita
6. **NO Server Components en admin** - Todas las páginas admin son Client Components

## 📚 Archivos de Referencia
Edición de productos/variantes**: [`src/app/admin/products/[id]/edit/page.tsx`](src/app/admin/products/[id]/edit/page.tsx)
- **
- **Tipos completos**: [`src/types/index.ts`](src/types/index.ts)
- **Cliente API**: [`src/lib/api.ts`](src/lib/api.ts)
- **Modal reutilizable**: [`src/components/Modal.tsx`](src/components/Modal.tsx)
- **CRUD completo**: [`src/app/admin/customers/page.tsx`](src/app/admin/customers/page.tsx)
- **Formulario complejo**: [`src/app/admin/customers/new/page.tsx`](src/app/admin/customers/new/page.tsx)
- **Layout admin**: [`src/app/admin/layout.tsx`](src/app/admin/layout.tsx)

---

**Para agregar reglas**: Edita este archivo y commitea los cambios.
