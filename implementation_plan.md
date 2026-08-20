# Mejora en Gestión de Proyectos

## Objetivo
1. Reflejar en las tarjetas de proyectos el costo total (suma del costo de todos los materiales asignados).
2. Facilitar la asignación de materiales desde la vista de proyectos, mostrando una lista completa de inventario con casillas de verificación (checkboxes) y selección de cantidad, para hacer cargas masivas de forma rápida y sencilla.

## Proposed Changes

### Backend (`proyectoController.ts`)
#### [MODIFY] [proyectoController.ts](file:///C:/Users/ReneVillegasCarre%C3%B1o/Proyectos/inventario-bodega-hiberus/src/controllers/proyectoController.ts)
- En `getProyectos`, modificar la consulta SQL para incluir un `SUM(p.precio_unitario * ap.cantidad)` uniéndose a `stock` y `productos`, de modo que devuelva un campo `costo_total`.

### Frontend
#### [MODIFY] [ProyectosList.jsx](file:///C:/Users/ReneVillegasCarre%C3%B1o/Proyectos/inventario-bodega-hiberus/frontend/src/components/Proyectos/ProyectosList.jsx)
- Mostrar el campo `costo_total` en la tarjeta de cada proyecto.
- Añadir un botón "Asignar Materiales Masivo" junto a "Ver Materiales" que abra un nuevo modal.

#### [NEW] [ProyectoBulkAsignarModal.jsx](file:///C:/Users/ReneVillegasCarre%C3%B1o/Proyectos/inventario-bodega-hiberus/frontend/src/components/Proyectos/ProyectoBulkAsignarModal.jsx)
- Modal que lista los materiales disponibles (agrupados o detallados).
- Cada fila tendrá un checkbox, el nombre del material, cantidad en stock, y un input `cantidad_a_asignar`.
- Al dar click en "Guardar", hará POST masivos al endpoint `/asignaciones/proyecto` por cada material seleccionado.

## Verification Plan
1. Crear un proyecto.
2. Abrir el modal de asignación masiva.
3. Marcar 3 productos diferentes con distintas cantidades.
4. Verificar que se descuentan del stock correctamente.
5. Verificar que la tarjeta del proyecto refleja la suma del costo monetario de todo lo asignado.
