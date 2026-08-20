import React, { useState, useEffect } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import api from '../../services/api';

const GanttPanel = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get('/proyectos/tareas');
        const dbTasks = response.data || [];
        
        // Transform for gantt-task-react
        const ganttTasks = [];
        
        // First, group by project to create "Project" parent tasks
        const projects = {};
        dbTasks.forEach(t => {
          if(!projects[t.proyecto_id]) {
            projects[t.proyecto_id] = {
              id: `Project-${t.proyecto_id}`,
              name: t.proyecto_nombre,
              start: new Date(t.fecha_inicio),
              end: new Date(t.fecha_fin),
              progress: 0, // will calculate
              type: 'project',
              hideChildren: false,
              displayOrder: Object.keys(projects).length + 1,
              tasksCount: 0,
              completedCount: 0,
              styles: { progressColor: '#4f46e5', progressSelectedColor: '#4338ca' }
            };
          } else {
            // expand bounds if needed
            const dStart = new Date(t.fecha_inicio);
            const dEnd = new Date(t.fecha_fin);
            if (dStart < projects[t.proyecto_id].start) projects[t.proyecto_id].start = dStart;
            if (dEnd > projects[t.proyecto_id].end) projects[t.proyecto_id].end = dEnd;
          }
          projects[t.proyecto_id].tasksCount += 1;
          if (t.estado === 'realizada') projects[t.proyecto_id].completedCount += 1;
        });

        // Calculate progress and add projects
        Object.values(projects).forEach(p => {
          p.progress = p.tasksCount > 0 ? (p.completedCount / p.tasksCount) * 100 : 0;
          ganttTasks.push(p);
        });

        // Add actual tasks
        dbTasks.forEach((t, idx) => {
          const isOverdue = t.estado !== 'realizada' && new Date(t.fecha_fin) < new Date();
          const progress = t.estado === 'realizada' ? 100 : (t.estado === 'en_curso' ? 50 : 0);
          
          ganttTasks.push({
            id: `Task-${t.id}`,
            name: t.nombre,
            start: new Date(t.fecha_inicio),
            end: new Date(t.fecha_fin),
            progress: progress,
            type: 'task',
            project: `Project-${t.proyecto_id}`,
            displayOrder: ganttTasks.length + 1,
            styles: { 
              progressColor: isOverdue ? '#ef4444' : '#10b981', 
              progressSelectedColor: isOverdue ? '#dc2626' : '#059669',
              backgroundColor: isOverdue ? '#fee2e2' : '#d1fae5'
            }
          });
        });

        if (ganttTasks.length === 0) {
           // Fallback task so Gantt doesn't crash on empty
           ganttTasks.push({
            id: 'Task-Empty',
            name: 'Sin tareas',
            start: new Date(),
            end: new Date(),
            progress: 0,
            type: 'task',
            displayOrder: 1,
            isDisabled: true
           });
        }

        setTasks(ganttTasks);
      } catch (error) {
        console.error('Error al cargar tareas para Gantt:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando gráfico de Gantt...</div>;
  }

  return (
    <div className="mt-8 card overflow-hidden">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Seguimiento de Proyectos (Gantt)</h3>
        <p className="text-sm text-gray-500">Visualización temporal de las tareas y avances.</p>
      </div>
      
      <div className="overflow-x-auto">
        {tasks.length > 1 || tasks[0]?.id !== 'Task-Empty' ? (
          <Gantt 
            tasks={tasks}
            viewMode={ViewMode.Week}
            listCellWidth={155}
            columnWidth={60}
            rowHeight={40}
            locale="es"
            fontFamily="inherit"
            fontSize="12px"
          />
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No hay tareas programadas para mostrar en el gráfico.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttPanel;
