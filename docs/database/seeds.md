# Semillas Iniciales (Seeds) - VES Only

Este documento detalla los datos semilla que se cargan automáticamente la primera vez que se ejecuta la aplicación.

---

## 📋 Lista Completa de Semillas

### 1. Configuración (`configuracion`)

El sistema inicia con una configuración base minimalista en Bolívares.

| Clave | Valor default | Descripción |
|-------|---------------|-------------|
| `nombre_tienda` | `JAUV Studio` | Nombre en el ticket. |
| `telefono_tienda` | `` (vacío) | Teléfono en pie de ticket. |
| `direccion_tienda` | `Venezuela` | Dirección en pie de ticket. |
| `ticket_pie` | `Gracias por su compra!` | Mensaje final del ticket. |
| `impresora_ancho` | `80` | Ancho de papel: `'58'` o `'80'`. |

*Nota: La clave `tasa_del_dia` ha sido deprecada en favor de una gestión exclusiva en VES.*

---

### 2. Categorías (`categorias`)

```sql
INSERT OR IGNORE INTO categorias (nombre) VALUES
  ('Cuadernos'), ('Lapiceros'), ('Carpetas'), ('Papel'), ('Tintas'), ('Otros')
```

---

### 3. Insumos (`insumos`)

Los insumos ahora se inicializan con costos unitarios en Bolívares.

| nombre | tipo | stock_hojas | stock_minimo | costo_por_hoja (VES) |
|--------|------|-------------|--------------|-------------------|
| Papel Carta | carta | 500 | 50 | 7,20 | 
| Papel Oficio | oficio | 200 | 30 | 9,60 | 

---

### 4. Servicios (`servicios`)

Se cargan servicios con precios base fijos en Bolívares.

| Servicio | Precio (VES) | Insumo |
|----------|--------------|--------|
| Copia B/N Carta | 2,00 | Papel Carta |
| Copia Color Carta | 6,00 | Papel Carta |
| Impresión B/N Carta | 5,00 | Papel Carta |
| Impresión Color Carta | 10,00 | Papel Carta |
| Copia B/N Oficio | 3,00 | Papel Oficio |
| Copia Color Oficio | 8,00 | Papel Oficio |
| Impresión B/N Oficio | 7,00 | Papel Oficio |
| Impresión Color Oficio | 15,00 | Papel Oficio |

---

## 🛠️ Scripts Externos

Además de las semillas internas de `db.js`, el proyecto incluye scripts para repoblar el inventario con datos de prueba realistas:

*   **`scripts/seed_data.js`**: Genera 28 productos de papelería (cuadernos, lápices, etc.) con precios en Bolívares calculados a partir de una base de USD adaptada al sistema VES.
*   **`scripts/seed_inventory.sql`**: Versión SQL del script de datos de inventario.

Para ejecutar la semilla manual:
```bash
node scripts/seed_data.js
```
