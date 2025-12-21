# Copilot Instructions - Tienda de Productos

## Proyecto Overview
- **Tipo**: E-commerce Store (Ropa y Accesorios)
- **Framework**: Next.js 15 con React 19
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos temporal**: JSON Server
- **Características principales**: 
  - Manejo de inventario
  - Facturación
  - Venta en línea
  - Panel de administración
  - Gestión de usuarios (administradores y clientes)

## Progress Checklist

- [x] Crear archivo copilot-instructions.md
- [x] Scaffold del proyecto Next.js
- [x] Personalizar estructura del proyecto
- [x] Instalar extensiones requeridas
- [x] Compilar proyecto
- [x] Crear y ejecutar tarea
- [x] Documentación completa

## Desarrollo Completado

### Paso 1: Crear copilot-instructions.md ✓
Archivo de instrucciones creado exitosamente.

### Paso 2: Scaffold del proyecto Next.js ✓
Proyecto Next.js creado con:
- TypeScript
- Tailwind CSS
- ESLint
- App Router
- Estructura src/

### Paso 3: Personalizar estructura del proyecto ✓
- Creados tipos TypeScript para todas las entidades
- Configurado cliente API para JSON Server
- Estructura de carpetas organizada
- Base de datos inicial con datos de ejemplo

### Paso 4: Instalar dependencias ✓
Todas las dependencias instaladas exitosamente (386 paquetes).

### Paso 5: Compilar proyecto ✓
Proyecto compilado sin errores.

### Paso 6: Documentación completa ✓
README.md actualizado con instrucciones completas.

## Estructura de Archivos Creados

```
tienda/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── api.ts
│   └── types/
│       └── index.ts
├── .github/
│   └── copilot-instructions.md
├── db.json
├── .env.local
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── postcss.config.mjs
├── .eslintrc.json
├── .gitignore
└── README.md
```

## Reglas de Desarrollo

### Convenciones de Código
- Usar TypeScript estricto en todo el proyecto
- Nombrar componentes con PascalCase: `UserCard.tsx`
- Nombrar archivos de utilidades con camelCase: `formatPrice.ts`
- Usar Tailwind CSS para todos los estilos, evitar CSS modules
- Preferir Server Components de React cuando sea posible
- Usar "use client" solo cuando sea necesario (interactividad del cliente)

### Estructura de Archivos
- Componentes reutilizables en `src/components/`
- Páginas en `src/app/` siguiendo App Router de Next.js
- Tipos compartidos en `src/types/`
- Funciones de utilidad en `src/lib/`
- Hooks personalizados en `src/hooks/`

### API y Datos
- Usar el cliente API de `src/lib/api.ts` para todas las llamadas
- Todas las llamadas a API deben tener manejo de errores
- Usar tipos TypeScript para todas las respuestas de API
- JSON Server corre en puerto 3001, Next.js en puerto 3000
- Las entidades de JSON Server deben crearse en archivos JSON independientes con el nombre de cada entidad (ej: `users.json`, `products.json`)

### Autenticación y Seguridad
- No almacenar contraseñas en texto plano (implementar hashing más adelante)
- Validar todos los inputs del usuario
- Implementar autorización por roles (admin vs customer)

### UI/UX
- Diseño responsive mobile-first
- Mensajes de error claros y en español
- Loading states para todas las operaciones async
- Confirmaciones antes de acciones destructivas (eliminar, cancelar)

### Git y Versionado
- Commits en español con mensajes descriptivos
- Branches: `main` para producción, `develop` para desarrollo
- Features en branches separadas: `feature/nombre-feature`

### Testing (Futuro)
- Implementar tests unitarios con Jest
- Tests de integración para flujos críticos
- Tests E2E para el proceso completo de compra

---

## Próximos Pasos Recomendados

1. Implementar sistema de autenticación
2. Crear páginas del panel de administración
3. Desarrollar CRUD de productos
4. Crear interfaz de la tienda online
5. Implementar carrito de compras
6. Sistema de órdenes y facturación

---

## Notas Adicionales

**Para agregar nuevas reglas:** 
Edita este archivo directamente en la sección "Reglas de Desarrollo" y yo las tendré presentes en todas nuestras interacciones.
