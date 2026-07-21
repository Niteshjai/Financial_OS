import * as fs from 'fs';
import * as path from 'path';

const backendSrcDir = path.join(__dirname, 'src');

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      fixFile(fullPath);
    }
  }
}

function fixFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix request.body as any -> request.body as Record<string, any>
  content = content.replace(/request\.body as any/g, 'request.body as Record<string, any>');
  content = content.replace(/request\.query as any/g, 'request.query as Record<string, any>');
  content = content.replace(/request\.params as any/g, 'request.params as Record<string, any>');
  
  // Fix specific known cases
  content = content.replace(/\(regData as any\)\.aadhaarTemp/g, '(regData as Record<string, any>).aadhaarTemp');
  content = content.replace(/delete \(regData as any\)\.aadhaarTemp/g, 'delete (regData as Record<string, any>).aadhaarTemp');
  content = content.replace(/const error = err as any;/g, 'const error = err as Record<string, any>;');
  
  // Fix enums in services
  content = content.replace(/'WILL_CREATED' as any/g, "'WILL_CREATED' as 'WILL_CREATED'");
  content = content.replace(/'WILL_PDF_GENERATED' as any/g, "'WILL_PDF_GENERATED' as 'WILL_PDF_GENERATED'");
  content = content.replace(/'UNCLAIMED_SEARCH_COMPLETED' as any/g, "'UNCLAIMED_SEARCH_COMPLETED' as 'UNCLAIMED_SEARCH_COMPLETED'");
  content = content.replace(/'LOAN_ELIGIBILITY_ASSESSED' as any/g, "'LOAN_ELIGIBILITY_ASSESSED' as 'LOAN_ELIGIBILITY_ASSESSED'");
  content = content.replace(/'LAND_DATA_FETCHED' as any/g, "'LAND_DATA_FETCHED' as 'LAND_DATA_FETCHED'");
  content = content.replace(/'LAND_RECORD_VIEWED' as any/g, "'LAND_RECORD_VIEWED' as 'LAND_RECORD_VIEWED'");
  content = content.replace(/'INSURANCE_GAP_ANALYSED' as any/g, "'INSURANCE_GAP_ANALYSED' as 'INSURANCE_GAP_ANALYSED'");
  content = content.replace(/'AFFILIATE_CLICK' as any/g, "'AFFILIATE_CLICK' as 'AFFILIATE_CLICK'");
  content = content.replace(/\(request\.params as any\)/g, '(request.params as Record<string, any>)');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

walkDir(backendSrcDir);
