const fs = require('fs');

const path = './frontend/src/components/Proyectos/ProyectosList.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add import Plus
if (!content.includes('Plus')) {
  content = content.replace(/import {([^}]+)} from 'lucide-react';/, "import { $1, Plus } from 'lucide-react';");
}

// Add state for bulk assign modal
if (!content.includes('isBulkAssignOpen')) {
  content = content.replace('const [isDetailOpen, setIsDetailOpen] = useState(false);', "const [isDetailOpen, setIsDetailOpen] = useState(false);\n  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);");
}

// Add the bulk assign modal component to JSX
if (!content.includes('<ProyectoBulkAsignarModal')) {
  content = content.replace(/<ProyectoDetalleModal/g, `
      {isBulkAssignOpen && (
        <ProyectoBulkAsignarModal
          isOpen={isBulkAssignOpen}
          onClose={() => setIsBulkAssignOpen(false)}
          proyecto={selectedProyecto}
          onSaved={fetchProyectos}
        />
      )}
      <ProyectoDetalleModal`);
}

// Update the card rendering
const search = `                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Fechas:</span>
                  {proyecto.fecha_inicio} - {proyecto.fecha_fin}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedProyecto(proyecto); setIsDetailOpen(true); }}
                  className="btn-secondary flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" /> Ver materiales
                </button>`;

const replacement = `                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Costo total:</span>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(proyecto.costo_total || 0)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Fechas:</span>
                  {proyecto.fecha_inicio} - {proyecto.fecha_fin}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedProyecto(proyecto); setIsBulkAssignOpen(true); }}
                  className="btn-primary flex items-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" /> Asignar materiales
                </button>
                <button
                  onClick={() => { setSelectedProyecto(proyecto); setIsDetailOpen(true); }}
                  className="btn-secondary flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" /> Ver materiales
                </button>`;

content = content.replace(search, replacement);

// Import ProyectoBulkAsignarModal
if (!content.includes('ProyectoBulkAsignarModal')) {
    content = content.replace("import ProyectoFormModal from './ProyectoFormModal';", "import ProyectoFormModal from './ProyectoFormModal';\nimport ProyectoBulkAsignarModal from './ProyectoBulkAsignarModal';");
}

fs.writeFileSync(path, content, 'utf8');
