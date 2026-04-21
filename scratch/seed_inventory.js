
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');

// Path to the database based on the logs provided
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'jauv-studio-pos', 'jauv_pos.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the database.');
});

const categories = [1, 2, 3, 4, 5, 6]; // Default category IDs from db.js seeding
const productsToInsert = 100;

const adjectives = ['Elegante', 'Premium', 'Económico', 'Pro', 'Escolar', 'Oficina', 'Resistente', 'Lujo', 'Básico', 'Colorido'];
const types = ['Cuaderno', 'Bolígrafo', 'Marcador', 'Carpeta', 'Resaltador', 'Sacapuntas', 'Borrador', 'Regla', 'Lápiz', 'Compás'];

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

db.serialize(() => {
    const stmt = db.prepare(`
        INSERT INTO productos (
            codigo, nombre, marca, 
            precio_compra_ves, precio_venta_ves, 
            stock_actual, stock_minimo, categoria_id, descripcion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= productsToInsert; i++) {
        const codigo = `SEED-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${i}`;
        const nombre = `${getRandomItem(types)} ${getRandomItem(adjectives)} #${i}`;
        const marca = getRandomItem(['Generic', 'Faber-Castell', 'BIC', 'Norma', 'Scribe', '3M']);
        const precioCompra = parseFloat((Math.random() * 50 + 5).toFixed(2));
        const precioVenta = parseFloat((precioCompra * 1.5).toFixed(2)); // 50% markup
        const stockActual = Math.floor(Math.random() * 200);
        const stockMinimo = 10;
        const categoriaId = getRandomItem(categories);
        const descripcion = `Producto generado por seed para pruebas de paginación.`;

        stmt.run(codigo, nombre, marca, precioCompra, precioVenta, stockActual, stockMinimo, categoriaId, descripcion);
    }

    stmt.finalize();
    console.log(`Successfully seeded ${productsToInsert} products.`);
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Database connection closed.');
});
