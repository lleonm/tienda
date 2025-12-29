/**
 * Script para migrar clientes de estructura antigua (single address) a nueva (addresses array)
 * Ejecutar con: node scripts/migrate-customer-addresses.js
 */

const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Rutas de los archivos
const customersJsonPath = path.join(__dirname, '../data/customers.json');
const dbJsonPath = path.join(__dirname, '../data/db.json');

console.log('🔄 Iniciando migración de direcciones de clientes...\n');

// Función para migrar un cliente
function migrateCustomer(customer) {
  // Si ya tiene el campo addresses, no migrar
  if (customer.addresses && Array.isArray(customer.addresses)) {
    console.log(`✅ Cliente ${customer.id} (${customer.name}) ya está migrado`);
    return customer;
  }

  // Si no tiene dirección antigua, crear array vacío
  if (!customer.address) {
    console.log(`⚠️  Cliente ${customer.id} (${customer.name}) no tiene dirección`);
    return {
      ...customer,
      addresses: [],
      address: undefined // Eliminar campo antiguo
    };
  }

  // Migrar dirección única a array de direcciones
  const migratedAddress = {
    id: randomUUID(),
    label: 'Principal',
    provinciaCodigo: customer.address.provinciaCodigo || '',
    cantonCodigo: customer.address.cantonCodigo || '',
    distritoCodigo: customer.address.distritoCodigo || '',
    direccionExacta: customer.address.direccionExacta || '',
    codigoPostal: customer.address.codigoPostal || '',
    isDefault: true
  };

  console.log(`✅ Migrado cliente ${customer.id} (${customer.name}): address → addresses[0]`);

  return {
    ...customer,
    addresses: [migratedAddress],
    address: undefined // Eliminar campo antiguo
  };
}

// Migrar customers.json
try {
  if (fs.existsSync(customersJsonPath)) {
    console.log('📄 Migrando customers.json...');
    const customersData = JSON.parse(fs.readFileSync(customersJsonPath, 'utf8'));
    const migratedCustomers = customersData.map(migrateCustomer);
    
    // Crear backup
    const backupPath = customersJsonPath.replace('.json', '_backup_' + Date.now() + '.json');
    fs.writeFileSync(backupPath, JSON.stringify(customersData, null, 2));
    console.log(`💾 Backup creado: ${backupPath}`);
    
    // Guardar datos migrados
    fs.writeFileSync(customersJsonPath, JSON.stringify(migratedCustomers, null, 2));
    console.log(`✅ customers.json migrado exitosamente (${migratedCustomers.length} clientes)\n`);
  } else {
    console.log('⚠️  customers.json no encontrado\n');
  }
} catch (error) {
  console.error('❌ Error migrando customers.json:', error.message);
}

// Migrar db.json
try {
  if (fs.existsSync(dbJsonPath)) {
    console.log('📄 Migrando db.json...');
    const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    
    if (dbData.customers && Array.isArray(dbData.customers)) {
      const migratedCustomers = dbData.customers.map(migrateCustomer);
      
      // Crear backup
      const backupPath = dbJsonPath.replace('.json', '_backup_' + Date.now() + '.json');
      fs.writeFileSync(backupPath, JSON.stringify(dbData, null, 2));
      console.log(`💾 Backup creado: ${backupPath}`);
      
      // Actualizar solo customers en db.json
      dbData.customers = migratedCustomers;
      fs.writeFileSync(dbJsonPath, JSON.stringify(dbData, null, 2));
      console.log(`✅ db.json migrado exitosamente (${migratedCustomers.length} clientes)\n`);
    } else {
      console.log('⚠️  No se encontró el array de customers en db.json\n');
    }
  } else {
    console.log('⚠️  db.json no encontrado\n');
  }
} catch (error) {
  console.error('❌ Error migrando db.json:', error.message);
}

console.log('✨ Migración completada!\n');
console.log('📝 Notas:');
console.log('   - Los backups se guardaron con timestamp');
console.log('   - Los clientes sin dirección tienen addresses = []');
console.log('   - Los clientes con dirección antigua ahora tienen addresses[0] con isDefault=true');
console.log('   - El campo "address" antiguo fue eliminado');
