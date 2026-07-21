import * as fs from 'fs';
import * as path from 'path';

const filesToRevert = [
  'src/routes/loan.ts',
  'src/routes/unclaimed.ts',
  'src/routes/will.ts'
];

for (const file of filesToRevert) {
  const fullPath = path.join(__dirname, file);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/request\.body as Record<string, any>/g, 'request.body as any');
  content = content.replace(/request\.query as Record<string, any>/g, 'request.query as any');
  content = content.replace(/request\.params as Record<string, any>/g, 'request.params as any');
  fs.writeFileSync(fullPath, content, 'utf8');
}
