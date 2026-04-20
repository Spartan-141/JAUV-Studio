'use strict';
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const os = require('os');

async function seedDatabase() {
  // Use the same path as main app: %AppData%/jauv-studio-pos/jauv_pos.db
  const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'jauv-studio-pos', 'jauv_pos.db');

  console.log('Connecting to database at:', dbPath);

  let db;
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');

    // Factor de conversión ilustrativo (1 USD = 60 VES) para que los precios no sean 0
    const K = 60.0;

    const products = [
      // Cuadernos (id: 1)
      { nombre: 'Cuaderno 1 Materia Rayado', marca: 'Caribe', compra: 0.80 * K, venta: 1.50 * K, stock: 50, min: 10, cat: 1, desc: 'Cuaderno espiral 80 hojas' },
      { nombre: 'Cuaderno 1 Materia Cuadriculado', marca: 'Caribe', compra: 0.80 * K, venta: 1.50 * K, stock: 40, min: 10, cat: 1, desc: 'Cuaderno espiral 80 hojas cuadritos' },
      { nombre: 'Cuaderno 5 Materias', marca: 'Scribe', compra: 3.50 * K, venta: 6.00 * K, stock: 20, min: 5, cat: 1, desc: 'Cuaderno multitemas 200 hojas' },
      { nombre: 'Cuaderno de Dibujo Profesional', marca: 'Canson', compra: 4.00 * K, venta: 7.50 * K, stock: 15, min: 3, cat: 1, desc: 'Papel de alto gramaje para dibujo' },
      { nombre: 'Libreta de Notas pequeña', marca: 'Miquelrius', compra: 1.20 * K, venta: 2.50 * K, stock: 30, min: 5, cat: 1, desc: 'Libreta de bolsillo' },

      // Lapiceros/Escritura (id: 2)
      { nombre: 'Bolígrafo Cristal Azul', marca: 'BIC', compra: 0.15 * K, venta: 0.50 * K, stock: 100, min: 20, cat: 2, desc: 'Esfero clásico punta media' },
      { nombre: 'Bolígrafo Cristal Negro', marca: 'BIC', compra: 0.15 * K, venta: 0.50 * K, stock: 100, min: 20, cat: 2, desc: 'Esfero clásico punta media' },
      { nombre: 'Bolígrafo Cristal Rojo', marca: 'BIC', compra: 0.15 * K, venta: 0.50 * K, stock: 50, min: 10, cat: 2, desc: 'Esfero clásico punta media' },
      { nombre: 'Portaminas 0.5mm', marca: 'Pentel', compra: 1.50 * K, venta: 3.00 * K, stock: 25, min: 5, cat: 2, desc: 'Portaminas técnico' },
      { nombre: 'Minas 0.5mm HB', marca: 'PaperMate', compra: 0.50 * K, venta: 1.00 * K, stock: 40, min: 10, cat: 2, desc: 'Tubo de 12 minas' },
      { nombre: 'Resaltador Amarillo Neon', marca: 'Faber-Castell', compra: 0.40 * K, venta: 1.00 * K, stock: 60, min: 15, cat: 2, desc: 'Punta biselada' },
      { nombre: 'Marcador Permanente Negro', marca: 'Sharpie', compra: 0.70 * K, venta: 1.50 * K, stock: 80, min: 10, cat: 2, desc: 'Punta fina resistente al agua' },
      { nombre: 'Lápiz de Grafito Mongolo 2', marca: 'Eberhard Faber', compra: 0.10 * K, venta: 0.25 * K, stock: 200, min: 50, cat: 2, desc: 'Lápiz escolar amarillo' },

      // Carpetas/Archivadores (id: 3)
      { nombre: 'Carpeta de Fibra Marrón Carta', marca: 'Generic', compra: 0.20 * K, venta: 0.60 * K, stock: 150, min: 30, cat: 3, desc: 'Carpeta para documentos' },
      { nombre: 'Carpeta de Fibra Marrón Oficio', marca: 'Generic', compra: 0.25 * K, venta: 0.75 * K, stock: 100, min: 20, cat: 3, desc: 'Carpeta oficio' },
      { nombre: 'Archivador de Palanca Lomo Ancho', marca: 'Leitz', compra: 2.50 * K, venta: 4.50 * K, stock: 12, min: 3, cat: 3, desc: 'Archivador para oficina' },
      { nombre: 'Separadores de Colores 1-12', marca: 'Avery', compra: 0.80 * K, venta: 1.80 * K, stock: 20, min: 5, cat: 3, desc: 'Juego de separadores mensuales' },

      // Papelería (id: 4)
      { nombre: 'Resma Papel Bond Carta 500h', marca: 'HP', compra: 4.50 * K, venta: 7.50 * K, stock: 10, min: 3, cat: 4, desc: 'Papel para impresión 75g' },
      { nombre: 'Sobre Manila Carta (Unidad)', marca: 'Generic', compra: 0.05 * K, venta: 0.25 * K, stock: 200, min: 50, cat: 4, desc: 'Sobre para documentos carta' },
      { nombre: 'Cartulina de color (Pliego)', marca: 'Bristol', compra: 0.30 * K, venta: 0.80 * K, stock: 50, min: 10, cat: 4, desc: 'Cartulina 50x70cm' },
      { nombre: 'Papel Crepé (Varios colores)', marca: 'Artline', compra: 0.20 * K, venta: 0.60 * K, stock: 100, min: 10, cat: 4, desc: 'Papel para manualidades' },

      // Otros (id: 6)
      { nombre: 'Goma de borrar blanca', marca: 'Pelikan', compra: 0.15 * K, venta: 0.40 * K, stock: 100, min: 20, cat: 6, desc: 'Borrador suave' },
      { nombre: 'Sacapuntas Dual con depósito', marca: 'Maped', compra: 0.60 * K, venta: 1.50 * K, stock: 45, min: 10, cat: 6, desc: 'Saca puntas para dos tamaños' },
      { nombre: 'Regla de Acero 30cm', marca: 'Foska', compra: 1.20 * K, venta: 2.50 * K, stock: 20, min: 5, cat: 6, desc: 'Regla metálica graduada' },
      { nombre: 'Tijeras Escolares 5"', marca: 'Fiskars', compra: 1.50 * K, venta: 3.00 * K, stock: 15, min: 5, cat: 6, desc: 'Tijeras de seguridad punta roma' },
      { nombre: 'Pega en Barra 21g', marca: 'UHU', compra: 0.80 * K, venta: 1.80 * K, stock: 60, min: 12, cat: 6, desc: 'Adhesivo en barra' },
      { nombre: 'Cinta Adhesiva Transparente', marca: '3M', compra: 0.40 * K, venta: 1.00 * K, stock: 80, min: 15, cat: 6, desc: 'Cinta scotch estándar' },
      { nombre: 'Silicón Frío 100ml', marca: 'Elefante', compra: 0.90 * K, venta: 2.00 * K, stock: 25, min: 5, cat: 6, desc: 'Pegamento líquido para manualidades' }
    ];

    console.log('Cleaning existing products for a fresh seed...');
    await db.run('DELETE FROM productos');

    const insertSql = `
      INSERT INTO productos (
        codigo, nombre, marca, 
        precio_compra_usd, precio_venta_usd, 
        precio_compra_ves, precio_venta_ves,
        moneda_precio,
        stock_actual, stock_minimo, categoria_id, descripcion
      )
      VALUES (?, ?, ?, 0, 0, ?, ?, 'ves', ?, ?, ?, ?)
    `;

    function generateRandomCode(prefix = 'PROD') {
      return prefix + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    console.log('Seeding products with VES prices...');
    let count = 0;

    await db.run('BEGIN TRANSACTION');
    for (const p of products) {
      const code = generateRandomCode();
      await db.run(insertSql, [
        code, p.nombre, p.marca, 
        p.compra, p.venta, 
        p.stock, p.min, p.cat, p.desc
      ]);
      count++;
    }
    await db.run('COMMIT');

    console.log(`Successfully seeded ${count} products.`);
  } catch (err) {
    console.error('Error seeding data:', err);
    if (db) {
      try { await db.run('ROLLBACK'); } catch (_) { }
    }
  } finally {
    if (db) {
      await db.close();
    }
  }
}

seedDatabase();
