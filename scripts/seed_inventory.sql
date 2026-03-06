-- Seed inventory for JAUV Studio
-- Categories: 1:Cuadernos, 2:Lapiceros, 3:Carpetas, 4:Papel, 5:Tintas, 6:Otros

-- Cuadernos
INSERT OR IGNORE INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion) VALUES
('PAP-C1M-001', 'Cuaderno 1 Materia Rayado', 'Caribe', 0.80, 1.50, 50, 10, 1, 'Cuaderno espiral 80 hojas'),
('PAP-C1M-002', 'Cuaderno 1 Materia Cuadriculado', 'Caribe', 0.80, 1.50, 40, 10, 1, 'Cuaderno espiral 80 hojas cuadritos'),
('PAP-C5M-001', 'Cuaderno 5 Materias', 'Scribe', 3.50, 6.00, 20, 5, 1, 'Cuaderno multitemas 200 hojas'),
('PAP-CDB-001', 'Cuaderno de Dibujo Profesional', 'Canson', 4.00, 7.50, 15, 3, 1, 'Papel de alto gramaje para dibujo'),
('PAP-LNT-001', 'Libreta de Notas pequeña', 'Miquelrius', 1.20, 2.50, 30, 5, 1, 'Libreta de bolsillo');

-- Lapiceros/Escritura
INSERT OR IGNORE INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion) VALUES
('PAP-BOL-001', 'Bolígrafo Cristal Azul', 'BIC', 0.15, 0.50, 100, 20, 2, 'Esfero clásico punta media'),
('PAP-BOL-002', 'Bolígrafo Cristal Negro', 'BIC', 0.15, 0.50, 100, 20, 2, 'Esfero clásico punta media'),
('PAP-BOL-003', 'Bolígrafo Cristal Rojo', 'BIC', 0.15, 0.50, 50, 10, 2, 'Esfero clásico punta media'),
('PAP-PMI-001', 'Portaminas 0.5mm', 'Pentel', 1.50, 3.00, 25, 5, 2, 'Portaminas técnico'),
('PAP-MIN-001', 'Minas 0.5mm HB', 'PaperMate', 0.50, 1.00, 40, 10, 2, 'Tubo de 12 minas'),
('PAP-RES-001', 'Resaltador Amarillo Neon', 'Faber-Castell', 0.40, 1.00, 60, 15, 2, 'Punta biselada'),
('PAP-MAR-001', 'Marcador Permanente Negro', 'Sharpie', 0.70, 1.50, 80, 10, 2, 'Punta fina resistente al agua'),
('PAP-LAP-001', 'Lápiz de Grafito Mongolo 2', 'Eberhard Faber', 0.10, 0.25, 200, 50, 2, 'Lápiz escolar amarillo');

-- Carpetas
INSERT OR IGNORE INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion) VALUES
('PAP-CAR-001', 'Carpeta de Fibra Marrón Carta', 'Generic', 0.20, 0.60, 150, 30, 3, 'Carpeta para documentos'),
('PAP-CAR-002', 'Carpeta de Fibra Marrón Oficio', 'Generic', 0.25, 0.75, 100, 20, 3, 'Carpeta oficio'),
('PAP-ARC-001', 'Archivador de Palanca Lomo Ancho', 'Leitz', 2.50, 4.50, 12, 3, 3, 'Archivador para oficina'),
('PAP-SEP-001', 'Separadores de Colores 1-12', 'Avery', 0.80, 1.80, 20, 5, 3, 'Juego de separadores mensuales');

-- Papelería
INSERT OR IGNORE INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion) VALUES
('PAP-RES-002', 'Resma Papel Bond Carta 500h', 'HP', 4.50, 7.50, 10, 3, 4, 'Papel para impresión 75g'),
('PAP-SOB-001', 'Sobre Manila Carta (Unidad)', 'Generic', 0.05, 0.25, 200, 50, 4, 'Sobre para documentos carta'),
('PAP-CAR-003', 'Cartulina de color (Pliego)', 'Bristol', 0.30, 0.80, 50, 10, 4, 'Cartulina 50x70cm'),
('PAP-CRE-001', 'Papel Crepé (Varios colores)', 'Artline', 0.20, 0.60, 100, 10, 4, 'Papel para manualidades');

-- Otros
INSERT OR IGNORE INTO productos (codigo, nombre, marca, precio_compra_usd, precio_venta_usd, stock_actual, stock_minimo, categoria_id, descripcion) VALUES
('PAP-BOR-001', 'Goma de borrar blanca', 'Pelikan', 0.15, 0.40, 100, 20, 6, 'Borrador suave'),
('PAP-SAC-001', 'Sacapuntas Dual con depósito', 'Maped', 0.60, 1.50, 45, 10, 6, 'Saca puntas para dos tamaños'),
('PAP-REG-001', 'Regla de Acero 30cm', 'Foska', 1.20, 2.50, 20, 5, 6, 'Regla metálica graduada'),
('PAP-TIJ-001', 'Tijeras Escolares 5"', 'Fiskars', 1.50, 3.00, 15, 5, 6, 'Tijeras de seguridad punta roma'),
('PAP-PEG-001', 'Pega en Barra 21g', 'UHU', 0.80, 1.80, 60, 12, 6, 'Adhesivo en barra'),
('PAP-CIN-001', 'Cinta Adhesiva Transparente', '3M', 0.40, 1.00, 80, 15, 6, 'Cinta scotch estándar'),
('PAP-SIL-001', 'Silicón Frío 100ml', 'Elefante', 0.90, 2.00, 25, 5, 6, 'Pegamento líquido para manualidades');
