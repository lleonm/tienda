const fs = require('fs');
const path = require('path');

// Leer todos los archivos JSON de la carpeta data/
const dataDir = path.join(__dirname, 'data');

const db = {
  users: JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8')),
  customers: JSON.parse(fs.readFileSync(path.join(dataDir, 'customers.json'), 'utf8')),
  products: JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf8')),
  productAttributes: JSON.parse(fs.readFileSync(path.join(dataDir, 'productAttributes.json'), 'utf8')),
  productAttributeValues: JSON.parse(fs.readFileSync(path.join(dataDir, 'productAttributeValues.json'), 'utf8')),
  productVariants: JSON.parse(fs.readFileSync(path.join(dataDir, 'productVariants.json'), 'utf8')),
  variantAttributeValues: JSON.parse(fs.readFileSync(path.join(dataDir, 'variantAttributeValues.json'), 'utf8')),
  variantConfigs: JSON.parse(fs.readFileSync(path.join(dataDir, 'variantConfigs.json'), 'utf8')),
  catalogNodes: JSON.parse(fs.readFileSync(path.join(dataDir, 'catalogNodes.json'), 'utf8')),
  orders: JSON.parse(fs.readFileSync(path.join(dataDir, 'orders.json'), 'utf8')),
  invoices: JSON.parse(fs.readFileSync(path.join(dataDir, 'invoices.json'), 'utf8')),
};

// Imprimir el JSON combinado
console.log(JSON.stringify(db, null, 2));
