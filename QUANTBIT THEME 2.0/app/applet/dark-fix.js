import fs from 'fs';

const files = [
  'src/components/Leaders.tsx',
  'src/components/Simulasi.tsx',
  'src/components/Markets.tsx',
  'src/components/Portfolio.tsx',
  'src/components/Sidebar.tsx',
  'src/components/Navbar.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      content = content.replace(/text-green-600/g, 'text-green-700');
      content = content.replace(/text-yellow-600/g, 'text-yellow-700');
      content = content.replace(/text-green-100/g, 'text-green-200'); 
      content = content.replace(/bg-green-100/g, 'bg-green-50'); 
      content = content.replace(/bg-yellow-100/g, 'bg-yellow-50'); 
      
      fs.writeFileSync(file, content);
  }
}
console.log("Done");
