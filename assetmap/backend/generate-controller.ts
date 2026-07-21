import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, 'src', 'routes', 'auth.ts');
let content = fs.readFileSync(authFile, 'utf8');

const controllerContent = content
  .replace(/fastify\.(get|post|delete|patch|put)\('([^']+)',\s*(?:\{[^}]+\},\s*)?async \((request, reply)\) => \{/g, 
  (match, method, route, args) => {
    // Generate a function name based on route
    const funcName = route.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') + '_handler';
    return `export const ${funcName} = async (${args}) => {`;
  })
  .replace(/const authRoutes: FastifyPluginAsync = async \(fastify, opts\) => \{/, '')
  .replace(/\}\);\n\nexport default authRoutes;/g, '');

fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'auth.controller.ts'), controllerContent);
