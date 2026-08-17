const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(file => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.jsx')) results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

walk('C:/Users/ReneVillegasCarreño/Proyectos/inventario-bodega-hiberus/frontend/src', (err, files) => {
  if (err) throw err;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('alert(')) {
      if (!content.includes('import toast')) {
        content = "import toast from 'react-hot-toast';\n" + content;
      }
      
      content = content.replace(/alert\((.*?)\);/g, (match, msg) => {
        if (msg.toLowerCase().includes('correctamente') || msg.toLowerCase().includes('exito') || msg.toLowerCase().includes('exitosa')) {
          return `toast.success(${msg});`;
        } else {
          return `toast.error(${msg});`;
        }
      });
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Replaced alerts in ${file}`);
    }
  });
});
