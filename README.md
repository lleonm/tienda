# Tienda Online - E-commerce

Proyecto de tienda online para venta de ropa y accesorios con sistema de gestión de inventario, facturación y panel administrativo.

## 🚀 Tecnologías

- **Frontend**: Next.js 15 + React 19
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Base de datos**: JSON Server (temporal)
- **Linting**: ESLint

## 📋 Características

- ✅ Panel de administración
- ✅ Gestión de usuarios (administradores y clientes)
- ✅ Control de inventario de productos
- ✅ Sistema de facturación
- ✅ Tienda en línea
- ✅ API REST con JSON Server

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Crear archivo de variables de entorno `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🚦 Ejecución

### Desarrollo

1. Iniciar JSON Server (API):
```bash
npm run json-server
```

2. En otra terminal, iniciar Next.js:
```bash
npm run dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001

### Producción

```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
tienda/
├── src/
│   ├── app/              # App Router de Next.js
│   │   ├── layout.tsx    # Layout principal
│   │   ├── page.tsx      # Página de inicio
│   │   └── globals.css   # Estilos globales
│   ├── components/       # Componentes reutilizables
│   ├── lib/             # Utilidades y funciones
│   │   └── api.ts       # Cliente API
│   └── types/           # Definiciones TypeScript
│       └── index.ts     # Tipos del proyecto
├── db.json              # Base de datos JSON Server
├── package.json         # Dependencias
├── tsconfig.json        # Configuración TypeScript
├── tailwind.config.ts   # Configuración Tailwind
└── next.config.ts       # Configuración Next.js
```

## 🗃️ Estructura de Datos (db.json)

### Users (Administradores)
- Gestión de usuarios con roles
- Autenticación básica

### Customers (Clientes)
- Información de clientes de la tienda
- Datos de contacto y dirección

### Products (Productos)
- Catálogo de productos
- Control de inventario (stock)
- Categorías: ropa y accesorios

### Orders (Órdenes)
- Registro de pedidos
- Estados: pending, completed, cancelled

### Invoices (Facturas)
- Facturación de órdenes
- Cálculo de impuestos
- Estados: pending, paid, cancelled

## 🔄 Próximos Pasos

1. Implementar panel de administración
2. Crear páginas de gestión de usuarios
3. Desarrollar sistema de autenticación
4. Implementar CRUD de productos
5. Crear interfaz de tienda online
6. Desarrollar sistema de órdenes
7. Implementar generación de facturas
8. Migrar a base de datos real

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run json-server` - Inicia JSON Server en puerto 3001

## 👥 Autores

Proyecto creado para gestión de tienda online.

## 📄 Licencia

Privado - Todos los derechos reservados
