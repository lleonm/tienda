const fs = require('fs');
const path = require('path');

// Leer db.json
const dbPath = path.join(__dirname, '..', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Productos actuales
const oldProducts = db.products || [];
const parentProducts = oldProducts.filter(p => p.isParent);
const variantProducts = oldProducts.filter(p => !p.isParent);

console.log(`\n📊 Estado actual:`);
console.log(`   - ${oldProducts.length} productos en total`);
console.log(`   - ${parentProducts.length} productos padre`);
console.log(`   - ${variantProducts.length} variantes`);

// Mapeo de valores de atributos para buscar IDs
const sizeValues = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const colorValues = ['Rojo', 'Azul', 'Verde', 'Negro', 'Blanco', 'Amarillo'];

// Función para obtener el attribute_value_id basado en el nombre del atributo y su valor
function getAttributeValueId(attributeName, value) {
  const attributeValue = db.productAttributeValues.find(
    av => {
      const attribute = db.productAttributes.find(a => a.id === av.attribute_id);
      return attribute && attribute.name === attributeName && av.value === value;
    }
  );
  return attributeValue ? attributeValue.id : null;
}

// Nuevas estructuras
const newProducts = [];
const newProductVariants = [];
const newVariantAttributeValues = [];

let productIdCounter = 1;
let variantIdCounter = 1;

// Migrar productos padre
console.log(`\n🔄 Migrando productos...`);

parentProducts.forEach(oldParent => {
  const newProduct = {
    id: productIdCounter++,
    name: oldParent.name,
    description: oldParent.description,
    catalogNodeId: oldParent.category || null,
    baseSku: oldParent.sku,
    createdAt: oldParent.createdAt || new Date().toISOString()
  };
  
  newProducts.push(newProduct);
  console.log(`   ✅ Producto creado: ${newProduct.name} (ID: ${newProduct.id})`);
  
  // Migrar variantes de este producto
  const variants = variantProducts.filter(v => v.parentId === oldParent.id);
  console.log(`      - Migrando ${variants.length} variantes...`);
  
  variants.forEach(oldVariant => {
    const newVariant = {
      id: variantIdCounter++,
      product_id: newProduct.id,
      sku: oldVariant.sku,
      price: oldVariant.price,
      stock: oldVariant.stock,
      active: oldVariant.isActive !== false,
      createdAt: oldVariant.createdAt || new Date().toISOString()
    };
    
    newProductVariants.push(newVariant);
    
    // Parsear variantValue para extraer los atributos
    // Formato esperado: "XS / Azul" o similar
    if (oldVariant.variantValue) {
      const parts = oldVariant.variantValue.split('/').map(p => p.trim());
      
      // Determinar qué tipo de atributos son basándose en variantType
      if (oldVariant.variantType === 'size_color' && parts.length === 2) {
        const [size, color] = parts;
        
        // Buscar IDs de los valores de atributos
        const sizeValueId = getAttributeValueId('Talla', size);
        const colorValueId = getAttributeValueId('Color', color);
        
        if (sizeValueId) {
          newVariantAttributeValues.push({
            variant_id: newVariant.id,
            attribute_value_id: sizeValueId
          });
        } else {
          console.warn(`      ⚠️  No se encontró valor de talla: ${size}`);
        }
        
        if (colorValueId) {
          newVariantAttributeValues.push({
            variant_id: newVariant.id,
            attribute_value_id: colorValueId
          });
        } else {
          console.warn(`      ⚠️  No se encontró valor de color: ${color}`);
        }
      }
    }
  });
});

// Guardar en db.json
db.products = newProducts;
db.productVariants = newProductVariants;
db.variantAttributeValues = newVariantAttributeValues;

// También actualizar archivos JSON individuales
fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'productVariants.json'),
  JSON.stringify(newProductVariants, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'variantAttributeValues.json'),
  JSON.stringify(newVariantAttributeValues, null, 2)
);

// Crear archivo de productos base
fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'products.json'),
  JSON.stringify(newProducts, null, 2)
);

// Guardar db.json actualizado
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`\n✅ Migración completada:`);
console.log(`   - ${newProducts.length} productos base creados`);
console.log(`   - ${newProductVariants.length} variantes de producto creadas`);
console.log(`   - ${newVariantAttributeValues.length} relaciones atributo-variante creadas`);
console.log(`\n📝 Archivos actualizados:`);
console.log(`   - db.json`);
console.log(`   - data/products.json`);
console.log(`   - data/productVariants.json`);
console.log(`   - data/variantAttributeValues.json`);
