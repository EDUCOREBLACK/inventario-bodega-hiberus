# Análisis y Mejoras del Sistema de Inventario

## Vulnerabilidades e Incongruencias Resueltas

1. **Duplicidad Masiva en Catálogos (Proveedores)**:
   - *Problema*: La tabla `proveedores` contenía 623 registros correspondientes a solo 11 proveedores reales (duplicidad del 5500%). Esto causaba lentitud en el frontend al renderizar los selectores y creaba incongruencias si se asignaban IDs repetidos.
   - *Solución*: Se eliminaron 612 registros huérfanos directamente en SQL dejando un catálogo saneado y único.

2. **Lógica Matemática del Metraje (`distribuirMetraje`)**:
   - *Problema*: El controlador de materiales tenía una función de prorrateo que dividía el metraje total entre las unidades. Esto generaba decimales impredecibles y no correspondía con la realidad (donde un producto tipo cable de 5m implica que cada unidad mide 5m).
   - *Solución*: Se eliminó la función matemática. Ahora el "metraje por unidad" se registra estrictamente como un entero y se asigna el valor exacto a cada unidad física del stock.

3. **Filtrado Excluyente en Proyectos (`getProyectoMateriales`)**:
   - *Problema*: Cuando se asignaba un producto sin número de serie a un proyecto, el inventario descontaba la cantidad del stock (estado "disponible") pero el proyecto no lo listaba. El query del backend exigía que el estado físico fuera "reservado", "instalado", etc.
   - *Solución*: Se modificó el query para mostrar todas las asignaciones vinculadas al proyecto, independientemente del estado actual del lote físico.

4. **Tablas Zombi o Sin Uso**:
   - Se detectó la existencia de tablas creadas manualmente (o desde iteraciones anteriores del desarrollo) que no tenían ningún uso real en la API: `alertas`, `auditoria`, `parametros`.
   - *Solución*: Estas tablas fueron eliminadas (`DROP TABLE`) de la base de datos para aligerar la estructura y prevenir confusiones arquitectónicas en el futuro. `lotes` también ha sido deprecada de uso en el backend.

## Mejoras Propuestas para el Modelo de Inventario (Roadmap)

- **Normalización de Asignaciones (Proyectos)**:
  - Actualmente, `asignarStockAProyecto` hace una sustracción directa en la tabla `stock` para productos sin número de serie, dejándolos en estado 'disponible'. Lo ideal sería que la asignación divida o cree un nuevo registro en `stock` con estado 'reservado', de modo que el inventario mantenga total trazabilidad de qué unidad específica está en cada lugar.
- **Auditoría Transaccional**:
  - Aunque existe una tabla `movimientos_detalle`, sugerimos implementar *triggers* a nivel de SQLite o Middleware en Node.js que impida borrar historial (Soft Delete para todo el sistema), dado que eliminar materiales actualmente invoca `ON DELETE CASCADE` y puede borrar la historia de transacciones.
- **Uso estricto de Transacciones (ACID)**:
  - Varios endpoints complejos usan `db.serialize` pero podrían ser refactorizados para usar promesas y transacciones estructuradas (BEGIN/COMMIT/ROLLBACK) a un nivel superior, previniendo cuelgues si Node se apaga repentinamente a mitad de una iteración masiva de stock.
